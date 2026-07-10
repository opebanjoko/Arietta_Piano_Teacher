import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startDrill, drillNote, startSong, songNote } from '../src/core/engine.js'
import { noteEvent, noteSetEvent } from '../src/core/events.js'
import { nameToMidi } from '../src/core/notes.js'

const tap = (name, timestamp = 0) =>
  noteEvent({ pitch: nameToMidi(name), source: 'tap', timestamp })
const set = (names, timestamp = 0) =>
  noteSetEvent({ pitches: names.map(nameToMidi), source: 'mic', timestamp })

const chordLesson = {
  id: 'chord-l', title: 'Chords', kind: 'drill',
  steps: [
    {
      kind: 'play', prompt: 'Play the chord.', sub: '',
      targets: [{ notes: ['C4', 'E4', 'G4'], fingers: [1, 3, 5] }]
    }
  ]
}

test('a chord lands note by note within the gather window', () => {
  let s = startDrill(chordLesson)
  s = drillNote(s, chordLesson, tap('C4', 0))
  assert.equal(s.phase, 'working')
  assert.equal(s.feedback, null)
  s = drillNote(s, chordLesson, tap('E4', 400))
  assert.equal(s.phase, 'working')
  s = drillNote(s, chordLesson, tap('G4', 900))
  assert.equal(s.phase, 'stepdone')
  assert.equal(s.feedback.kind, 'good')
})

test('a NoteSetEvent lands the whole chord at once', () => {
  let s = startDrill(chordLesson)
  s = drillNote(s, chordLesson, set(['C4', 'E4', 'G4'], 10))
  assert.equal(s.phase, 'stepdone')
})

test('mixed sources: a dyad set then the missing single note', () => {
  let s = startDrill(chordLesson)
  s = drillNote(s, chordLesson, set(['C4', 'E4'], 0))
  assert.equal(s.phase, 'working')
  s = drillNote(s, chordLesson, tap('G4', 500))
  assert.equal(s.phase, 'stepdone')
})

test('a wrong note gets a chord hint naming the stray and resets the gather', () => {
  let s = startDrill(chordLesson)
  s = drillNote(s, chordLesson, tap('C4', 0))
  s = drillNote(s, chordLesson, tap('D4', 300))
  assert.equal(s.misses, 1)
  assert.equal(s.feedback.kind, 'hint')
  assert.ok(s.feedback.text.includes('D'), s.feedback.text)
  // gather was reset: C4 must be struck again
  s = drillNote(s, chordLesson, tap('E4', 600))
  s = drillNote(s, chordLesson, tap('G4', 900))
  assert.equal(s.phase, 'working')
  s = drillNote(s, chordLesson, tap('C4', 1200))
  assert.equal(s.phase, 'stepdone')
})

test('re-striking a gathered note nudges toward what is missing, not a miss', () => {
  let s = startDrill(chordLesson)
  s = drillNote(s, chordLesson, tap('C4', 0))
  s = drillNote(s, chordLesson, tap('C4', 400))
  assert.equal(s.misses, 0)
  assert.equal(s.feedback.kind, 'hint')
  assert.ok(s.feedback.text.includes('E') && s.feedback.text.includes('G'), s.feedback.text)
  s = drillNote(s, chordLesson, tap('E4', 800))
  s = drillNote(s, chordLesson, tap('G4', 1200))
  assert.equal(s.phase, 'stepdone')
})

test('the gather window expires: a late note starts a fresh gather, silently', () => {
  let s = startDrill(chordLesson)
  s = drillNote(s, chordLesson, tap('C4', 0))
  s = drillNote(s, chordLesson, tap('E4', 3000))
  assert.equal(s.misses, 0)
  assert.equal(s.phase, 'working')
  // E4 alone is gathered now; C4 and G4 complete it
  s = drillNote(s, chordLesson, tap('C4', 3400))
  s = drillNote(s, chordLesson, tap('G4', 3800))
  assert.equal(s.phase, 'stepdone')
})

const togetherSong = {
  id: 'together', title: 'Together', kind: 'song',
  notes: [
    { notes: ['C3', 'C4'], fingers: [5, 1] },
    { note: 'D4', finger: 2 },
    { note: 'E4', finger: 3 }
  ]
}

test('song chord entries are exact-midi: the octave matters for hands together', () => {
  let s = startSong(togetherSong)
  // C4+C5 must not satisfy the C3+C4 chord
  s = songNote(s, togetherSong, set(['C4', 'C5'], 0))
  assert.equal(s.misses, 1)
  assert.ok(s.hint, 'expected a hint')
  s = songNote(s, togetherSong, set(['C3', 'C4'], 500))
  assert.equal(s.pos, 1)
  // single notes still match by pitch class so the music keeps flowing
  s = songNote(s, togetherSong, tap('D5', 900))
  assert.equal(s.pos, 2)
  s = songNote(s, togetherSong, tap('E4', 1300))
  assert.equal(s.done, true)
})
