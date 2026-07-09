/**
 * Request handlers. Each takes ({ db, now }) deps and a plain request
 * ({ body, token }) and returns { status, body } — index.js does HTTP.
 */
import { randomUUID } from 'node:crypto'
import { hashPin, verifyPin, newCode, newToken, hashToken } from './auth.js'
import { mergeDocs } from '../merge.js'

const PIN_RE = /^\d{4,8}$/
const CODE_RE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/
const LOCK_AFTER = 5
const LOCK_MS = 15 * 60 * 1000
const DEFAULT_MAX_ATTEMPT_ENTRIES = 10000
let maxAttemptEntries = DEFAULT_MAX_ATTEMPT_ENTRIES
const attempts = new Map() // code -> { fails, until }
// fixed scrypt target for unknown codes, so a lookup miss costs the same as a real check
const DUMMY_PIN_HASH = hashPin('000000')

/** Clears rate-limit state; tests may pass a small max to exercise cap eviction. */
export function resetRateLimit(max = DEFAULT_MAX_ATTEMPT_ENTRIES) {
  attempts.clear()
  maxAttemptEntries = max
}

function limited(code, now) {
  const a = attempts.get(code)
  return a && a.fails >= LOCK_AFTER && now < a.until
}

// only scans when at the cap: drop expired entries, then evict oldest not-yet-locked
// entries. Never evicts an active lockout — the map may exceed the cap rather than
// let an attacker flood a victim's 429 away.
function pruneAttempts(now) {
  if (attempts.size < maxAttemptEntries) return
  for (const [key, a] of attempts) {
    if (a.until <= now) attempts.delete(key)
  }
  for (const [key, a] of attempts) {
    if (attempts.size < maxAttemptEntries) break
    if (a.fails < LOCK_AFTER) attempts.delete(key)
  }
}

function recordFail(code, now) {
  pruneAttempts(now)
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
  // a code outside newCode's alphabet/length can never match a household; reject without touching rate-limit state
  if (!CODE_RE.test(code)) return { status: 401, body: { error: 'wrong code or pin' } }
  if (limited(code, now)) return { status: 429, body: { error: 'too many tries' } }
  const row = db.prepare(`SELECT id, pin_hash FROM households WHERE code = ?`).get(code)
  // always hash the pin, even for an unknown code, so lookup misses aren't distinguishable by timing
  const pinOk = PIN_RE.test(String(body?.pin ?? '')) && verifyPin(body.pin, row ? row.pin_hash : DUMMY_PIN_HASH)
  if (!row || !pinOk) {
    recordFail(code, now)
    return { status: 401, body: { error: 'wrong code or pin' } }
  }
  attempts.delete(code)
  return { status: 200, body: { token: issueToken(db, row.id, now) } }
}

function householdState(db, householdId) {
  const rows = db.prepare(`SELECT profile_id, doc, deleted_at FROM progress_docs WHERE household_id = ? ORDER BY profile_id`).all(householdId)
  return {
    docs: rows.filter(r => r.doc != null).map(r => JSON.parse(r.doc)),
    deleted: rows.filter(r => r.doc == null).map(r => r.profile_id)
  }
}

export function pullSync({ db, now }, { token }) {
  const hid = household(db, token, now)
  if (!hid) return { status: 401, body: { error: 'unknown token' } }
  return { status: 200, body: householdState(db, hid) }
}

export function pushSync({ db, now }, { token, body }) {
  const hid = household(db, token, now)
  if (!hid) return { status: 401, body: { error: 'unknown token' } }
  const upsert = db.prepare(`
    INSERT INTO progress_docs (household_id, profile_id, doc, deleted_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (household_id, profile_id) DO UPDATE SET doc = excluded.doc, deleted_at = excluded.deleted_at, updated_at = excluded.updated_at`)
  const get = db.prepare(`SELECT doc, deleted_at FROM progress_docs WHERE household_id = ? AND profile_id = ?`)

  for (const pid of Array.isArray(body?.deleted) ? body.deleted : []) {
    upsert.run(hid, String(pid), null, now, now)
  }
  for (const incoming of Array.isArray(body?.docs) ? body.docs : []) {
    if (!incoming?.profileId) continue
    const row = get.get(hid, incoming.profileId)
    if (row?.deleted_at != null && !((incoming.updatedAt ?? 0) > row.deleted_at)) continue // tombstone holds
    const merged = mergeDocs(row?.doc ? JSON.parse(row.doc) : null, incoming)
    upsert.run(hid, incoming.profileId, JSON.stringify(merged), null, now)
  }
  return { status: 200, body: householdState(db, hid) }
}

export function deleteHousehold({ db, now }, { token, body }) {
  const hid = household(db, token, now)
  if (!hid) return { status: 401, body: { error: 'unknown token' } }
  const row = db.prepare(`SELECT pin_hash FROM households WHERE id = ?`).get(hid)
  if (!verifyPin(String(body?.pin ?? ''), row.pin_hash)) return { status: 401, body: { error: 'wrong code or pin' } }
  db.prepare(`DELETE FROM households WHERE id = ?`).run(hid)
  return { status: 204, body: undefined }
}
