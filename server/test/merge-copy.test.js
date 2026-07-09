import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('server/merge.js is byte-identical to app/src/sync/merge.js', () => {
  const a = readFileSync(new URL('../../app/src/sync/merge.js', import.meta.url), 'utf8')
  const b = readFileSync(new URL('../merge.js', import.meta.url), 'utf8')
  assert.equal(b, a, 'run: cp app/src/sync/merge.js server/merge.js')
})
