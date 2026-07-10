import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectPoly, PolyTracker, applyIgnores } from '../src/audio/detect/poly.js'
import { pianoTone, whiteNoise, mix, silence } from './signals.js'

const SR = 48000
const N = 4096
const midiF = (m) => 440 * 2 ** ((m - 69) / 12)
const tone = (m, len = N, amp = 0.3) => pianoTone(midiF(m), SR, len, amp, { decay: 0.99995 })
const midisOf = (r) => r.map((x) => x.midi).sort((a, b) => a - b)

test('detectPoly: dyads, triads and held-bass mixtures', () => {
  assert.deepEqual(midisOf(detectPoly(mix(tone(60), tone(64)), SR)), [60, 64])
  assert.deepEqual(midisOf(detectPoly(mix(tone(60), tone(64), tone(67)), SR)), [60, 64, 67])
  assert.deepEqual(midisOf(detectPoly(mix(tone(48), tone(55)), SR)), [48, 55])
  assert.deepEqual(midisOf(detectPoly(mix(tone(48), tone(64)), SR)), [48, 64])
})

test('detectPoly: a single note does not sprout phantom octaves', () => {
  assert.deepEqual(midisOf(detectPoly(tone(60), SR)), [60])
  assert.deepEqual(midisOf(detectPoly(tone(48), SR)), [48])
})

test('detectPoly: silence and noise return nothing', () => {
  assert.deepEqual(detectPoly(silence(N), SR), [])
  assert.deepEqual(detectPoly(whiteNoise(N, 0.05), SR), [])
})

test('applyIgnores thins sets by pitch class and demotes or drops them', () => {
  const set = { pitches: [48, 55, 64], source: 'mic', confidence: 0.8, timestamp: 9 }
  assert.equal(applyIgnores(set, new Set()), set)
  assert.deepEqual(applyIgnores(set, new Set([0])).pitches, [55, 64])
  assert.deepEqual(applyIgnores(set, new Set([0, 7])), { pitch: 64, source: 'mic', confidence: 0.8, timestamp: 9 })
  assert.equal(applyIgnores(set, new Set([0, 7, 4])), null)
  const single = { pitch: 60, source: 'mic', confidence: 1, timestamp: 1 }
  assert.equal(applyIgnores(single, new Set([0])), null)
  assert.equal(applyIgnores(single, new Set([5])), single)
})

/** Stream a buffer through the tracker the way the capture worklet delivers it. */
function stream(tracker, samples) {
  const events = []
  for (let start = 0; start + 2048 <= samples.length; start += 1024) {
    const e = tracker.feed(samples.subarray(start, start + 2048), ((start + 2048) / SR) * 1000)
    if (e) events.push(e)
  }
  return events
}

test('PolyTracker: one chord strike emits exactly one NoteSetEvent', () => {
  const buf = new Float32Array(SR)
  const chord = mix(tone(60, SR * 0.6), tone(64, SR * 0.6), tone(67, SR * 0.6))
  buf.set(chord, Math.floor(SR * 0.2))
  const events = stream(new PolyTracker({ sampleRate: SR }), buf)
  assert.equal(events.length, 1)
  assert.deepEqual(events[0].pitches, [60, 64, 67])
  assert.equal(events[0].source, 'mic')
  assert.ok(events[0].confidence > 0 && events[0].confidence <= 1)
})

test('PolyTracker: melody over a ringing bass, octave included', () => {
  const buf = new Float32Array(SR * 3)
  buf.set(tone(48, SR * 2.8, 0.35), 0)
  // C4 over ringing C3 is the octave-masked case the delta spectrum covers
  for (const [m, atS] of [[60, 0.7], [62, 1.4], [64, 2.1]]) {
    const t = tone(m, SR * 0.5)
    const at = Math.floor(SR * atS)
    for (let i = 0; i < t.length; i++) buf[at + i] += t[i]
  }
  const events = stream(new PolyTracker({ sampleRate: SR }), buf)
  assert.deepEqual(events.map((e) => e.pitch ?? e.pitches), [48, 60, 62, 64])
  const c4 = events[1]
  assert.equal(c4.pitch, 60)
  assert.ok(c4.timestamp - 700 < 300, `latency ${c4.timestamp - 700}ms`)
})

test('PolyTracker: sustained ring and silence stay silent', () => {
  const buf = new Float32Array(SR * 2)
  buf.set(mix(tone(60, SR * 1.8), tone(64, SR * 1.8)), Math.floor(SR * 0.1))
  const events = stream(new PolyTracker({ sampleRate: SR }), buf)
  assert.equal(events.length, 1)
  const quiet = stream(new PolyTracker({ sampleRate: SR }), whiteNoise(SR * 2, 0.05))
  assert.equal(quiet.length, 0)
})
