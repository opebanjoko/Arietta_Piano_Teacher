import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hashPin, verifyPin, newCode, newToken, hashToken } from '../src/auth.js'

test('pin hashing round-trips and rejects wrong pins', () => {
  const h = hashPin('4321')
  assert.notEqual(h, '4321')
  assert.equal(verifyPin('4321', h), true)
  assert.equal(verifyPin('1234', h), false)
  assert.notEqual(hashPin('4321'), h) // salted
})

test('family code is 6 chars from the unambiguous alphabet', () => {
  const code = newCode()
  assert.match(code, /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/)
})

test('tokens are 48 hex chars and hash deterministically', () => {
  const t = newToken()
  assert.match(t, /^[0-9a-f]{48}$/)
  assert.equal(hashToken(t), hashToken(t))
  assert.notEqual(hashToken(t), t)
})
