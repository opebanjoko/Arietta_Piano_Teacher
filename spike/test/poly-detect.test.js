import { test } from 'node:test';
import assert from 'node:assert/strict';
import { polySieve, polySalience } from '../lib/poly.js';
import { pianoTone, whiteNoise, mix, silence } from '../lib/signals.js';

const SR = 48000;
const N = 4096;
const midiF = (m) => 440 * 2 ** ((m - 69) / 12);
const midisOf = (r) => r.map((x) => Math.round(69 + 12 * Math.log2(x.freq / 440))).sort((a, b) => a - b);

for (const [name, detect] of [['sieve', polySieve], ['salience', polySalience]]) {
  test(`${name}: C4+E4 dyad`, () => {
    const buf = mix(pianoTone(midiF(60), SR, N), pianoTone(midiF(64), SR, N));
    assert.deepEqual(midisOf(detect(buf, SR)), [60, 64]);
  });

  test(`${name}: C4 E4 G4 triad`, () => {
    const buf = mix(pianoTone(midiF(60), SR, N), pianoTone(midiF(64), SR, N), pianoTone(midiF(67), SR, N));
    assert.deepEqual(midisOf(detect(buf, SR)), [60, 64, 67]);
  });

  test(`${name}: low C3+G3 dyad (worst resolution)`, () => {
    const buf = mix(pianoTone(midiF(48), SR, N), pianoTone(midiF(55), SR, N));
    assert.deepEqual(midisOf(detect(buf, SR)), [48, 55]);
  });

  test(`${name}: melody note over a held bass`, () => {
    const buf = mix(pianoTone(midiF(48), SR, N, 0.4), pianoTone(midiF(64), SR, N, 0.5));
    assert.deepEqual(midisOf(detect(buf, SR)), [48, 64]);
  });

  test(`${name}: single note does not sprout phantom octaves`, () => {
    assert.deepEqual(midisOf(detect(pianoTone(midiF(60), SR, N), SR)), [60]);
    assert.deepEqual(midisOf(detect(pianoTone(midiF(48), SR, N), SR)), [48]);
  });

  test(`${name}: silence and noise return nothing`, () => {
    assert.deepEqual(detect(silence(N), SR), []);
    assert.deepEqual(detect(whiteNoise(N, 0.05), SR), []);
  });
}
