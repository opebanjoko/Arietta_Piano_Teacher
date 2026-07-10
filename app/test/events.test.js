import { test } from 'node:test'
import assert from 'node:assert/strict'
import { noteEvent, noteSetEvent, eventPitches } from '../src/core/events.js'

test('noteEvent builds a SR-EVT-01 shaped event', () => {
  const e = noteEvent({ pitch: 60, source: 'tap', timestamp: 123 })
  assert.deepEqual(e, { pitch: 60, source: 'tap', confidence: 1, timestamp: 123 })
})

test('noteEvent keeps mic confidence and optional velocity', () => {
  const e = noteEvent({ pitch: 64, source: 'mic', confidence: 0.83, timestamp: 5, velocity: 0.4 })
  assert.equal(e.confidence, 0.83)
  assert.equal(e.velocity, 0.4)
})

test('noteEvent rejects pitches outside MIDI 48-96', () => {
  assert.throws(() => noteEvent({ pitch: 40, source: 'tap', timestamp: 0 }))
  assert.throws(() => noteEvent({ pitch: 97, source: 'tap', timestamp: 0 }))
})

test('noteSetEvent sorts, dedupes and range-checks pitches (SR-EVT-03)', () => {
  const e = noteSetEvent({ pitches: [67, 60, 64, 64], source: 'mic', timestamp: 5, confidence: 0.95 })
  assert.deepEqual(e, { pitches: [60, 64, 67], source: 'mic', confidence: 0.95, timestamp: 5 })
  assert.throws(() => noteSetEvent({ pitches: [60, 97], source: 'mic', timestamp: 1 }), RangeError)
  assert.throws(() => noteSetEvent({ pitches: [60], source: 'mic', timestamp: 1 }), RangeError)
})

test('eventPitches unifies both event shapes', () => {
  assert.deepEqual(eventPitches(noteEvent({ pitch: 60, source: 'tap', timestamp: 1 })), [60])
  assert.deepEqual(eventPitches(noteSetEvent({ pitches: [64, 60], source: 'mic', timestamp: 1 })), [60, 64])
})
