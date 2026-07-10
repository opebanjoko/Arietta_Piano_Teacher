import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMidiInput } from '../src/audio/midi.js'

function fakeAccess(portCount = 1) {
  const ports = Array.from({ length: portCount }, (_, i) => ({ id: `p${i}`, onmidimessage: null }))
  const access = { inputs: new Map(ports.map(p => [p.id, p])), onstatechange: null }
  return { access, ports }
}

test('NoteOn normalizes to a midi NoteEvent with 0..1 velocity (SR-MID-01)', async () => {
  const { access, ports } = fakeAccess()
  const events = []
  const midi = await createMidiInput({ onNote: e => events.push(e), midiAccess: access })
  ports[0].onmidimessage({ data: new Uint8Array([0x90, 60, 100]) })
  assert.equal(events.length, 1)
  assert.equal(events[0].pitch, 60)
  assert.equal(events[0].source, 'midi')
  assert.ok(Math.abs(events[0].velocity - 100 / 127) < 1e-9)
  assert.ok(typeof events[0].timestamp === 'number')
  midi.stop()
})

test('NoteOff, zero-velocity NoteOn and out-of-range pitches are ignored', async () => {
  const { access, ports } = fakeAccess()
  const events = []
  await createMidiInput({ onNote: e => events.push(e), midiAccess: access })
  ports[0].onmidimessage({ data: new Uint8Array([0x80, 60, 64]) })   // NoteOff
  ports[0].onmidimessage({ data: new Uint8Array([0x90, 60, 0]) })    // NoteOn vel 0 = off
  ports[0].onmidimessage({ data: new Uint8Array([0x90, 30, 90]) })   // below MIDI 48
  ports[0].onmidimessage({ data: new Uint8Array([0xB0, 64, 127]) })  // control change
  assert.equal(events.length, 0)
  ports[0].onmidimessage({ data: new Uint8Array([0x93, 72, 64]) })   // NoteOn, channel 4
  assert.equal(events.length, 1)
})

test('statechange rewires ports and reports the device count', async () => {
  const { access, ports } = fakeAccess(1)
  const counts = []
  const events = []
  const midi = await createMidiInput({ onNote: e => events.push(e), onDevices: n => counts.push(n), midiAccess: access })
  assert.deepEqual(counts, [1])
  const late = { id: 'p9', onmidimessage: null }
  access.inputs.set('p9', late)
  access.onstatechange()
  assert.deepEqual(counts, [1, 2])
  late.onmidimessage({ data: new Uint8Array([0x90, 64, 80]) })
  assert.equal(events.length, 1)
  midi.stop()
  ports[0].onmidimessage?.({ data: new Uint8Array([0x90, 65, 80]) })
  assert.equal(events.length, 1, 'stopped adapter must not emit')
})

test('absent Web MIDI (iPad Safari) resolves to null, never throws (SR-MID-02)', async () => {
  assert.equal(await createMidiInput({ onNote: () => {}, midiAccess: null }), null)
})
