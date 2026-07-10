/**
 * The Phase 6 polyphony mini-spike gate (PLAN.md: "same fail-fast discipline"
 * as Phase 0). Synthetic suites for SR-AUD-10 stages a-c plus the noise floor
 * and latency bounds. A pass here is a PROVISIONAL Go: human piano validation
 * follows spike/POLY_GATE_RUNBOOK.md and remains a release blocker.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPerformance, processBufferPoly } from '../lib/pipeline.js';
import { scoreSets } from '../lib/score.js';
import { whiteNoise } from '../lib/signals.js';

const SR = 48000;
const PICKERS = ['sieve', 'salience'];

function run(notes, picker) {
  const { samples, truth } = renderPerformance(notes, SR);
  const { events, durationMs } = processBufferPoly(samples, SR, { picker });
  return { result: scoreSets(events, truth, { durationMs }), truth, events };
}

function report(name, picker, r) {
  console.log(
    `gate ${name} ${picker}: detection=${r.detectionRate.toFixed(2)} ` +
      `false/10min=${r.falsePer10Min.toFixed(1)} latency=${r.latency.mean === null ? '-' : Math.round(r.latency.mean)}ms`
  );
}

// Stage a: 20 dyads, intervals 3-10 semitones, roots C3-B3, 900 ms apart.
// Simultaneous unison/octave doubles are excluded: one magnitude spectrum
// cannot separate them (recorded content-authoring constraint; sequential
// octaves over a ringing note ARE covered, by the held-bass suite).
const INTERVALS = [3, 4, 5, 7, 8, 9, 10];
const dyads = Array.from({ length: 20 }, (_, i) => ({
  midis: [48 + (i % 12), 48 + (i % 12) + INTERVALS[i % INTERVALS.length]],
  atMs: i * 900,
  durMs: 700,
}));

// Stage a: melody over a held bass. C4 over ringing C3 is the octave-masked
// case the delta spectrum exists for.
const heldBass = [
  { midis: [48], atMs: 0, durMs: 4200 },
  ...[60, 62, 64, 65, 67].map((m, i) => ({ midis: [m], atMs: 700 + i * 700, durMs: 600 })),
];

// Stage b: C/F/G major root-position triads across C3-C5.
const TRIADS = [
  [48, 52, 55],
  [53, 57, 60],
  [55, 59, 62],
  [60, 64, 67],
  [65, 69, 72],
];
const triads = Array.from({ length: 12 }, (_, i) => ({
  midis: TRIADS[i % TRIADS.length],
  atMs: i * 900,
  durMs: 700,
}));

// Stage c: left-hand triad held under a right-hand melody (no octave doubles
// against the ringing chord - the recorded content constraint).
const handsTogether = [
  { midis: [48, 52, 55], atMs: 0, durMs: 4200 },
  ...[62, 65, 69, 65, 62].map((m, i) => ({ midis: [m], atMs: 700 + i * 700, durMs: 600 })),
];

for (const picker of PICKERS) {
  test(`gate/${picker}: stage a - dyads`, () => {
    const { result } = run(dyads, picker);
    report('dyads', picker, result);
    assert.ok(result.pass, JSON.stringify(result));
  });

  test(`gate/${picker}: stage a - melody over held bass (octave masked)`, () => {
    const { result } = run(heldBass, picker);
    report('held-bass', picker, result);
    assert.ok(result.pass, JSON.stringify(result));
  });

  test(`gate/${picker}: stage b - triads`, () => {
    const { result } = run(triads, picker);
    report('triads', picker, result);
    assert.ok(result.pass, JSON.stringify(result));
  });

  test(`gate/${picker}: stage c - hands together`, () => {
    const { result } = run(handsTogether, picker);
    report('hands', picker, result);
    assert.ok(result.pass, JSON.stringify(result));
  });

  test(`gate/${picker}: 60s noise floor stays silent`, () => {
    const samples = whiteNoise(60 * SR, 0.05, 7);
    const { events, durationMs } = processBufferPoly(samples, SR, { picker });
    const result = scoreSets(events, [], { durationMs });
    report('noise', picker, result);
    assert.ok(result.falsePer10Min <= 1, `false/10min ${result.falsePer10Min}`);
  });

  test(`gate/${picker}: latency within budget on triads`, () => {
    const { result } = run(triads, picker);
    assert.ok(result.latency.mean <= 150, `mean ${result.latency.mean}`);
    assert.ok(result.latency.p95 <= 250, `p95 ${result.latency.p95}`);
  });
}
