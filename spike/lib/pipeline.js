import { yin, mpm, rms, midiToFreq, freqToMidi } from './pitch.js';
import { pianoTone } from './signals.js';
import { NoteTracker } from './tracker.js';
import { hann, realFFT, spectralPeaks } from './fft.js';
import { POLY_PICKERS } from './poly.js';

const DETECTORS = { yin, mpm };

/**
 * Render a scripted performance to a mono buffer plus ground truth.
 * notes: [{ midi | midis: [..], atMs, durMs, amp? }]
 *   -> { samples, truth: [{ midis: [..], atMs }] } (single midi normalized to [midi])
 */
export function renderPerformance(notes, sampleRate) {
  const endMs = Math.max(...notes.map((n) => n.atMs + n.durMs)) + 500;
  const samples = new Float32Array(Math.ceil((endMs / 1000) * sampleRate));
  for (const n of notes) {
    for (const midi of n.midis ?? [n.midi]) {
      const tone = pianoTone(midiToFreq(midi), sampleRate, Math.floor((n.durMs / 1000) * sampleRate), n.amp ?? 0.3, {
        decay: 0.99995,
      });
      // 30 ms release so a note-off is a damper, not a step discontinuity
      const release = Math.min(tone.length, Math.floor(0.03 * sampleRate));
      for (let i = 0; i < release; i++) tone[tone.length - 1 - i] *= i / release;
      const start = Math.floor((n.atMs / 1000) * sampleRate);
      for (let i = 0; i < tone.length; i++) samples[start + i] += tone[i];
    }
  }
  return {
    samples,
    // midi kept for the mono scorer; midis is the set-valued ground truth
    truth: notes.map((n) => ({
      midi: n.midi,
      midis: (n.midis ?? [n.midi]).slice().sort((a, b) => a - b),
      atMs: n.atMs,
    })),
  };
}

/**
 * Run the detector-to-tracker pipeline over a whole buffer (corpus mode).
 * Frame timestamps are end-of-frame: a strike can only be known once the
 * frame containing it is complete, so latency accounting stays honest.
 */
export function processBuffer(samples, sampleRate, { detector = 'mpm', frameSize = 2048, hopSize = 1024, tracker: trackerOpts } = {}) {
  const detect = typeof detector === 'function' ? detector : DETECTORS[detector];
  const noteTracker = new NoteTracker(trackerOpts);
  const events = [];
  for (let start = 0; start + frameSize <= samples.length; start += hopSize) {
    const frame = samples.subarray(start, start + frameSize);
    const tMs = ((start + frameSize) / sampleRate) * 1000;
    const e = noteTracker.feed(detect(frame, sampleRate), rms(frame), tMs);
    if (e) events.push(e);
  }
  return { events, durationMs: (samples.length / sampleRate) * 1000 };
}

/**
 * Polyphonic pipeline over a whole buffer: delta-spectrum onset analysis.
 *
 * Each frame's magnitude spectrum is compared with the spectrum deltaHops
 * hops earlier; the positive difference isolates newly-struck notes even when
 * their harmonics hide under ringing ones (octave over a held bass). Notes
 * struck at the same instant an octave apart remain spectrally ambiguous -
 * recorded as a content-authoring constraint, not solved here.
 *
 * New pitches confirmed for stableFrames consecutive frames enter a gather
 * group; a group flushes gatherMs after it opens -> one { midis, timestamp }
 * event per near-simultaneous onset group.
 */
export function processBufferPoly(samples, sampleRate, {
  picker = 'sieve',
  frameSize = 4096,
  hopSize = 1024,
  deltaHops = 4,
  minClarity = 0.5,
  onsetRatio = 0.12,
  stableFrames = 2,
  gatherMs = 60,
  refractoryMs = 300,
  maxNotes = 4,
} = {}) {
  const pick = typeof picker === 'function' ? picker : POLY_PICKERS[picker];
  const history = [];
  const pending = new Map();
  const lastOnset = new Map();
  let gather = null;
  let recentSeen = new Set();
  let prevSeen = new Set();
  const events = [];
  const flush = (tMs) => {
    // the first frames of an attack hold only a sliver of the new note and
    // misread; by flush time the spectrum is accurate, so a gathered pitch
    // must still be detected in the last two frames to survive
    const midis = [...gather.midis].filter((m) => recentSeen.has(m) || prevSeen.has(m));
    gather = null;
    if (midis.length) events.push({ midis: midis.sort((a, b) => a - b), timestamp: tMs });
  };
  for (let start = 0; start + frameSize <= samples.length; start += hopSize) {
    const frame = samples.subarray(start, start + frameSize);
    const tMs = ((start + frameSize) / sampleRate) * 1000;
    const mags = realFFT(hann(frame));
    const ref = history.length === deltaHops ? history[0] : null;
    const delta = new Float32Array(mags.length);
    let deltaE = 0;
    let totalE = 0;
    for (let i = 0; i < mags.length; i++) {
      delta[i] = Math.max(0, mags[i] - (ref ? ref[i] : 0));
      deltaE += delta[i] * delta[i];
      totalE += mags[i] * mags[i];
    }
    history.push(mags);
    if (history.length > deltaHops) history.shift();

    // A real strike adds energy comparable to what is already ringing; beat
    // wobble and note-off splatter sit orders of magnitude below. Frames
    // under the ratio are treated as onset-free (silence over guessing).
    if (totalE === 0 || deltaE / totalE < onsetRatio) {
      pending.clear();
      prevSeen = recentSeen;
      recentSeen = new Set();
      if (gather && tMs - gather.startMs >= gatherMs) flush(tMs);
      continue;
    }

    const dets = pick(spectralPeaks(delta, sampleRate, { floor: 0.02 }), { maxNotes, minClarity });
    const seen = new Set(dets.map((d) => Math.round(freqToMidi(d.freq))));
    prevSeen = recentSeen;
    recentSeen = seen;
    for (const m of pending.keys()) if (!seen.has(m)) pending.delete(m);
    for (const m of seen) {
      const count = (pending.get(m) ?? 0) + 1;
      pending.set(m, count);
      if (count < stableFrames) continue;
      const last = lastOnset.get(m);
      if (last !== undefined && tMs - last < refractoryMs) continue;
      lastOnset.set(m, tMs);
      if (!gather) gather = { midis: new Set(), startMs: tMs };
      gather.midis.add(m);
    }
    if (gather && tMs - gather.startMs >= gatherMs) flush(tMs);
  }
  if (gather) flush(gather.startMs + gatherMs);
  return { events, durationMs: (samples.length / sampleRate) * 1000 };
}
