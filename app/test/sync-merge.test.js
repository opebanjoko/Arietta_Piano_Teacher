import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeDocs, mergeLessonEntry, emptyDoc } from '../src/sync/merge.js'

const doc = (over = {}) => ({
  profileId: 'p1', name: 'Maya', createdAt: 100,
  lessons: {}, settings: {}, updatedAt: 100, ...over
})

test('completed beats in-progress regardless of order', () => {
  const a = { completed: true, lastPlayedAt: 10 }
  const b = { stepIndex: 4, lastPlayedAt: 20 }
  for (const [x, y] of [[a, b], [b, a]]) {
    const m = mergeLessonEntry(x, y)
    assert.equal(m.completed, true)
    assert.equal(m.stepIndex, undefined) // completed lessons carry no resume point
    assert.equal(m.lastPlayedAt, 20)
  }
})

test('within in-progress the higher stepIndex wins', () => {
  const m = mergeLessonEntry({ stepIndex: 2 }, { stepIndex: 5 })
  assert.equal(m.completed, false)
  assert.equal(m.stepIndex, 5)
})

test('bestCount keeps the max across states', () => {
  const m = mergeLessonEntry({ completed: true, bestCount: 9 }, { completed: true, bestCount: 14 })
  assert.equal(m.bestCount, 14)
})

test('untouched (missing) side never regresses the other', () => {
  const m = mergeLessonEntry(undefined, { completed: true, bestCount: 7, lastPlayedAt: 5 })
  assert.deepEqual(m, { completed: true, bestCount: 7, lastPlayedAt: 5 })
})

test('mergeDocs is commutative and idempotent', () => {
  const a = doc({ lessons: { l1: { completed: true, lastPlayedAt: 30 } }, settings: { accent: '#B7813A' }, updatedAt: 200 })
  const b = doc({ lessons: { l1: { stepIndex: 3 }, l2: { stepIndex: 1, lastPlayedAt: 40 } }, settings: { accent: '#6F8C5A' }, updatedAt: 300 })
  const ab = mergeDocs(a, b)
  const ba = mergeDocs(b, a)
  assert.deepEqual(ab, ba)
  assert.deepEqual(mergeDocs(ab, ab), ab)
  assert.equal(ab.settings.accent, '#6F8C5A') // newer updatedAt wins settings
  assert.equal(ab.lessons.l1.completed, true)
  assert.equal(ab.lessons.l2.stepIndex, 1)
  assert.equal(ab.updatedAt, 300)
})

test('mergeDocs tolerates null/missing sides and fields', () => {
  const b = doc()
  assert.deepEqual(mergeDocs(null, b), b)
  assert.deepEqual(mergeDocs(b, undefined), b)
  const m = mergeDocs(doc({ lessons: undefined, settings: undefined }), b)
  assert.deepEqual(m.lessons, {})
})

test('emptyDoc builds a doc from a profile', () => {
  const d = emptyDoc({ id: 'p9', name: 'Sam', createdAt: 50 })
  assert.deepEqual(d, { profileId: 'p9', name: 'Sam', createdAt: 50, lessons: {}, settings: {}, updatedAt: 0 })
})
