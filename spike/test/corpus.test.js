import test from 'node:test';
import assert from 'node:assert/strict';
import { noteNameToMidi, midiToNoteName, scoreClips } from '../lib/corpus.js';

test('noteNameToMidi parses course-range names', () => {
  assert.equal(noteNameToMidi('C4'), 60);
  assert.equal(noteNameToMidi('C3'), 48);
  assert.equal(noteNameToMidi('C6'), 84);
  assert.equal(noteNameToMidi('F#3'), 54);
  assert.equal(noteNameToMidi('Bb4'), 70);
  assert.equal(noteNameToMidi('nonsense'), null);
});

test('midiToNoteName round-trips', () => {
  assert.equal(midiToNoteName(60), 'C4');
  assert.equal(midiToNoteName(54), 'F#3');
  assert.equal(midiToNoteName(69), 'A4');
});

const ev = (pitch) => ({ pitch, source: 'mic', confidence: 0.95, timestamp: 500 });

test('scoreClips: all note clips detected, quiet noise clips, gate passes', () => {
  const clips = [
    { name: 'upright-C4-50cm', expectedMidi: 60, durationMs: 2000, events: [ev(60)] },
    { name: 'upright-E4-50cm', expectedMidi: 64, durationMs: 2000, events: [ev(64)] },
    { name: 'noise-speech', expectedMidi: null, durationMs: 60000, events: [] },
  ];
  const r = scoreClips(clips);
  assert.equal(r.noteClips, 2);
  assert.equal(r.detected, 2);
  assert.equal(r.detectionRate, 1);
  assert.equal(r.falseEvents, 0);
  assert.equal(r.falsePer10Min, 0);
  assert.equal(r.pass, true);
});

test('scoreClips: wrong pitch is a miss and a false event', () => {
  const clips = [{ name: 'x-C4', expectedMidi: 60, durationMs: 2000, events: [ev(62)] }];
  const r = scoreClips(clips);
  assert.equal(r.detected, 0);
  assert.equal(r.falseEvents, 1);
  assert.equal(r.pass, false);
});

test('scoreClips: double-counted note is detected but adds a false event', () => {
  const clips = [{ name: 'x-C4', expectedMidi: 60, durationMs: 2000, events: [ev(60), ev(60)] }];
  const r = scoreClips(clips);
  assert.equal(r.detected, 1);
  assert.equal(r.falseEvents, 1);
});

test('scoreClips: events during noise clips are false events normalized over total duration', () => {
  const clips = [
    { name: 'noise-tv', expectedMidi: null, durationMs: 240000, events: [ev(60)] },
    { name: 'noise-speech', expectedMidi: null, durationMs: 60000, events: [] },
  ];
  const r = scoreClips(clips);
  assert.equal(r.falseEvents, 1);
  assert.equal(r.falsePer10Min, 2); // 1 false event in 5 total minutes
  assert.equal(r.pass, false);
});

test('scoreClips: empty corpus passes vacuously with zero rates', () => {
  const r = scoreClips([]);
  assert.equal(r.detectionRate, 1);
  assert.equal(r.falsePer10Min, 0);
});
