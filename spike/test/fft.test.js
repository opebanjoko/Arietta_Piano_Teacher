import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realFFT, hann, spectralPeaks } from '../lib/fft.js';
import { sine, mix } from '../lib/signals.js';

const SR = 48000;
const N = 4096;

test('realFFT finds a lone sine at the right bin', () => {
  const f = 440;
  const mags = realFFT(hann(sine(f, SR, N)));
  const bin = Math.round(f / (SR / N));
  let top = 0;
  for (let i = 1; i < mags.length; i++) if (mags[i] > mags[top]) top = i;
  assert.ok(Math.abs(top - bin) <= 1, `peak bin ${top} vs expected ${bin}`);
});

test('spectralPeaks interpolates off-bin frequencies within 3 Hz', () => {
  const f = 261.63; // C4, not bin-aligned
  const peaks = spectralPeaks(realFFT(hann(sine(f, SR, N))), SR);
  assert.ok(peaks.length >= 1);
  assert.ok(Math.abs(peaks[0].freq - f) < 3, `got ${peaks[0].freq}`);
});

// At 4096/48k the Hann main lobe merges C3/Eb3 fundamentals (2.1 bins apart);
// the sieve leans on 2nd harmonics down there, so that is what must separate.
test('spectralPeaks separates C3 and Eb3 second harmonics', () => {
  const buf = mix(
    mix(sine(130.81, SR, N), sine(261.62, SR, N, 0.25)),
    mix(sine(155.56, SR, N), sine(311.12, SR, N, 0.25))
  );
  const peaks = spectralPeaks(realFFT(hann(buf)), SR).slice(0, 8);
  const near = (t) => peaks.some((p) => Math.abs(p.freq - t) < 4);
  assert.ok(near(261.62) && near(311.12), JSON.stringify(peaks.map((p) => p.freq.toFixed(1))));
});
