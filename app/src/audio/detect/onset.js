/**
 * Percussive onset tracker (SR-AUD-14): claps and taps, no pitch. Emits an
 * onset timestamp when the frame energy jumps well clear of the rolling
 * background — silence over guessing holds here too (SR-AUD-05): a soft or
 * ambiguous transient emits nothing. A refractory window keeps one clap from
 * double-counting across overlapping frames.
 */
export class OnsetTracker {
  constructor({ floor = 0.02, factor = 4, refractoryMs = 200 } = {}) {
    this.floor = floor;
    this.factor = factor;
    this.refractoryMs = refractoryMs;
    this.avg = 0;
    this.lastAt = -Infinity;
  }

  feed(rms, timestampMs) {
    const background = Math.max(this.avg, 0.004);
    this.avg = this.avg * 0.8 + rms * 0.2;
    if (rms < this.floor || rms < this.factor * background) return null;
    if (timestampMs - this.lastAt < this.refractoryMs) return null;
    this.lastAt = timestampMs;
    return { kind: 'onset', source: 'mic', timestamp: timestampMs };
  }
}
