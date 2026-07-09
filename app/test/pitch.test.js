import test from 'node:test';
import assert from 'node:assert/strict';
import { yin, mpm, freqToMidi, midiToFreq } from '../src/audio/detect/pitch.js';
import { sine, pianoTone, whiteNoise, silence } from './signals.js';

const SR = 44100;
const FRAME = 2048;

const DETECTORS = { yin, mpm };

test('midiToFreq maps A4 and C4', () => {
  assert.ok(Math.abs(midiToFreq(69) - 440) < 0.01);
  assert.ok(Math.abs(midiToFreq(60) - 261.63) < 0.01);
});

test('freqToMidi rounds to nearest semitone', () => {
  assert.equal(freqToMidi(440), 69);
  assert.equal(freqToMidi(130.81), 48); // C3
  assert.equal(freqToMidi(1046.5), 84); // C6
  assert.equal(freqToMidi(263), 60); // slightly sharp C4 still C4
});

for (const [name, detect] of Object.entries(DETECTORS)) {
  test(`${name}: detects a 440 Hz sine within 1% with high clarity`, () => {
    const r = detect(sine(440, SR, FRAME), SR);
    assert.ok(r, 'expected a detection');
    assert.ok(Math.abs(r.freq - 440) / 440 < 0.01, `freq was ${r.freq}`);
    assert.ok(r.clarity > 0.9, `clarity was ${r.clarity}`);
  });

  test(`${name}: correct MIDI for piano-like tones across C3-C6`, () => {
    // Every C plus scattered course notes, both endpoints of SR-AUD-03.
    for (const midi of [48, 50, 55, 60, 62, 64, 67, 72, 76, 79, 84]) {
      const f = midiToFreq(midi);
      const r = detect(pianoTone(f, SR, FRAME), SR);
      assert.ok(r, `no detection at MIDI ${midi}`);
      assert.equal(freqToMidi(r.freq), midi, `MIDI ${midi}: detected ${r.freq} Hz -> ${freqToMidi(r.freq)}`);
    }
  });

  test(`${name}: does not octave-jump when the 2nd harmonic dominates`, () => {
    const f = midiToFreq(60);
    const trap = pianoTone(f, SR, FRAME, 0.5, { rolloff: (n) => (n === 2 ? 1.5 : 1 / n) });
    const r = detect(trap, SR);
    assert.ok(r, 'expected a detection');
    assert.equal(freqToMidi(r.freq), 60, `detected ${r.freq} Hz`);
  });

  test(`${name}: white noise yields no confident detection`, () => {
    const r = detect(whiteNoise(FRAME, 0.5), SR);
    assert.ok(!r || r.clarity < 0.5, `clarity was ${r?.clarity}`);
  });

  test(`${name}: silence yields no detection`, () => {
    assert.equal(detect(silence(FRAME), SR), null);
  });
}
