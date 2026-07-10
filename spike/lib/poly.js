/**
 * Multi-F0 candidates for the Phase 6 polyphony spike (chords within C3-C5).
 * Two candidates share the FFT front end:
 *   polySieve    - iterative pick-and-subtract of harmonic peak sets
 *   polySalience - joint scoring, harmonically-explained candidates rejected
 * Both return [{ freq, clarity }] (empty on silence/uncertainty).
 */
import { hann, realFFT, spectralPeaks } from './fft.js';

const MIDI_LO = 48;
const MIDI_HI = 72;
const midiFreq = (m) => 440 * 2 ** ((m - 69) / 12);

function harmonicScore(peaks, f0, taken) {
  let score = 0;
  let unshared = 0;
  const hits = [];
  for (let h = 1; h <= 8; h++) {
    const target = f0 * h;
    let best = null;
    for (const p of peaks) {
      if (Math.abs(p.freq - target) < target * 0.03 && (!best || p.mag > best.mag)) best = p;
    }
    if (!best) continue;
    score += best.mag / h;
    hits.push(best);
    if (!taken.has(best)) unshared++;
  }
  const near = (t) => hits.some((p) => Math.abs(p.freq - t) < t * 0.03);
  if (!near(f0) && !near(2 * f0)) return { score: 0, hits: [], unshared: 0 };
  return { score, hits, unshared };
}

function frameSpectrum(frame, sampleRate, floor) {
  let rms = 0;
  for (let i = 0; i < frame.length; i++) rms += frame[i] * frame[i];
  rms = Math.sqrt(rms / frame.length);
  if (rms < floor) return null;
  const peaks = spectralPeaks(realFFT(hann(frame)), sampleRate, { floor: 0.02 });
  if (peaks.length === 0) return null;
  let total = 0;
  for (const p of peaks) total += p.mag;
  return { peaks, total };
}

export function polySieve(frame, sampleRate, { maxNotes = 4, floor = 0.005, minClarity = 0.5 } = {}) {
  const spec = frameSpectrum(frame, sampleRate, floor);
  if (!spec) return [];
  let pool = spec.peaks.slice();
  const taken = new Set();
  const out = [];
  for (let n = 0; n < maxNotes; n++) {
    let best = null;
    for (let m = MIDI_LO; m <= MIDI_HI; m++) {
      const r = harmonicScore(pool, midiFreq(m), taken);
      if (r.score > 0 && (!best || r.score > best.score)) best = { midi: m, ...r };
    }
    if (!best) break;
    // normalize against what is left in the pool: each subtraction removes
    // the picked note's energy, so later notes are judged on their own share
    let poolTotal = 0;
    for (const p of pool) poolTotal += p.mag;
    const clarity = Math.min(1, best.score / (poolTotal * 0.35));
    if (clarity < minClarity) break;
    if (out.length && best.unshared < 2) break;
    out.push({ freq: midiFreq(best.midi), clarity });
    for (const p of best.hits) {
      taken.add(p);
      pool = pool.filter((x) => x !== p);
    }
  }
  return out;
}

export function polySalience(frame, sampleRate, { maxNotes = 4, floor = 0.005, minClarity = 0.5 } = {}) {
  const spec = frameSpectrum(frame, sampleRate, floor);
  if (!spec) return [];
  const scored = [];
  for (let m = MIDI_LO; m <= MIDI_HI; m++) {
    const r = harmonicScore(spec.peaks, midiFreq(m), new Set());
    if (r.score > 0) scored.push({ midi: m, ...r });
  }
  scored.sort((a, b) => b.score - a.score);
  const out = [];
  const used = new Set();
  for (const c of scored) {
    if (out.length >= maxNotes) break;
    const clarity = Math.min(1, c.score / (spec.total * 0.35));
    if (clarity < minClarity) continue;
    let shared = 0;
    let own = 0;
    for (const p of c.hits) {
      own += p.mag;
      if (used.has(p)) shared += p.mag;
    }
    if (out.length && own > 0 && shared / own >= 0.6) continue;
    out.push({ freq: midiFreq(c.midi), clarity });
    for (const p of c.hits) used.add(p);
  }
  return out;
}
