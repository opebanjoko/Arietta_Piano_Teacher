import { yin, mpm, rms, midiToFreq } from './lib/pitch.js';
import { NoteTracker } from './lib/tracker.js';
import { processBuffer, renderPerformance } from './lib/pipeline.js';
import { score } from './lib/score.js';
import { noteNameToMidi, midiToNoteName, scoreClips } from './lib/corpus.js';
import { whiteNoise, mix } from './lib/signals.js';

const $ = (id) => document.getElementById(id);
const DETECTORS = { yin, mpm };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- tabs ----------
for (const btn of document.querySelectorAll('nav button')) {
  btn.onclick = () => {
    document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('main section').forEach((s) => s.classList.toggle('active', s.id === `tab-${btn.dataset.tab}`));
  };
}

// ---------- live pipeline ----------
let ctx = null;
let stream = null;
let tracker = null;
let sessionStartMs = null;
let eventCount = 0;
const computeTimes = [];
let recording = null; // { chunks: [], want: samples, isFirst: bool }
let latencyProbe = null; // { scheduledMs, resolve }

function status(msg) {
  $('status').textContent = msg;
}

function makeTracker() {
  tracker = new NoteTracker({ minClarity: Number($('clarity').value) });
}
$('clarity').oninput = () => {
  $('clarityVal').textContent = Number($('clarity').value).toFixed(2);
  makeTracker();
};

async function startMic() {
  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      autoGainControl: false,
      noiseSuppression: $('noiseSuppression').checked,
      channelCount: 1,
    },
  });
  ctx = new AudioContext();
  await ctx.audioWorklet.addModule('./worklet.js');
  const src = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'capture');
  src.connect(node);
  node.connect(ctx.destination); // outputs silence; keeps the graph pulled
  node.port.onmessage = (m) => onFrame(m.data);
  const track = stream.getAudioTracks()[0];
  const s = track.getSettings();
  $('stRate').textContent = `${ctx.sampleRate} Hz`;
  status(`mic on — echoCancellation:${s.echoCancellation} autoGain:${s.autoGainControl} noiseSuppression:${s.noiseSuppression}`);
  sessionStartMs = null;
  eventCount = 0;
  computeTimes.length = 0;
  makeTracker();
  $('micBtn').textContent = 'Stop listening';
  setPill('listening', 'Listening…');
}

function stopMic() {
  stream?.getTracks().forEach((t) => t.stop());
  ctx?.close();
  ctx = null;
  stream = null;
  $('micBtn').textContent = 'Start listening';
  setPill('', 'Mic off');
  status('');
}

$('micBtn').onclick = () => (ctx ? stopMic() : startMic().catch((e) => status(`mic failed: ${e.message}`)));

function setPill(cls, text) {
  $('pill').className = `pill ${cls}`;
  $('pillText').textContent = text;
}

function fmtClock(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function onFrame({ frame, tMs }) {
  if (sessionStartMs === null) sessionStartMs = tMs;
  if (recording) captureForRecording(frame);

  const detect = DETECTORS[$('detector').value];
  const t0 = performance.now();
  const det = detect(frame, ctx.sampleRate);
  computeTimes.push(performance.now() - t0);
  if (computeTimes.length > 500) computeTimes.shift();

  const event = tracker.feed(det, rms(frame), tMs);

  // UI
  if (det && det.clarity >= tracker.minClarity) {
    $('stFreq').textContent = det.freq.toFixed(1);
    $('stClarity').textContent = det.clarity.toFixed(2);
  } else {
    $('stFreq').textContent = '—';
    $('stClarity').textContent = det ? det.clarity.toFixed(2) : '—';
  }
  const sorted = [...computeTimes].sort((a, b) => a - b);
  const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
  $('stCompute').textContent = `${mean.toFixed(2)} · ${sorted[Math.floor(sorted.length * 0.95)].toFixed(2)}`;
  $('stSession').textContent = fmtClock(tMs - sessionStartMs);

  if (event) {
    eventCount++;
    $('stEvents').textContent = eventCount;
    const name = midiToNoteName(event.pitch);
    $('heardNote').textContent = name;
    setPill('heard', `Heard ${name}`);
    logEvent(`${fmtClock(event.timestamp - sessionStartMs)}  ${name.padEnd(4)} midi ${event.pitch}  conf ${event.confidence.toFixed(2)}`);
    flash();
    if (latencyProbe) {
      latencyProbe.resolve(event.timestamp - latencyProbe.scheduledMs);
      latencyProbe = null;
    }
  } else if (!det || det.clarity < tracker.minClarity) {
    setPill('listening', 'Listening…');
  }

  if ($('noiseSoak').checked) {
    const minutes = (tMs - sessionStartMs) / 60000;
    $('stFalse').textContent = minutes > 0.1 ? ((eventCount / minutes) * 10).toFixed(2) : '—';
  }
}

function logEvent(line) {
  const log = $('eventLog');
  log.textContent = `${line}\n${log.textContent}`.split('\n').slice(0, 60).join('\n');
}

let flashTimer = null;
function flash() {
  $('flash').classList.add('on');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => $('flash').classList.remove('on'), 120);
}

