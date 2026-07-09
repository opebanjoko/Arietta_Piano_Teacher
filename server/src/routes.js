/**
 * Request handlers. Each takes ({ db, now }) deps and a plain request
 * ({ body, token }) and returns { status, body } — index.js does HTTP.
 */
import { randomUUID } from 'node:crypto'
import { hashPin, verifyPin, newCode, newToken, hashToken } from './auth.js'

const PIN_RE = /^\d{4,8}$/
const LOCK_AFTER = 5
const LOCK_MS = 15 * 60 * 1000
const attempts = new Map() // code -> { fails, until }

export function resetRateLimit() { attempts.clear() }

function limited(code, now) {
  const a = attempts.get(code)
  return a && a.fails >= LOCK_AFTER && now < a.until
}

function recordFail(code, now) {
  const a = attempts.get(code) ?? { fails: 0, until: 0 }
  a.fails += 1
  a.until = now + LOCK_MS
  attempts.set(code, a)
}

function issueToken(db, householdId, now) {
  const token = newToken()
  db.prepare(`INSERT INTO devices (token_hash, household_id, created_at) VALUES (?, ?, ?)`)
    .run(hashToken(token), householdId, now)
  return token
}

/** Bearer token -> household id, or null. Touches last_seen_at. */
export function household(db, token, now) {
  if (!token) return null
  const row = db.prepare(`SELECT household_id FROM devices WHERE token_hash = ?`).get(hashToken(token))
  if (!row) return null
  db.prepare(`UPDATE devices SET last_seen_at = ? WHERE token_hash = ?`).run(now, hashToken(token))
  return row.household_id
}

export function createHousehold({ db, now }, { body }) {
  if (!PIN_RE.test(String(body?.pin ?? ''))) return { status: 400, body: { error: 'pin must be 4 to 8 digits' } }
  const id = randomUUID()
  let code = newCode()
  while (db.prepare(`SELECT 1 FROM households WHERE code = ?`).get(code)) code = newCode()
  db.prepare(`INSERT INTO households (id, code, pin_hash, created_at) VALUES (?, ?, ?, ?)`)
    .run(id, code, hashPin(body.pin), now)
  return { status: 201, body: { code, token: issueToken(db, id, now) } }
}

export function linkHousehold({ db, now }, { body }) {
  const code = String(body?.code ?? '').toUpperCase()
  if (limited(code, now)) return { status: 429, body: { error: 'too many tries' } }
  const row = db.prepare(`SELECT id, pin_hash FROM households WHERE code = ?`).get(code)
  if (!row || !PIN_RE.test(String(body?.pin ?? '')) || !verifyPin(body.pin, row.pin_hash)) {
    recordFail(code, now)
    return { status: 401, body: { error: 'wrong code or pin' } }
  }
  attempts.delete(code)
  return { status: 200, body: { token: issueToken(db, row.id, now) } }
}
