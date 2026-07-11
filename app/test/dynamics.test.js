import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startDrill, drillNote, setlistCandidates } from '../src/core/engine.js'
import { noteEvent } from '../src/core/events.js'
import { nameToMidi } from '../src/core/notes.js'

const ev = (name, velocity, timestamp = 0) =>
  noteEvent({ pitch: nameToMidi(name), source: 'mic', timestamp, velocity })
const tap = (name, timestamp = 0) =>
  noteEvent({ pitch: nameToMidi(name), source: 'tap', timestamp })

const lesson = {
  id: 'dyn', title: 'Dynamics', kind: 'drill',
  steps: [
    { kind: 'dynamics', mode: 'soft', prompt: 'Like a mouse.', sub: '', targets: [{ note: 'C4', finger: 1 }] },
    { kind: 'dynamics', mode: 'loud', prompt: 'Like a lion.', sub: '', targets: [{ note: 'C4', finger: 1 }] }
  ]
}

test('a soft note passes a soft step; a loud one gets a words-only nudge', () => {
  let s = startDrill(lesson)
  s = drillNote(s, lesson, ev('C4', 0.9))
  assert.equal(s.phase, 'working', 'loud playing must not pass the mouse step')
  assert.equal(s.feedback.kind, 'hint')
  assert.ok(!/\d/.test(s.feedback.text), 'no numbers in dynamics feedback')
  assert.equal(s.misses, 0, 'a dynamics nudge is not a wrong note')
  s = drillNote(s, lesson, ev('C4', 0.15, 500))
  assert.equal(s.phase, 'stepdone')
  assert.equal(s.feedback.kind, 'good')
})

test('the wrong pitch still gets a pitch hint on dynamics steps', () => {
  let s = startDrill(lesson)
  s = drillNote(s, lesson, ev('D4', 0.1))
  assert.equal(s.misses, 1)
  assert.equal(s.feedback.kind, 'hint')
})

test('tap events carry no velocity and pass on pitch alone (SR-AUD-12 fallback)', () => {
  let s = startDrill(lesson)
  s = drillNote(s, lesson, tap('C4'))
  assert.equal(s.phase, 'stepdone')
})

test('setlistCandidates prefers completed songs, falls back to the whole list', () => {
  const lessons = [
    { id: 'a', kind: 'song' }, { id: 'b', kind: 'song' }, { id: 'c', kind: 'song' }, { id: 'd', kind: 'song' }
  ]
  const setlist = { id: 's', kind: 'setlist', pick: 3, from: ['a', 'b', 'c', 'd'] }
  const enough = setlistCandidates(setlist, lessons, new Set(['a', 'b', 'c']))
  assert.deepEqual(enough.map(l => l.id), ['a', 'b', 'c'])
  const fallback = setlistCandidates(setlist, lessons, new Set(['a']))
  assert.deepEqual(fallback.map(l => l.id), ['a', 'b', 'c', 'd'])
})