// ---------- synthetic corpus suite ----------
const WALK = [48, 52, 55, 60, 64, 67, 72, 76, 79, 84].map((midi, i) => ({ midi, atMs: 300 + i * 600, durMs: 450 }));

const SUITES = [
  { name: 'clean C3–C6 walk', build: (sr) => renderPerformance(WALK, sr) },
  { name: 'quiet walk (amp 0.08)', build: (sr) => renderPerformance(WALK.map((n) => ({ ...n, amp: 0.08 })), sr) },
  {
    name: 'walk over noise bed',
    build: (sr) => {
      const { samples, truth } = renderPerformance(WALK, sr);
      return { samples: mix(samples, whiteNoise(samples.length, 0.02, 7)), truth };
    },
  },
  {
    name: 'repeated C4 strikes ×5',
    build: (sr) => renderPerformance(Array.from({ length: 5 }, (_, i) => ({ midi: 60, atMs: 300 + i * 600, durMs: 400 })), sr),
  },
  { name: '60 s noise only', build: (sr) => ({ samples: whiteNoise(sr * 60, 0.05, 42), truth: [] }) },
];

$('synthBtn').onclick = async () => {
  const sr = 44100;
  const rows = [];
  for (const suite of SUITES) {
    for (const detector of ['yin', 'mpm']) {
      status(`running: ${suite.name} (${detector})…`);
      await sleep(0);
      const { samples, truth } = suite.build(sr);
      const t0 = performance.now();
      const { events, durationMs } = processBuffer(samples, sr, { detector });
      const wall = performance.now() - t0;
      const r = score(events, truth, { durationMs });
      rows.push({
        suite: suite.name,
        detector,
        detected: `${r.detected}/${r.total}`,
        falsePer10Min: r.falsePer10Min.toFixed(2),
        latencyMax: r.latency.max === null ? '—' : `${r.latency.max.toFixed(0)} ms`,
        xRealtime: (durationMs / wall).toFixed(0) + '×',
        pass: r.pass,
      });
    }
  }
  status('');
  $('synthResults').innerHTML = table(rows, ['suite', 'detector', 'detected', 'falsePer10Min', 'latencyMax', 'xRealtime', 'pass']);
};

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function table(rows, cols) {
  const head = cols.map((c) => `<th>${esc(c)}</th>`).join('');
  const body = rows
    .map((r) => `<tr>${cols.map((c) => (c === 'pass' ? `<td class="${r.pass ? 'pass' : 'fail'}">${r.pass ? 'PASS' : 'FAIL'}</td>` : `<td>${esc(r[c])}</td>`)).join('')}</tr>`)
    .join('');
  return `<table><tr>${head}</tr>${body}</table>`;
}

// ---------- recorded corpus scoring ----------
let lastReport = null;

$('corpusFiles').onchange = () => ($('corpusBtn').disabled = $('corpusFiles').files.length === 0);

function labelFromFilename(name) {
  const parts = name.replace(/\.[^.]+$/, '').split(/[-_ ]/);
  if (parts.some((p) => p.toLowerCase() === 'noise')) return { expectedMidi: null };
  for (const p of parts) {
    const midi = noteNameToMidi(p);
    if (midi !== null) return { expectedMidi: midi };
  }
  return null;
}

$('corpusBtn').onclick = async () => {
  const detector = $('corpusDetector').value;
  const decoder = new AudioContext();
  const clips = [];
  const rows = [];
  for (const file of $('corpusFiles').files) {
    const label = labelFromFilename(file.name);
    if (!label) {
      rows.push({ clip: file.name, expected: 'UNLABELED — skipped', events: '—', verdict: '—', pass: false });
      continue;
    }
    status(`decoding ${file.name}…`);
    const buf = await decoder.decodeAudioData(await file.arrayBuffer());
    const { events, durationMs } = processBuffer(buf.getChannelData(0), buf.sampleRate, { detector });
    const clip = { name: file.name, expectedMidi: label.expectedMidi, durationMs, events };
    clips.push(clip);
    const heard = events.map((e) => midiToNoteName(e.pitch)).join(' ') || '(none)';
    const ok =
      label.expectedMidi === null ? events.length === 0 : events.length === 1 && events[0].pitch === label.expectedMidi;
    rows.push({
      clip: file.name,
      expected: label.expectedMidi === null ? 'silence' : midiToNoteName(label.expectedMidi),
      events: heard,
      verdict: ok ? 'clean' : 'check',
      pass: ok,
    });
  }
  decoder.close();
  status('');
  const agg = scoreClips(clips);
  lastReport = { detector, when: new Date().toISOString(), aggregate: agg, clips: rows };
  $('corpusResults').innerHTML =
    `<p>Detection <b>${(agg.detectionRate * 100).toFixed(1)}%</b> (${agg.detected}/${agg.noteClips}) · ` +
    `false events <b>${agg.falsePer10Min.toFixed(2)}</b>/10 min · gate <span class="${agg.pass ? 'pass' : 'fail'}">${agg.pass ? 'PASS' : 'FAIL'}</span></p>` +
    table(rows, ['clip', 'expected', 'events', 'verdict', 'pass']);
  $('reportBtn').style.display = 'inline-block';
};

