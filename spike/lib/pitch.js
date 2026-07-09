/**
 * Candidate monophonic pitch detectors for the Phase 0 listening spike.
 *
 * Both take a Float32Array frame and a sample rate and return
 * { freq, clarity } or null. Clarity is 0..1; the note tracker applies the
 * confidence threshold (SR-AUD-05), detectors just report.
 *
 * Search range covers C3-C6 (SR-AUD-03) with margin: 90-1200 Hz.
 */

const F_MIN = 90;
const F_MAX = 1200;
const RMS_FLOOR = 1e-4;

export function midiToFreq(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function freqToMidi(freq) {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

export function rms(frame) {
  let s = 0;
  for (let i = 0; i < frame.length; i++) s += frame[i] * frame[i];
  return Math.sqrt(s / frame.length);
}

function tauRange(frame, sampleRate) {
  const tauMin = Math.floor(sampleRate / F_MAX);
  const tauMax = Math.min(Math.ceil(sampleRate / F_MIN), frame.length >> 1);
  return { tauMin, tauMax };
}

/** Parabolic interpolation of extremum position around index t of array a. */
function refine(a, t) {
  if (t <= 0 || t >= a.length - 1) return t;
  const d = a[t + 1] + a[t - 1] - 2 * a[t];
  if (d === 0) return t;
  return t + (a[t - 1] - a[t + 1]) / (2 * d);
}

/** YIN (de Cheveigne & Kawahara 2002): CMNDF with absolute threshold. */
export function yin(frame, sampleRate, { threshold = 0.15 } = {}) {
  if (rms(frame) < RMS_FLOOR) return null;
  const { tauMin, tauMax } = tauRange(frame, sampleRate);
  const w = frame.length - tauMax;

  const d = new Float32Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < w; i++) {
      const diff = frame[i] - frame[i + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }

  const cmndf = new Float32Array(tauMax + 1);
  cmndf[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    running += d[tau];
    cmndf[tau] = running === 0 ? 1 : (d[tau] * tau) / running;
  }

  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (cmndf[t] < threshold) {
      while (t + 1 <= tauMax && cmndf[t + 1] < cmndf[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;

  const clarity = 1 - cmndf[tau];
  return { freq: sampleRate / refine(cmndf, tau), clarity };
}

/** MPM (McLeod & Wyvill 2005): NSDF with key-maximum picking. */
export function mpm(frame, sampleRate, { k = 0.9 } = {}) {
  if (rms(frame) < RMS_FLOOR) return null;
  const { tauMin, tauMax } = tauRange(frame, sampleRate);
  const w = frame.length - tauMax;

  const nsdf = new Float32Array(tauMax + 1);
  for (let tau = 0; tau <= tauMax; tau++) {
    let acf = 0;
    let m = 0;
    for (let i = 0; i < w; i++) {
      acf += frame[i] * frame[i + tau];
      m += frame[i] * frame[i] + frame[i + tau] * frame[i + tau];
    }
    nsdf[tau] = m === 0 ? 0 : (2 * acf) / m;
  }

  // Key maxima: highest point of each positive region after the first
  // negative-going zero crossing.
  const peaks = [];
  let t = 0;
  while (t <= tauMax && nsdf[t] > 0) t++; // skip the τ=0 lobe
  while (t <= tauMax) {
    while (t <= tauMax && nsdf[t] <= 0) t++;
    let best = -1;
    let bestVal = -Infinity;
    while (t <= tauMax && nsdf[t] > 0) {
      if (nsdf[t] > bestVal) {
        bestVal = nsdf[t];
        best = t;
      }
      t++;
    }
    if (best >= tauMin) peaks.push(best);
  }
  if (peaks.length === 0) return null;

  const highest = Math.max(...peaks.map((p) => nsdf[p]));
  const chosen = peaks.find((p) => nsdf[p] >= k * highest);
  const clarity = Math.max(0, Math.min(1, nsdf[chosen]));
  return { freq: sampleRate / refine(nsdf, chosen), clarity };
}
