import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  nameToMidi, midiToName, letter, pitchClass, isBlack, freq, whiteIndex
} from '../src/core/notes.js'

test('nameToMidi and midiToName round-trip the course range C3-C6', () => {
  assert.equal(nameToMidi('C4'), 60)
  assert.equal(nameToMidi('A4'), 69)
  assert.equal(nameToMidi('C3'), 48)
  assert.equal(nameToMidi('C6'), 84)
  assert.equal(nameToMidi('C#4'), 61)
  for (let m = 48; m <= 84; m++) assert.equal(nameToMidi(midiToName(m)), m)
})

test('letter gives the student-facing label without octave', () => {
  assert.equal(letter(60), 'C')
  assert.equal(letter(61), 'C#')
  assert.equal(letter(71), 'B')
})

test('pitchClass folds octaves', () => {
  assert.equal(pitchClass(60), pitchClass(72))
  assert.notEqual(pitchClass(60), pitchClass(62))
})

test('isBlack identifies the five black keys per octave', () => {
  const blacks = [61, 63, 66, 68, 70]
  for (let m = 60; m < 72; m++) assert.equal(isBlack(m), blacks.includes(m))
})

test('freq matches equal temperament, A4=440', () => {
  assert.equal(freq(69), 440)
  assert.ok(Math.abs(freq(60) - 261.63) < 0.01)
  assert.ok(Math.abs(freq(48) - 130.81) < 0.01)
})

test('whiteIndex counts white keys so hint distances work across octaves', () => {
  assert.equal(whiteIndex(62) - whiteIndex(60), 1)   // C4 -> D4: one key
  assert.equal(whiteIndex(67) - whiteIndex(60), 4)   // C4 -> G4: four keys
  assert.equal(whiteIndex(72) - whiteIndex(60), 7)   // C4 -> C5: seven keys
  assert.equal(whiteIndex(61), null)                 // black keys have no white index
})
