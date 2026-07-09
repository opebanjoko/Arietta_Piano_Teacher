import test from 'node:test';
import assert from 'node:assert/strict';
import { score } from '../lib/score.js';

const ev = (pitch, timestamp) => ({ pitch, source: 'mic', confidence: 0.95, timestamp });
const gt = (midi, atMs) => ({ midi, atMs });

test('perfect run: full detection, zero false events, latency stats, gate passes', () => {
  const truth = Array.from({ length: 10 }, (_, i) => gt(60 + i, i * 1000));
  const events = truth.map((t) => ev(t.midi, t.atMs + 80));
  const r = score(events, truth, { durationMs: 600000 });
  assert.equal(r.total, 10);
  assert.equal(r.detected, 10);
  assert.equal(r.detectionRate, 1);
  assert.equal(r.falseEvents, 0);
  assert.equal(r.falsePer10Min, 0);
  assert.equal(r.latency.mean, 80);
  assert.equal(r.latency.max, 80);
  assert.equal(r.pass, true);
});

test('a missed note drops detection rate below the gate', () => {
  const truth = Array.from({ length: 10 }, (_, i) => gt(60, i * 1000));
  const events = truth.slice(0, 9).map((t) => ev(t.midi, t.atMs + 100));
  const r = score(events, truth, { durationMs: 600000 });
  assert.equal(r.detectionRate, 0.9);
  assert.equal(r.pass, false);
});

test('an unmatched event is a false event, normalized per 10 minutes', () => {
  const truth = [gt(60, 1000)];
  const events = [ev(60, 1100), ev(72, 5000)];
  const r = score(events, truth, { durationMs: 300000 }); // 5 min
  assert.equal(r.falseEvents, 1);
  assert.equal(r.falsePer10Min, 2);
  assert.equal(r.pass, false);
});

test('a wrong-pitch event is both a miss and a false event', () => {
  const truth = [gt(60, 1000)];
  const events = [ev(62, 1100)];
  const r = score(events, truth, { durationMs: 600000 });
  assert.equal(r.detected, 0);
  assert.equal(r.falseEvents, 1);
});

test('a truth note matches at most one event; double-counting is a false event', () => {
  const truth = [gt(60, 1000)];
  const events = [ev(60, 1100), ev(60, 1200)];
  const r = score(events, truth, { durationMs: 600000 });
  assert.equal(r.detected, 1);
  assert.equal(r.falseEvents, 1);
});

test('an event outside the match window does not match', () => {
  const truth = [gt(60, 1000)];
  const events = [ev(60, 1700)];
  const r = score(events, truth, { durationMs: 600000, matchWindowMs: 500 });
  assert.equal(r.detected, 0);
  assert.equal(r.falseEvents, 1);
});

test('latency p95 reflects the distribution', () => {
  const truth = Array.from({ length: 20 }, (_, i) => gt(60, i * 1000));
  const events = truth.map((t, i) => ev(60, t.atMs + (i === 19 ? 400 : 100)));
  const r = score(events, truth, { durationMs: 600000 });
  assert.equal(r.latency.max, 400);
  assert.ok(r.latency.p95 >= 100 && r.latency.p95 <= 400);
  assert.ok(Math.abs(r.latency.mean - 115) < 0.001);
});

test('empty inputs do not divide by zero', () => {
  const r = score([], [], { durationMs: 600000 });
  assert.equal(r.detectionRate, 1);
  assert.equal(r.falsePer10Min, 0);
  assert.equal(r.latency.mean, null);
});
