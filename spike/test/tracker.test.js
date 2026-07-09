import test from 'node:test';
import assert from 'node:assert/strict';
import { NoteTracker } from '../lib/tracker.js';
import { midiToFreq } from '../lib/pitch.js';

/** Feed a sequence of per-frame detections; collect emitted NoteEvents. */
function run(tracker, frames) {
  const events = [];
  for (const [i, f] of frames.entries()) {
    const e = tracker.feed(f.det, f.rms, i * 23); // ~23 ms hop
    if (e) events.push(e);
  }
  return events;
}

const det = (midi, clarity = 0.95) => ({ freq: midiToFreq(midi), clarity });
const NOTE = (midi, n, rms = 0.1) => Array.from({ length: n }, () => ({ det: det(midi), rms }));
const QUIET = (n) => Array.from({ length: n }, () => ({ det: null, rms: 0.001 }));

test('sustained note emits exactly one NoteEvent with SR-EVT-01 shape', () => {
  const events = run(new NoteTracker(), [...NOTE(64, 10)]);
  assert.equal(events.length, 1);
  const e = events[0];
  assert.equal(e.pitch, 64);
  assert.equal(e.source, 'mic');
  assert.ok(e.confidence >= 0.9 && e.confidence <= 1);
  assert.equal(typeof e.timestamp, 'number');
});

test('event timestamp is the first frame of the stable run', () => {
  const events = run(new NoteTracker(), [...QUIET(4), ...NOTE(60, 6)]);
  assert.equal(events.length, 1);
  assert.equal(events[0].timestamp, 4 * 23);
});

test('low-clarity frames emit nothing (silence over guessing, SR-AUD-05)', () => {
  const frames = Array.from({ length: 20 }, () => ({ det: det(60, 0.5), rms: 0.1 }));
  assert.equal(run(new NoteTracker(), frames).length, 0);
});

test('no-detection frames emit nothing', () => {
  assert.equal(run(new NoteTracker(), QUIET(20)).length, 0);
});

test('a single spurious frame of another pitch mid-note is ignored', () => {
  const frames = [...NOTE(64, 5), { det: det(71), rms: 0.1 }, ...NOTE(64, 5)];
  const events = run(new NoteTracker(), frames);
  assert.equal(events.length, 1);
  assert.equal(events[0].pitch, 64);
});

test('two strikes separated by silence emit two events (SR-AUD-06)', () => {
  const events = run(new NoteTracker(), [...NOTE(60, 8), ...QUIET(4), ...NOTE(60, 8)]);
  assert.equal(events.length, 2);
});

test('legato pitch change emits a second event without silence between', () => {
  const events = run(new NoteTracker(), [...NOTE(60, 8), ...NOTE(62, 8)]);
  assert.deepEqual(events.map((e) => e.pitch), [60, 62]);
});

test('re-striking the same ringing key emits a second event on RMS re-attack', () => {
  const decaying = Array.from({ length: 10 }, (_, i) => ({ det: det(60), rms: 0.2 * 0.85 ** i }));
  const restruck = Array.from({ length: 6 }, (_, i) => ({ det: det(60), rms: 0.25 * 0.9 ** i }));
  const events = run(new NoteTracker(), [...decaying, ...restruck]);
  assert.equal(events.length, 2);
  assert.equal(events[1].pitch, 60);
});

test('a ringing note decaying smoothly never re-emits', () => {
  const frames = Array.from({ length: 40 }, (_, i) => ({ det: det(60), rms: 0.2 * 0.9 ** i }));
  assert.equal(run(new NoteTracker(), frames).length, 1);
});
