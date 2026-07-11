/**
 * Gate runner wizard (throwaway): walks the operator through the deferred
 * hardware-validation tasks of spike/GATE_RUNBOOK.md and
 * spike/POLY_GATE_RUNBOOK.md. Prompt -> record -> verdict (same math as CI
 * scoring) -> attest -> WAV auto-download -> tallies -> exportable record.
 * Attestations persist in localStorage; WAV bytes live only in this page
 * session (each take also downloads the moment it is attested).
 */
import { monoCorpusTasks, polyCorpusTasks, noiseTasks, midiName, SOAK } from './tasks.js';
import { analyzeTake } from './analyze.js';
import { createCapture } from './capture.js';
import { encodeWav } from './wav.js';
import { encodeZip } from './zip.js';
import { processBuffer, processBufferPoly } from '../lib/pipeline.js';

const app = document.getElementById('app');
const STORE = 'arietta-gate';

const state = load() ?? {
  config: { piano: 'acoustic', distance: 'stand' },
  sessions: {
    mono: { attested: [], humanErrors: 0 },
    poly: { attested: [], humanErrors: 0 },
    noise: { attested: [], humanErrors: 0 },
    live: { right: 0, wrong: 0 },
    soak: { events: 0, seconds: 0, mode: 'mono' }
  }
};

function load() {
  try { return JSON.parse(localStorage.getItem(STORE)); } catch { return null; }
}
// sessions added after a state was saved start empty instead of crashing
state.sessions.noise ??= { attested: [], humanErrors: 0 };
function save() {
  localStorage.setItem(STORE, JSON.stringify(state));
}

const wavs = new Map(); // filename -> Uint8Array (this page session only)
const cap = createCapture();
let capReady = null;

async function ensureMic() {
  if (!capReady) capReady = cap.start();
  return capReady;
}

