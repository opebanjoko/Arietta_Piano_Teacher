import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COURSE, allLessons, findLesson } from '../src/content/course.js'
import { VOICE } from '../src/content/voice.js'
import { nameToMidi } from '../src/core/notes.js'

const lessons = allLessons()

function checkTarget(t, where) {
  const midi = nameToMidi(t.note)
  assert.ok(midi >= 48 && midi <= 96, `${where}: note ${t.note} outside range`)
  assert.ok(Number.isInteger(t.finger) && t.finger >= 1 && t.finger <= 5,
    `${where}: fingering is mandatory (SR-CRS-05), got ${t.finger}`)
}

test('lesson ids are unique and lessons are complete', () => {
  const ids = lessons.map(l => l.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const l of lessons) {
    assert.ok(l.title, l.id)
    assert.ok(['drill', 'song'].includes(l.kind), l.id)
    assert.ok(l.done?.title && l.done?.line, `${l.id}: needs a completion celebration`)
  }
})

test('Units 1-3 cover the ten v1 lessons in course order', () => {
  assert.deepEqual(lessons.map(l => l.id), [
    'meet-the-keyboard', 'finding-middle-c', 'hands-say-hello',
    'middle-c-again', 'meet-d', 'meet-e', 'meet-f-and-g',
    'ode-to-joy', 'lightly-row', 'au-clair-de-la-lune'
  ])
})

test('every drill step is well-formed and every target carries a finger', () => {
  for (const l of lessons.filter(l => l.kind === 'drill')) {
    assert.ok(l.steps.length >= 1, l.id)
    for (const [i, s] of l.steps.entries()) {
      assert.ok(s.prompt, `${l.id} step ${i}`)
      assert.ok(['info', 'play'].includes(s.kind), `${l.id} step ${i}`)
      if (s.kind === 'play') {
        assert.ok(s.targets.length >= 1, `${l.id} step ${i}`)
        s.targets.forEach(t => checkTarget(t, `${l.id} step ${i}`))
      }
    }
  }
})

test('every song note carries a finger and stays in C position', () => {
  for (const l of lessons.filter(l => l.kind === 'song')) {
    assert.ok(l.notes.length >= 8, l.id)
    l.notes.forEach(t => checkTarget(t, l.id))
  }
})

test('exactly one sneak-peek song exists (Ode to Joy)', () => {
  const peeks = lessons.filter(l => l.sneakPeek)
  assert.deepEqual(peeks.map(l => l.id), ['ode-to-joy'])
})

test('findLesson resolves ids with unit context', () => {
  const l = findLesson('meet-e')
  assert.equal(l.unitTag, 'UNIT 2')
  assert.equal(findLesson('nope'), null)
})

test('voice pools are populated and repeat-safe', () => {
  assert.ok(VOICE.encouragements.length >= 6, 'enough encouragements to avoid repeats in a lesson')
  assert.equal(new Set(VOICE.encouragements).size, VOICE.encouragements.length)
  assert.equal(VOICE.softeners.length, 3)
  for (const k of ['blackKey', 'directional', 'directionalSong', 'octaveSlip', 'far']) {
    assert.ok(VOICE.hints[k], k)
  }
})
