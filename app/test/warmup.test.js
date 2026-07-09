import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickWarmup } from '../src/core/engine.js'
import { allLessons } from '../src/content/course.js'

const lessons = allLessons()
const rec = (completed, lastPlayedAt) => ({ completed, lastPlayedAt })

test('no warm-up before the student reaches Unit 2 (SR-CRS-06)', () => {
  assert.equal(pickWarmup(lessons, new Map()), null)
  const partial = new Map([['meet-the-keyboard', rec(true, 10)]])
  assert.equal(pickWarmup(lessons, partial), null)
})

test('once Unit 1 is complete, the oldest-played completed item is offered', () => {
  const progress = new Map([
    ['meet-the-keyboard', rec(true, 300)],
    ['finding-middle-c', rec(true, 100)],
    ['hands-say-hello', rec(true, 200)]
  ])
  assert.equal(pickWarmup(lessons, progress).id, 'finding-middle-c')
})

test('replaying an item sends it to the back of the queue', () => {
  const progress = new Map([
    ['meet-the-keyboard', rec(true, 300)],
    ['finding-middle-c', rec(true, 999)],
    ['hands-say-hello', rec(true, 200)],
    ['middle-c-again', rec(true, 150)]
  ])
  assert.equal(pickWarmup(lessons, progress).id, 'middle-c-again')
})

test('songs count as warm-up material too', () => {
  const progress = new Map(lessons.map((l, i) => [l.id, rec(true, l.id === 'ode-to-joy' ? 1 : 100 + i)]))
  assert.equal(pickWarmup(lessons, progress).id, 'ode-to-joy')
})
