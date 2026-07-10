/**
 * Polyphonic detection (SR-AUD-10): the Phase 6 spike's winning design.
 *
 * Detector: iterative harmonic sieve over interpolated FFT peaks ("sieve";
 * the joint-scoring "salience" candidate lost the spike gate - see
 * spike/POLY_GATE_RUNBOOK.md for the recorded metrics and tuning).
 *
 * PolyTracker analyses the POSITIVE spectral delta versus ~85 ms earlier, so
 * a new note is heard even when its harmonics hide under ringing ones
 * (octave over a held bass). Known limit, recorded as a content constraint:
 * notes struck at the same instant a unison/octave apart cannot be separated.
 *
 * The confidence bar is higher than mono in acceptance terms (SR-AUD-10):
 * a pitch needs >= 2 partials with its root or 2nd harmonic present, two
 * stable frames, a strike-sized energy jump (onsetRatio), and survival of
 * the flush re-check before anything is emitted.
 */
import { hann, realFFT, spectralPeaks } from './fft.js'

const MIDI_LO = 48
const MIDI_HI = 72
const midiFreq = (m) => 440 * 2 ** ((m - 69) / 12)

function harmonicScore(peaks, f0, taken) {
  let score = 0
  let unshared = 0
  const hits = []
  for (let h = 1; h <= 8; h++) {
    const target = f0 * h
    let best = null
    for (const p of peaks) {
      if (Math.abs(p.freq - target) < target * 0.03 && (!best || p.mag > best.mag)) best = p
    }
    if (!best) continue
    score += best.mag / h
    hits.push(best)
    if (!taken.has(best)) unshared++
  }
  const near = (t) => hits.some((p) => Math.abs(p.freq - t) < t * 0.03)
  if (hits.length < 2 || (!near(f0) && !near(2 * f0))) return { score: 0, hits: [], unshared: 0 }
  return { score, hits, unshared }
}

/** Iterative pick-and-subtract multi-F0 over a peak list -> [{ midi, clarity }]. */
export function sieveFromPeaks(peaks, { maxNotes = 4, minClarity = 0.5 } = {}) {
  let pool = peaks.slice()
  const taken = new Set()
  const out = []
  for (let n = 0; n < maxNotes; n++) {
    let best = null
    for (let m = MIDI_LO; m <= MIDI_HI; m++) {
      const r = harmonicScore(pool, midiFreq(m), taken)
      if (r.score === 0) continue
      if (out.length && r.unshared < 2) continue
      if (!best || r.score > best.score) best = { midi: m, ...r }
    }
    if (!best) break
    let poolTotal = 0
    for (const p of pool) poolTotal += p.mag
    const clarity = Math.min(1, best.score / (poolTotal * 0.35))
    if (clarity < minClarity) break
    out.push({ midi: best.midi, clarity })
    // sweep siblings near the picked note's harmonic positions: windowing can
    // split a partial in two, and a surviving sibling stack reads back as a
    // phantom octave
    const f0 = midiFreq(best.midi)
    for (const p of pool) {
      for (let h = 1; h <= 8; h++) {
        if (Math.abs(p.freq - f0 * h) < f0 * h * 0.04) {
          taken.add(p)
          break
        }
      }
    }
    pool = pool.filter((x) => !taken.has(x))
  }
  return out
}

/** One 4096-sample window -> [{ midi, clarity }] (test and calibration seam). */
export function detectPoly(frame, sampleRate, opts = {}) {
  let rms = 0
  for (let i = 0; i < frame.length; i++) rms += frame[i] * frame[i]
  if (Math.sqrt(rms / frame.length) < (opts.floor ?? 0.005)) return []
  return sieveFromPeaks(spectralPeaks(realFFT(hann(frame)), sampleRate, { floor: 0.02 }), opts)
}

const WINDOW = 4096

export class PolyTracker {
  constructor({
    sampleRate = 48000,
    minClarity = 0.5,
    onsetRatio = 0.12,
    deltaHops = 4,
    stableFrames = 2,
    gatherMs = 60,
    refractoryMs = 300,
    maxNotes = 4,
  } = {}) {
    this.sampleRate = sampleRate
    this.opts = { minClarity, onsetRatio, deltaHops, stableFrames, gatherMs, refractoryMs, maxNotes }
    this.ring = new Float32Array(WINDOW)
    this.filled = 0
    this.history = []
    this.pending = new Map()
    this.lastOnset = new Map()
    this.gather = null
    this.recentSeen = new Set()
    this.prevSeen = new Set()
  }

  /** Feed one capture frame (overlapping, hop-sized new samples at the end). */
  feed(frame, timeMs) {
    const fresh = this.filled === 0 ? frame : frame.subarray(frame.length / 2)
    const keep = WINDOW - fresh.length
    this.ring.copyWithin(0, WINDOW - keep)
    this.ring.set(fresh, keep)
    this.filled = Math.min(WINDOW, this.filled + fresh.length)
    if (this.filled < WINDOW) return null
    return this.analyze(timeMs)
  }

  analyze(timeMs) {
    const { minClarity, onsetRatio, deltaHops, stableFrames, gatherMs, refractoryMs, maxNotes } = this.opts
    const mags = realFFT(hann(this.ring))
    const ref = this.history.length === deltaHops ? this.history[0] : null
    const delta = new Float32Array(mags.length)
    let deltaE = 0
    let totalE = 0
    for (let i = 0; i < mags.length; i++) {
      delta[i] = Math.max(0, mags[i] - (ref ? ref[i] : 0))
      deltaE += delta[i] * delta[i]
      totalE += mags[i] * mags[i]
    }
    this.history.push(mags)
    if (this.history.length > deltaHops) this.history.shift()

    if (totalE === 0 || deltaE / totalE < onsetRatio) {
      this.pending.clear()
      this.prevSeen = this.recentSeen
      this.recentSeen = new Set()
      if (this.gather && timeMs - this.gather.startMs >= gatherMs) return this.flush(timeMs)
      return null
    }

    const dets = sieveFromPeaks(spectralPeaks(delta, this.sampleRate, { floor: 0.02 }), { maxNotes, minClarity })
    const seen = new Map(dets.map((d) => [d.midi, d.clarity]))
    this.prevSeen = this.recentSeen
    this.recentSeen = new Set(seen.keys())
    for (const m of this.pending.keys()) if (!seen.has(m)) this.pending.delete(m)
    for (const [m, clarity] of seen) {
      const count = (this.pending.get(m)?.count ?? 0) + 1
      this.pending.set(m, { count, clarity })
      if (count < stableFrames) continue
      const last = this.lastOnset.get(m)
      if (last !== undefined && timeMs - last < refractoryMs) continue
      this.lastOnset.set(m, timeMs)
      if (!this.gather) this.gather = { midis: new Map(), startMs: timeMs }
      this.gather.midis.set(m, clarity)
    }
    if (this.gather && timeMs - this.gather.startMs >= gatherMs) return this.flush(timeMs)
    return null
  }

  flush(timeMs) {
    // sliver frames at the very start of an attack misread; a gathered pitch
    // must still be detected near flush time to survive
    const members = [...this.gather.midis].filter(([m]) => this.recentSeen.has(m) || this.prevSeen.has(m))
    this.gather = null
    if (!members.length) return null
    const confidence = Math.min(...members.map(([, c]) => c))
    const pitches = members.map(([m]) => m).sort((a, b) => a - b)
    if (pitches.length === 1) return { pitch: pitches[0], source: 'mic', confidence, timestamp: timeMs }
    return { pitches, source: 'mic', confidence, timestamp: timeMs }
  }
}
