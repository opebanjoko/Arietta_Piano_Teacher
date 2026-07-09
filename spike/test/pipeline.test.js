import test from 'node:test';
import assert from 'node:assert/strict';
import { processBuffer, renderPerformance } from '../lib/pipeline.js';
import { score } from '../lib/score.js';
import { whiteNoise } from '../lib/signals.js';

const SR = 44100;

/** A C3-to-C6 walk: the SR-AUD-03 range endpoints plus notes between. */
const WALK = [48, 52, 55, 60, 64, 67, 72, 76, 79, 84].map((midi, i) => ({
  midi,
  atMs: 300 + i * 600,
  durMs: 450,
}));

for (const detector of ['yin', 'mpm']) {
  test(`${detector}: clean synthetic performance passes the Phase 0 gate`, () => {
    const { samples, truth } = renderPerformance(WALK, SR);
    const { events, durationMs } = processBuffer(samples, SR, { detector });
    const r = score(events, truth, { durationMs });
    assert.equal(r.total, WALK.length);
    assert.equal(r.detected, WALK.length, JSON.stringify({ r, events }));
    assert.equal(r.falseEvents, 0, JSON.stringify(events));
    assert.ok(r.latency.max !== null && r.latency.max <= 150, `detector-path latency ${r.latency.max} ms exceeds SR-AUD-04 budget`);
    assert.ok(r.pass);
  });

  test(`${detector}: repeated strikes of one key emit one event each (SR-AUD-06)`, () => {
    const notes = Array.from({ length: 5 }, (_, i) => ({ midi: 60, atMs: 300 + i * 600, durMs: 400 }));
    const { samples, truth } = renderPerformance(notes, SR);
    const { events, durationMs } = processBuffer(samples, SR, { detector });
    const r = score(events, truth, { durationMs });
    assert.equal(r.detected, 5, JSON.stringify(events));
    assert.equal(r.falseEvents, 0);
  });

  test(`${detector}: 60 s of noise emits no events (silence over guessing)`, () => {
    const noise = whiteNoise(SR * 60, 0.05, 42);
    const { events } = processBuffer(noise, SR, { detector });
    assert.equal(events.length, 0, JSON.stringify(events));
  });
}
