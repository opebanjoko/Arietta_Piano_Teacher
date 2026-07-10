/** Dependency-free radix-2 FFT utilities for the polyphony spike. */

export function hann(frame) {
  const out = new Float32Array(frame.length);
  const k = Math.PI / (frame.length - 1);
  for (let i = 0; i < frame.length; i++) out[i] = frame[i] * Math.sin(i * k) ** 2;
  return out;
}

/** Magnitude spectrum (length N/2) of a real frame; N must be a power of two. */
export function realFFT(frame) {
  const n = frame.length;
  const re = Float64Array.from(frame);
  const im = new Float64Array(n);
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr;
        im[i + k + len / 2] = ui - vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
  const mags = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) mags[i] = Math.hypot(re[i], im[i]) / n;
  return mags;
}

/** Local maxima above floor*max, parabolic-interpolated, sorted by magnitude. */
export function spectralPeaks(mags, sampleRate, { floor = 0.01 } = {}) {
  const binHz = sampleRate / (mags.length * 2);
  let top = 0;
  for (let i = 0; i < mags.length; i++) if (mags[i] > top) top = mags[i];
  const peaks = [];
  for (let i = 2; i < mags.length - 2; i++) {
    if (mags[i] <= mags[i - 1] || mags[i] < mags[i + 1] || mags[i] < top * floor) continue;
    const a = mags[i - 1];
    const b = mags[i];
    const c = mags[i + 1];
    const denom = a - 2 * b + c;
    const shift = denom === 0 ? 0 : (a - c) / (2 * denom);
    peaks.push({ freq: (i + shift) * binHz, mag: b });
  }
  return peaks.sort((x, y) => y.mag - x.mag);
}
