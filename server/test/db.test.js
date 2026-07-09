import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openDb } from '../src/db.js'

test('schema creates the three tables and cascades deletes', () => {
  const db = openDb(':memory:')
  db.prepare(`INSERT INTO households (id, code, pin_hash, created_at) VALUES ('h1', 'ABCDEF', 'x', 1)`).run()
  db.prepare(`INSERT INTO devices (token_hash, household_id, created_at) VALUES ('t1', 'h1', 1)`).run()
  db.prepare(`INSERT INTO progress_docs (household_id, profile_id, doc, updated_at) VALUES ('h1', 'p1', '{}', 1)`).run()
  db.prepare(`DELETE FROM households WHERE id = 'h1'`).run()
  assert.equal(db.prepare(`SELECT COUNT(*) n FROM devices`).get().n, 0)
  assert.equal(db.prepare(`SELECT COUNT(*) n FROM progress_docs`).get().n, 0)
})
