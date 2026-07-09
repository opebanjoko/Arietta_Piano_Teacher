import { test } from 'node:test'
import assert from 'node:assert/strict'
import { logDiag, listDiag, clearDiag, DIAG_CAP } from '../src/store/diag.js'

/** Same in-memory fake as progress.test.js, app store only. */
function memDb() {
  const app = new Map()
  return {
    get: async (_s, k) => app.get(k),
    put: async (_s, v) => { app.set(v.key, structuredClone(v)) }
  }
}

test('logDiag appends timestamped entries; listDiag returns them in order', async () => {
  const db = memDb()
  await logDiag(db, 'boot', 'ua-string', 100)
  await logDiag(db, 'mic-interrupted', '', 200)
  const entries = await listDiag(db)
  assert.deepEqual(entries, [
    { t: 100, kind: 'boot', detail: 'ua-string' },
    { t: 200, kind: 'mic-interrupted', detail: '' }
  ])
})

test('log is capped: oldest entries drop past DIAG_CAP', async () => {
  const db = memDb()
  for (let i = 0; i < DIAG_CAP + 5; i++) await logDiag(db, 'error', `e${i}`, i)
  const entries = await listDiag(db)
  assert.equal(entries.length, DIAG_CAP)
  assert.equal(entries[0].detail, 'e5')
  assert.equal(entries.at(-1).detail, `e${DIAG_CAP + 4}`)
})

test('detail is coerced to string and truncated to 300 chars', async () => {
  const db = memDb()
  await logDiag(db, 'error', { message: 'boom' }, 1)
  await logDiag(db, 'error', 'x'.repeat(500), 2)
  const entries = await listDiag(db)
  assert.equal(typeof entries[0].detail, 'string')
  assert.equal(entries[1].detail.length, 300)
})

test('concurrent un-awaited logDiag calls all land (no lost update)', async () => {
  const db = memDb()
  await Promise.all([
    logDiag(db, 'error', 'first', 1),
    logDiag(db, 'error', 'second', 2),
    logDiag(db, 'error', 'third', 3)
  ])
  const entries = await listDiag(db)
  assert.deepEqual(entries.map(e => e.detail), ['first', 'second', 'third'])
})

test('clearDiag empties the log; listDiag on a fresh db is []', async () => {
  const db = memDb()
  assert.deepEqual(await listDiag(db), [])
  await logDiag(db, 'boot', '', 1)
  await clearDiag(db)
  assert.deepEqual(await listDiag(db), [])
})
