import { freqToMidi } from './pitch.js';

/**
 * Turns per-frame pitch detections into NoteEvents (SR-EVT-01).
 *
 * Enforces the cardinal rule (SR-AUD-05): frames below the clarity threshold
 * are treated as silence, never emitted as guesses. One event per sustained
 * note; re-strikes detected via RMS re-attack (SR-AUD-06).
 */
export class NoteTracker {
  constructor({ minClarity = 0.9, lowClarity = null, lowBelowMidi = 52, stableFrames = 2, silenceFrames = 3, restrikeFactor = 1.5 } = {}) {
    this.minClarity = minClarity;
    this.lowClarity = lowClarity ?? minClarity;
    this.lowBelowMidi = lowBelowMidi;
    this.stableFrames = stableFrames;
    this.silenceFrames = silenceFrames;
    this.restrikeFactor = restrikeFactor;
    this.active = null;
    this.lastRms = 0;
    this.quietRun = 0;
    this.pending = null; // { midi, count, timestamp }
  }

  feed(detection, frameRms, timestampMs) {
    const candidate = detection ? freqToMidi(detection.freq) : null;
    const needed = candidate !== null && candidate < this.lowBelowMidi ? this.lowClarity : this.minClarity;
    const midi = detection && detection.clarity >= needed ? candidate : null;

    if (midi === null) {
      this.pending = null;
      if (++this.quietRun >= this.silenceFrames) this.active = null;
      return null;
    }
    this.quietRun = 0;

    if (midi === this.active) {
      this.pending = null;
      const reattack = this.lastRms > 0 && frameRms > this.restrikeFactor * this.lastRms;
      this.lastRms = frameRms;
      return reattack ? this.emit(midi, detection.clarity, timestampMs) : null;
    }

    if (!this.pending || this.pending.midi !== midi) {
      this.pending = { midi, count: 1, timestamp: timestampMs };
      return null;
    }
    if (++this.pending.count < this.stableFrames) return null;

    const { timestamp } = this.pending;
    this.pending = null;
    this.lastRms = frameRms;
    return this.emit(midi, detection.clarity, timestamp);
  }

  emit(pitch, clarity, timestamp) {
    this.active = pitch;
    return { pitch, source: 'mic', confidence: Math.min(1, clarity), timestamp };
  }
}
