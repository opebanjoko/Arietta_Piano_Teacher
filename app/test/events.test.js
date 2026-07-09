import { test } from 'node:test'
import assert from 'node:assert/strict'
import { noteEvent } from '../src/core/events.js'

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
