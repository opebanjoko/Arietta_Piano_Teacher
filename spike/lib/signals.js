/** Deterministic test-signal generators shared by node tests and the harness's synthetic corpus. */

export function sine(freq, sampleRate, length, amp = 0.5) {
  const out = new Float32Array(length);
  const w = (2 * Math.PI * freq) / sampleRate;
  for (let i = 0; i < length; i++) out[i] = amp * Math.sin(w * i);
  return out;
}

/**
 * Piano-like tone: harmonic stack with 1/n rolloff and exponential decay.
 * Not a piano, but shares the properties that trip naive detectors
 * (strong upper partials, decaying envelope).
 */
export function pianoTone(freq, sampleRate, length, amp = 0.5, { harmonics = 8, decay = 0.9998, rolloff = (n) => 1 / n } = {}) {
  const out = new Float32Array(length);
  let norm = 0;
  for (let n = 1; n <= harmonics; n++) norm += rolloff(n);
  let env = 1;
  for (let i = 0; i < length; i++) {
    let s = 0;
    for (let n = 1; n <= harmonics; n++) {
      s += rolloff(n) * Math.sin((2 * Math.PI * freq * n * i) / sampleRate);
    }
    out[i] = (amp * env * s) / norm;
    env *= decay;
  }
  return out;
}

/** Seeded white noise (mulberry32) so tests are reproducible. */
export function whiteNoise(length, amp = 0.5, seed = 1) {
  const out = new Float32Array(length);
  let a = seed >>> 0;
  for (let i = 0; i < length; i++) {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    out[i] = amp * (2 * r - 1);
  }
  return out;
}

export function silence(length) {
  return new Float32Array(length);
}

export function mix(...signals) {
  const length = Math.max(...signals.map((s) => s.length));
  const out = new Float32Array(length);
  for (const s of signals) for (let i = 0; i < s.length; i++) out[i] += s[i];
  return out;
}