function download(name, bytes, type = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const on = (id, fn) => { document.getElementById(id).onclick = fn; };

// ---- setup ----

function renderSetup() {
  const c = state.config;
  app.innerHTML = `
    <h1>Arietta gate runner</h1>
    <div class="muted">The deferred hardware checks, one guided take at a time. Everything stays on this device.</div>
    <div class="kicker">This piano</div>
    <div class="card row">
      <label>Piano <input id="piano" value="${esc(c.piano)}" size="12"></label>
      <label>iPad distance
        <select id="distance">
          ${['stand', '1m', 'far'].map(d => `<option ${d === c.distance ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
      </label>
    </div>
    <div class="kicker">Sessions</div>
    <div class="card">
      <div class="row">
        <button id="go-mono">Mono corpus (${doneCount('mono')}/37)</button>
        <button id="go-poly">Chord corpus (${doneCount('poly')}/10)</button>
        <button id="go-noise">Noise takes (${doneCount('noise')}/4)</button>
        <button id="go-live">Live check</button>
        <button id="go-soak">Noise soak</button>
        <button id="go-results" class="quiet">Results and exports</button>
      </div>
      <div class="muted" style="margin-top:10px;">Mono corpus is the Phase 0 chromatic run (C3–C6). Chord corpus is POLY_GATE_RUNBOOK Session P1. Noise takes are the recorded clips that feed corpus G2 scoring. Follow spike/GATE_DAY.md for the full afternoon.</div>
    </div>
    <div class="card row">
      <button id="reset" class="quiet">Start over (clears attestations)</button>
    </div>`;
  const readCfg = () => {
    const raw = document.getElementById('piano').value.trim().toLowerCase().replace(/\s+/g, '-');
    state.config.piano = raw.replace(/[^a-z0-9-]/g, '') || 'acoustic';
    state.config.distance = document.getElementById('distance').value;
    save();
  };
  on('go-mono', () => { readCfg(); renderCorpus('mono'); });
  on('go-poly', () => { readCfg(); renderCorpus('poly'); });
  on('go-noise', () => { readCfg(); renderCorpus('noise'); });
  on('go-live', () => { readCfg(); renderLive(); });
  on('go-soak', () => { readCfg(); renderSoak(); });
  on('go-results', () => { readCfg(); renderResults(); });
  on('reset', () => {
    if (!confirm('Clear all attestations for a fresh run?')) return;
    localStorage.removeItem(STORE);
    location.reload();
  });
}

// ---- corpus (mono and poly share the flow) ----

function corpusTasks(kind) {
  if (kind === 'noise') return noiseTasks();
  return kind === 'mono'
    ? monoCorpusTasks({ instrument: state.config.piano, distance: state.config.distance })
    : polyCorpusTasks({ piano: state.config.piano, distance: state.config.distance });
}

const CORPUS_TITLES = {
  mono: 'Mono corpus · Phase 0',
  poly: 'Chord corpus · P1',
  noise: 'Noise takes · feeds G2'
};

// progress is per filename, so a new piano or distance starts a fresh pass
// while completed passes stay on record
function doneCount(kind) {
  const done = new Set(state.sessions[kind].attested.map(a => a.filename));
  return corpusTasks(kind).filter(t => done.has(t.filename)).length;
}

function renderCorpus(kind) {
  const tasks = corpusTasks(kind);
  const session = state.sessions[kind];
  const done = new Set(session.attested.map(a => a.filename));
  const task = tasks.find(t => !done.has(t.filename));
  if (!task) return renderResults(`${CORPUS_TITLES[kind]} complete for this piano and distance — every take attested.`);

  const k = doneCount(kind) + 1;
  app.innerHTML = `
    <div class="kicker">${CORPUS_TITLES[kind]} — take ${k} of ${tasks.length}</div>
    <div class="card">
      <div class="prompt">${esc(task.prompt)}</div>
      <div class="muted">Recording lasts ${task.recordSec}s and starts the moment you press the button. File: ${esc(task.filename)}</div>
      <div id="stage" style="margin-top:14px;">
        <button id="rec">Record (${task.recordSec}s)</button>
        <button id="back" class="quiet">Back to sessions</button>
      </div>
      <div id="err" class="no"></div>
    </div>`;
  on('back', renderSetup);
  on('rec', async () => {
    const stage = document.getElementById('stage');
    try {
      await ensureMic();
    } catch {
      document.getElementById('err').textContent =
        'I could not open the microphone. Check the browser permission and try again.';
      return;
    }
    let left = task.recordSec;
    stage.innerHTML = `<div class="big" id="count">${left.toFixed(1)}s</div><div class="muted">Play now…</div>`;
    const tick = setInterval(() => {
      left = Math.max(0, left - 0.25);
      const el = document.getElementById('count');
      if (el) el.textContent = `${left.toFixed(1)}s`;
    }, 250);
    const samples = await cap.record(task.recordSec);
    clearInterval(tick);
    const verdict = analyzeTake(samples, cap.sampleRate, task);
    const noise = task.mode === 'noise';
    const verdictLine = noise
      ? `<span class="${verdict.match ? 'ok' : 'no'}">${verdict.match ? 'quiet, as it should be' : 'those count against G2 — save it anyway, that is the point'}</span>`
      : `<span class="${verdict.match ? 'ok' : 'no'}">${verdict.match ? 'that matches' : 'that does not match what I asked for'}</span>`;
    stage.innerHTML = `
      <div class="heard">I heard: <b>${esc(verdict.heard)}</b> — ${verdictLine}</div>
      <div class="row">
        <button id="yes">${noise ? 'Save this take' : 'Yes — that is what I played'}</button>
        <button id="retake" class="quiet">Retake</button>
        ${noise ? '' : '<button id="human" class="quiet">I played something else</button>'}
      </div>
      <div class="muted" style="margin-top:8px;">${noise
        ? 'The clip saves whatever was heard — noise clips exist to catch false positives honestly.'
        : '"Yes" saves the take (right or wrong — a miss counts against the detector) and downloads the WAV. "I played something else" is a human slip: nothing is counted, just retake.'}</div>`;
    on('yes', () => {
      const bytes = encodeWav(samples, cap.sampleRate);
      wavs.set(task.filename, bytes);
      download(task.filename, bytes, 'audio/wav');
      session.attested.push({ id: task.id, filename: task.filename, match: verdict.match, heard: verdict.heard, events: verdict.events.length });
      save();
      renderCorpus(kind);
    });
    on('retake', () => renderCorpus(kind));
    if (!noise) on('human', () => { session.humanErrors += 1; save(); renderCorpus(kind); });
  });
}

// ---- live check ----

function renderLive() {
  const s = state.sessions.live;
  app.innerHTML = `
    <div class="kicker">Live check — play anything, attest each thing I hear</div>
    <div class="card">
      <div class="row">
        <label><input type="checkbox" id="chords"> chord mode (poly detector)</label>
        <button id="start">Start listening</button>
        <button id="back" class="quiet">Back to sessions</button>
      </div>
      <div class="heard" style="margin-top:10px;">Right so far: <b id="right">${s.right}</b> · Wrong: <b id="wrong">${s.wrong}</b></div>
      <div id="feed"></div>
    </div>`;
  on('back', renderSetup);
  on('start', async () => {
    try { await ensureMic(); } catch { alert('Microphone unavailable.'); return; }
    document.getElementById('start').disabled = true;
    const poly = document.getElementById('chords').checked;
    const feed = document.getElementById('feed');
    cap.live((chunk) => {
      const { events } = poly
        ? processBufferPoly(chunk, cap.sampleRate, {})
        : processBuffer(chunk, cap.sampleRate, {});
      for (const e of events) {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `<span>Heard <b></b></span><button>Right</button><button class="quiet">Wrong</button>`;
        row.querySelector('b').textContent = poly ? e.midis.map(midiName).join(' + ') : midiName(e.pitch);
        const [ok, no] = row.querySelectorAll('button');
        ok.onclick = () => { s.right += 1; save(); row.remove(); refresh(); };
        no.onclick = () => { s.wrong += 1; save(); row.remove(); refresh(); };
        feed.prepend(row);
      }
    });
    const refresh = () => {
      document.getElementById('right').textContent = s.right;
      document.getElementById('wrong').textContent = s.wrong;
    };
  });
}

// ---- noise soak ----

function renderSoak() {
  const s = state.sessions.soak;
  app.innerHTML = `
    <div class="kicker">Noise soak — ${SOAK.minutes} minutes of household sound, nobody at the piano</div>
    <div class="card">
      <div class="muted">Put on speech or TV near the piano and do not play. Every note event I emit counts against the gate (pass: at most ${SOAK.passMax} in ${SOAK.minutes} minutes).</div>
      <div class="row" style="margin-top:10px;">
        <label><input type="checkbox" id="chords" ${s.mode === 'poly' ? 'checked' : ''}> chord mode (poly detector)</label>
        <button id="start">Start soak</button>
        <button id="back" class="quiet">Back to sessions</button>
      </div>
      <div class="big" id="clock" style="margin-top:12px;">${SOAK.minutes}:00</div>
      <div class="heard">False note events: <b id="count">${s.events}</b></div>
    </div>`;
  on('back', renderSetup);
  on('start', async () => {
    try { await ensureMic(); } catch { alert('Microphone unavailable.'); return; }
    document.getElementById('start').disabled = true;
    s.mode = document.getElementById('chords').checked ? 'poly' : 'mono';
    s.events = 0;
    s.seconds = 0;
    save();
    const total = SOAK.minutes * 60;
    const unsub = cap.live((chunk) => {
      const { events } = s.mode === 'poly'
        ? processBufferPoly(chunk, cap.sampleRate, {})
        : processBuffer(chunk, cap.sampleRate, {});
      if (events.length) {
        s.events += events.length;
        save();
        document.getElementById('count').textContent = s.events;
      }
    }, 2);
    const t0 = Date.now();
    const tick = setInterval(() => {
      s.seconds = Math.min(total, Math.round((Date.now() - t0) / 1000));
      const left = total - s.seconds;
      const el = document.getElementById('clock');
      if (el) el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      if (s.seconds >= total) {
        clearInterval(tick);
        unsub();
        save();
        renderResults(`Soak finished: ${s.events} false event${s.events === 1 ? '' : 's'} in ${SOAK.minutes} minutes.`);
      }
    }, 500);
  });
}

// ---- results ----

function tally(kind) {
  const a = state.sessions[kind].attested;
  const good = a.filter(x => x.match).length;
  return { total: a.length, good, pct: a.length ? Math.round((good / a.length) * 100) : null };
}

function noiseStanding() {
  const n = state.sessions.noise.attested;
  if (!n.length) return 'not started';
  const events = n.reduce((s, a) => s + (a.events ?? 0), 0);
  return `${n.length}/4 clips recorded, ${events} note event${events === 1 ? '' : 's'} heard`;
}

function recordMarkdown() {
  const m = tally('mono');
  const p = tally('poly');
  const { live, soak } = state.sessions;
  const liveTotal = live.right + live.wrong;
  const line = (v) => (v.total ? `${v.good}/${v.total} attested correct (${v.pct}%)` : 'not run');
  return `## Gate record — gate app export, ${new Date().toISOString().slice(0, 10)}

Config: piano=${state.config.piano}, distance=${state.config.distance}

| Check | Result |
|---|---|
| Phase 0 mono corpus, attested (G1) | ${line(m)} |
| Poly corpus P1, attested (G1) | ${line(p)} |
| Noise takes (feeds corpus G2) | ${noiseStanding()} |
| Live check | ${liveTotal ? `${live.right}/${liveTotal} right` : 'not run'} |
| Noise soak (${soak.mode}) (G2) | ${soak.seconds ? `${soak.events} false events in ${Math.round(soak.seconds / 60)} min (pass: <= ${SOAK.passMax}/10 min)` : 'not run'} |

Human-error retakes: mono ${state.sessions.mono.humanErrors}, poly ${state.sessions.poly.humanErrors}.
WAV corpus files: place in spike/corpus/ and run the offline scorers for the formal G1/G2 numbers.
Not covered here: strike-to-pixel latency (G3) — needs the slow-motion camera session (GATE_RUNBOOK.md Session 4).
`;
}

function renderResults(note = '') {
  const m = tally('mono');
  const p = tally('poly');
  const { live, soak } = state.sessions;
  app.innerHTML = `
    <div class="kicker">Results</div>
    ${note ? `<div class="card ok">${esc(note)}</div>` : ''}
    <div class="card">
      <table>
        <tr><th>Session</th><th>Standing</th></tr>
        <tr><td>Mono corpus (37 takes)</td><td>${m.total ? `${m.good}/${m.total} correct (${m.pct}%)` : 'not started'}</td></tr>
        <tr><td>Chord corpus (10 takes)</td><td>${p.total ? `${p.good}/${p.total} correct (${p.pct}%)` : 'not started'}</td></tr>
        <tr><td>Noise takes (4 clips)</td><td>${noiseStanding()}</td></tr>
        <tr><td>Live check</td><td>${live.right + live.wrong ? `${live.right} right, ${live.wrong} wrong` : 'not run'}</td></tr>
        <tr><td>Noise soak</td><td>${soak.seconds ? `${soak.events} false events in ${Math.round(soak.seconds / 60)} min (${soak.mode})` : 'not run'}</td></tr>
      </table>
      <div class="muted" style="margin-top:10px;">Strike-to-pixel latency (G3) is not measurable here — that stays with the slow-motion camera session in GATE_RUNBOOK.md.</div>
    </div>
    <div class="card row">
      <button id="dl-zip" ${wavs.size ? '' : 'disabled'}>Download all WAVs (${wavs.size}) as zip</button>
      <button id="dl-md" class="quiet">Download gate record (markdown)</button>
      <button id="dl-json" class="quiet">Download raw JSON</button>
      <button id="back" class="quiet">Back to sessions</button>
    </div>
    ${wavs.size ? '' : '<div class="muted">The zip covers takes from this page session; every attested take already downloaded individually.</div>'}`;
  on('back', renderSetup);
  on('dl-zip', () => {
    const entries = [...wavs].map(([name, data]) => ({ name, data }));
    download(`gate-corpus-${state.config.piano}-${state.config.distance}.zip`, encodeZip(entries), 'application/zip');
  });
  on('dl-md', () => download('gate-record.md', new TextEncoder().encode(recordMarkdown()), 'text/markdown'));
  on('dl-json', () => download('gate-attestations.json', new TextEncoder().encode(JSON.stringify(state, null, 2)), 'application/json'));
}

renderSetup();