$('reportBtn').onclick = () => {
  const blob = new Blob([JSON.stringify(lastReport, null, 2)], { type: 'application/json' });
  download(blob, `corpus-report-${$('corpusDetector').value}.json`);
};

// ---------- corpus recorder ----------
function captureForRecording(frame) {
  // Frames overlap by half; append only the new hop except for the first frame.
  recording.chunks.push(recording.isFirst ? frame.slice() : frame.slice(frame.length / 2));
  recording.isFirst = false;
  const got = recording.chunks.reduce((s, c) => s + c.length, 0);
  $('recStatus').textContent = `recording… ${(got / ctx.sampleRate).toFixed(1)} s`;
  if (got >= recording.want) finishRecording();
}

$('recBtn').onclick = async () => {
  if (recording) return finishRecording();
  if (!ctx) await startMic().catch((e) => status(`mic failed: ${e.message}`));
  if (!ctx) return;
  recording = { chunks: [], want: Number($('recSeconds').value) * ctx.sampleRate, isFirst: true };
  $('recBtn').textContent = 'Stop';
};

function finishRecording() {
  const { chunks } = recording;
  recording = null;
  $('recBtn').textContent = 'Record';
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const samples = new Float32Array(total);
  let off = 0;
  for (const c of chunks) {
    samples.set(c, off);
    off += c.length;
  }
  const note = $('recNote').value.trim();
  const name =
    note.toLowerCase() === 'noise'
      ? `noise-${$('recInstrument').value.trim()}-${Date.now() % 100000}.wav`
      : `${$('recInstrument').value.trim()}-${note}-${$('recDistance').value.trim()}-${Date.now() % 100000}.wav`;
  download(encodeWav(samples, ctx.sampleRate), name);
  $('recStatus').textContent = `saved ${name} (${(total / ctx.sampleRate).toFixed(1)} s)`;
}

function encodeWav(samples, sampleRate) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

// ---------- loopback latency ----------
$('loopBtn').onclick = async () => {
  if (!ctx) await startMic().catch((e) => status(`mic failed: ${e.message}`));
  if (!ctx) return;
  const results = [];
  for (let i = 0; i < 8; i++) {
    status(`loopback burst ${i + 1}/8…`);
    const burst = renderPerformance([{ midi: 72, atMs: 0, durMs: 400, amp: 0.8 }], ctx.sampleRate).samples;
    const buf = ctx.createBuffer(1, burst.length, ctx.sampleRate);
    buf.getChannelData(0).set(burst);
    const srcNode = ctx.createBufferSource();
    srcNode.buffer = buf;
    srcNode.connect(ctx.destination);
    const startAt = ctx.currentTime + 0.15;
    const measured = new Promise((resolve) => {
      latencyProbe = { scheduledMs: startAt * 1000, resolve };
      setTimeout(() => {
        if (latencyProbe) {
          latencyProbe = null;
          resolve(null);
        }
      }, 1200);
    });
    srcNode.start(startAt);
    results.push(await measured);
    await sleep(500);
  }
  status('');
  const ok = results.filter((r) => r !== null);
  const rows = results.map((r, i) => ({ burst: i + 1, latency: r === null ? 'not detected' : `${r.toFixed(0)} ms`, pass: r !== null && r <= 300 }));
  const mean = ok.length ? ok.reduce((s, v) => s + v, 0) / ok.length : null;
  $('loopResults').innerHTML =
    table(rows, ['burst', 'latency', 'pass']) +
    (mean !== null
      ? `<p>mean <b>${mean.toFixed(0)} ms</b> over ${ok.length}/8 bursts (includes output latency; SR-AUD-04 budget is 300 ms strike-to-pixel)</p>`
      : '<p class="fail">no bursts detected — raise the volume and re-run</p>');
};
