# Phase 5: Account & Sync + Tempo Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Family progress sync via a small Railway backend (family code + PIN, no email auth), plus practice tempos, a steadiness view, in-time backing tracks, and C3 low-register calibration prep.

**Architecture:** A pure `merge.js` module implements SR-STO-05 conflict rules and runs on both client and server (server keeps a byte-identical committed copy, guarded by a test). The server is plain `node:http` + `better-sqlite3` on a Railway volume, deployed as service `api` in the existing `arietta` Railway project. The sync client is state-based (whole progress docs, no op queue) and completely inert without a linked family. Tempo/steadiness/backing extend the existing pure engine + App wiring; C3 prep adds a second clarity threshold to the note tracker.

**Tech Stack:** Preact + Vite PWA (existing, `app/`), Node 22 + better-sqlite3 (new, `server/`), `node --test` everywhere. No other dependencies.

**Spec:** `docs/superpowers/specs/2026-07-09-phase5-account-sync-design.md` — read it first.

## Global Constraints

- Local-first (SR-STO-04): every v1 flow must work with sync off or backend unreachable. Sync failures are silent to the student.
- No numbers in student-facing feedback — no percentages, scores, grades, streaks (§9.2). The steadiness view is number-free.
- No third-party analytics or tracking anywhere (SR-BCK-03). Server stores only households, devices, progress docs.
- No emojis in code, prints, or logging. Sparse comments; docstring-style headers on modules (match existing files).
- App code is plain JS ES modules, tested with `node --test` via `cd app && npm test`. Server tests run with `cd server && npm test`.
- Commit after every task (working tree green). Do not push until the final task.
- The app repo pattern: pure logic in `src/core`/`src/sync` (no DOM), wiring in `App.jsx`, UI in `src/ui/*.jsx`, strings in `src/content/voice.js`.
- All `Date.now()` calls in store/sync code take `now` as a defaulted parameter (existing pattern in `progress.js`) so tests can inject time.

## File Structure

```
app/src/sync/merge.js          NEW  pure conflict resolution (canonical copy)
app/src/sync/client.js         NEW  sync client (fetch + IndexedDB via injected handles)
app/test/…                     (tests live in app/test/*.test.js like all others)
server/package.json            NEW  type:module, better-sqlite3, start/test scripts
server/merge.js                NEW  committed byte-identical copy of app merge.js
server/src/db.js               NEW  SQLite open + schema
server/src/auth.js             NEW  scrypt PIN hash, family code, tokens
server/src/routes.js           NEW  request handlers (pure-ish: take deps, return {status, body})
server/src/index.js            NEW  node:http server, JSON + CORS + dispatch
server/test/*.test.js          NEW  auth, api, merge-copy tests
app/src/ui/FamilySync.jsx      NEW  Settings card for create/join/leave/delete
app/src/ui/Steadiness.jsx      NEW  number-free timeline SVG
app/src/ui/Settings.jsx        MOD  render FamilySync card
app/src/content/voice.js       MOD  new strings (sync, tempo, steadiness, low-note)
app/src/core/engine.js         MOD  judgeOnset returns offsets; TEMPO_CHOICES/atTempo
app/src/core/timing.js         MOD  steadinessPoints()
app/src/ui/Song.jsx            MOD  tempo picker; steadiness in done overlay
app/src/App.jsx                MOD  sync wiring, tempo choice, backing effect, lowClarity
app/src/audio/detect/tracker.js MOD low-register clarity threshold
app/src/audio/detect-worker.js MOD  pass lowClarity config
app/src/audio/mic.js           MOD  lowClarity option + setter
app/src/audio/synth.js         MOD  playHarmony optional gain
app/src/ui/MicCheck.jsx        MOD  optional low-note calibration stage
app/.env.production            NEW  VITE_SYNC_URL (created at deploy task)
```

---

### Task 1: Shared merge core

**Files:**
- Create: `app/src/sync/merge.js`
- Test: `app/test/sync-merge.test.js`

**Interfaces:**
- Produces: `mergeDocs(a, b) -> doc`, `mergeLessonEntry(a, b) -> entry`, `emptyDoc(profile) -> doc`.
- Doc shape (used by Tasks 4, 6): `{ profileId, name, createdAt, lessons: { [lessonId]: { completed, bestCount?, stepIndex?, lastPlayedAt? } }, settings: {}, updatedAt }`.

- [ ] **Step 1: Write the failing test**

```js
// app/test/sync-merge.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test test/sync-merge.test.js`
Expected: FAIL — `Cannot find module '../src/sync/merge.js'`

- [ ] **Step 3: Write the implementation**

```js
// app/src/sync/merge.js
/**
 * Conflict resolution for sync (SR-STO-05): per lesson, most-progress-wins —
 * completed > in-progress > untouched; within a state the higher stepIndex /
 * bestCount wins; lastPlayedAt is the max. Settings resolve whole-doc by the
 * newer updatedAt (exact ties keep the first argument; same-ms writes from
 * two devices are not worth extra machinery).
 *
 * Pure and dependency-free: the server keeps a byte-identical copy at
 * server/merge.js, guarded by server/test/merge-copy.test.js. Edit this file,
 * then re-copy.
 */

const maxDef = (x, y) => x == null ? (y ?? undefined) : y == null ? x : Math.max(x, y)

export function mergeLessonEntry(a = {}, b = {}) {
  const completed = !!(a.completed || b.completed)
  const out = { completed }
  const bestCount = maxDef(a.bestCount, b.bestCount)
  if (bestCount !== undefined) out.bestCount = bestCount
  if (!completed) {
    const stepIndex = maxDef(a.stepIndex, b.stepIndex)
    if (stepIndex !== undefined) out.stepIndex = stepIndex
  }
  const lastPlayedAt = maxDef(a.lastPlayedAt, b.lastPlayedAt)
  if (lastPlayedAt !== undefined) out.lastPlayedAt = lastPlayedAt
  return out
}

export function mergeDocs(a, b) {
  if (!a) return b
  if (!b) return a
  const newer = (b.updatedAt ?? 0) > (a.updatedAt ?? 0) ? b : a
  const ids = new Set([...Object.keys(a.lessons ?? {}), ...Object.keys(b.lessons ?? {})])
  const lessons = {}
  for (const id of [...ids].sort()) lessons[id] = mergeLessonEntry(a.lessons?.[id], b.lessons?.[id])
  return {
    profileId: a.profileId ?? b.profileId,
    name: newer.name,
    createdAt: Math.min(a.createdAt ?? Infinity, b.createdAt ?? Infinity),
    lessons,
    settings: newer.settings ?? {},
    updatedAt: Math.max(a.updatedAt ?? 0, b.updatedAt ?? 0)
  }
}

export function emptyDoc(profile) {
  return { profileId: profile.id, name: profile.name, createdAt: profile.createdAt, lessons: {}, settings: {}, updatedAt: 0 }
}
```

Note: `test('mergeDocs tolerates null…')` compares `mergeDocs(null, b)` to `b` by reference-equal deepEqual — returning `b` unchanged is correct.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && node --test test/sync-merge.test.js`
Expected: PASS (7 tests). Then run the full suite: `cd app && npm test` — all green.

- [ ] **Step 5: Commit**

```bash
git add app/src/sync/merge.js app/test/sync-merge.test.js
git commit -m "Phase 5: shared most-progress-wins merge core (SR-STO-05)"
```

---

### Task 2: Server scaffold — package, database, auth utilities

**Files:**
- Create: `server/package.json`, `server/.gitignore`, `server/src/db.js`, `server/src/auth.js`
- Test: `server/test/auth.test.js`, `server/test/db.test.js`

**Interfaces:**
- Produces: `openDb(path) -> Database` (better-sqlite3 handle with schema applied);
  `hashPin(pin) -> string`, `verifyPin(pin, hash) -> boolean`, `newCode(random?) -> string` (6 chars, alphabet `23456789ABCDEFGHJKMNPQRSTUVWXYZ`), `newToken() -> string` (48 hex chars), `hashToken(token) -> string` (sha256 hex).
- Tasks 3–4 consume all of these.

- [ ] **Step 1: Create the package**

```json
// server/package.json
{
  "name": "arietta-api",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "test": "node --test 'test/*.test.js'"
  },
  "dependencies": {
    "better-sqlite3": "^12.4.1"
  }
}
```

```
# server/.gitignore
node_modules
*.db
```

Run: `cd server && npm install`
Expected: better-sqlite3 installs and builds.

- [ ] **Step 2: Write the failing tests**

```js
// server/test/db.test.js
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
```

```js
// server/test/auth.test.js
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
```

Run: `cd server && npm test`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementation**

```js
// server/src/db.js
/**
 * SQLite storage (SR-BCK-01): households, devices, progress documents.
 * Nothing else — no audio, no events, no analytics.
 */
import Database from 'better-sqlite3'

export function openDb(path) {
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      pin_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS devices (
      token_hash TEXT PRIMARY KEY,
      household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS progress_docs (
      household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      profile_id TEXT NOT NULL,
      doc TEXT,
      deleted_at INTEGER,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (household_id, profile_id)
    );
  `)
  return db
}
```

```js
// server/src/auth.js
/** PIN hashing (scrypt), family codes, and opaque device tokens (SR-BCK-02 interim). */
import { scryptSync, randomBytes, createHash, timingSafeEqual } from 'node:crypto'

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

export function hashPin(pin) {
  const salt = randomBytes(16)
  const hash = scryptSync(String(pin), salt, 32)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyPin(pin, stored) {
  const [saltHex, hashHex] = stored.split(':')
  const hash = scryptSync(String(pin), Buffer.from(saltHex, 'hex'), 32)
  return timingSafeEqual(hash, Buffer.from(hashHex, 'hex'))
}

export function newCode(random = randomBytes) {
  const bytes = random(6)
  let code = ''
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length]
  return code
}

export const newToken = () => randomBytes(24).toString('hex')

export const hashToken = (token) => createHash('sha256').update(token).digest('hex')
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add server/package.json server/package-lock.json server/.gitignore server/src/db.js server/src/auth.js server/test/db.test.js server/test/auth.test.js
git commit -m "Phase 5: server scaffold - sqlite schema and auth utilities"
```

---

### Task 3: Server API — create household, link device, auth guard, rate limit

**Files:**
- Create: `server/src/routes.js`, `server/src/index.js`
- Test: `server/test/api.test.js`

**Interfaces:**
- Consumes: Task 2 (`openDb`, auth utils).
- Produces: `createApp({ db, now? }) -> http.Server` from `src/index.js` (used by Task 4 tests and by `npm start`); route handlers in `routes.js` shaped `fn(deps, req) -> { status, body }` where `req = { body, token }`.
- HTTP surface after this task:
  - `POST /households` `{pin}` → 201 `{code, token}`; 400 `{error:'pin must be 4 to 8 digits'}` on bad pin.
  - `POST /households/link` `{code, pin}` → 200 `{token}`; 401 `{error:'wrong code or pin'}`; 429 `{error:'too many tries'}` after 5 failures per code within 15 minutes.
  - Any other route → 404. Bearer-token auth helper for Task 4.

- [ ] **Step 1: Write the failing test**

```js
// server/test/api.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openDb } from '../src/db.js'
import { createApp } from '../src/index.js'

async function start() {
  const db = openDb(':memory:')
  const server = createApp({ db })
  await new Promise(r => server.listen(0, r))
  const base = `http://127.0.0.1:${server.address().port}`
  const call = (method, path, body, token) => fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  return { db, server, call, close: () => new Promise(r => server.close(r)) }
}

test('create household returns code and token; bad pin rejected', async () => {
  const s = await start()
  const bad = await s.call('POST', '/households', { pin: 'abc' })
  assert.equal(bad.status, 400)
  const res = await s.call('POST', '/households', { pin: '4321' })
  assert.equal(res.status, 201)
  const { code, token } = await res.json()
  assert.match(code, /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/)
  assert.match(token, /^[0-9a-f]{48}$/)
  await s.close()
})

test('link with right code+pin issues a second token; wrong pin 401', async () => {
  const s = await start()
  const { code } = await (await s.call('POST', '/households', { pin: '4321' })).json()
  const wrong = await s.call('POST', '/households/link', { code, pin: '0000' })
  assert.equal(wrong.status, 401)
  const ok = await s.call('POST', '/households/link', { code, pin: '4321' })
  assert.equal(ok.status, 200)
  assert.match((await ok.json()).token, /^[0-9a-f]{48}$/)
  await s.close()
})

test('five failed links lock the code out with 429', async () => {
  const s = await start()
  const { code } = await (await s.call('POST', '/households', { pin: '4321' })).json()
  for (let i = 0; i < 5; i++) {
    assert.equal((await s.call('POST', '/households/link', { code, pin: '9999' })).status, 401)
  }
  const locked = await s.call('POST', '/households/link', { code, pin: '4321' })
  assert.equal(locked.status, 429)
  await s.close()
})

test('unknown route 404s with json', async () => {
  const s = await start()
  const res = await s.call('GET', '/nope')
  assert.equal(res.status, 404)
  await s.close()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && node --test test/api.test.js`
Expected: FAIL — `createApp` not found.

- [ ] **Step 3: Write the implementation**

```js
// server/src/routes.js
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
```

```js
// server/src/index.js
/** Arietta sync API (SR-BCK-01..03). Plain node:http, JSON in and out. */
import { createServer } from 'node:http'
import { openDb } from './db.js'
import { createHousehold, linkHousehold } from './routes.js'

const MAX_BODY = 512 * 1024

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', c => {
      data += c
      if (data.length > MAX_BODY) reject(new Error('too large'))
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

export function createApp({ db, now = () => Date.now(), allowOrigin = process.env.ALLOWED_ORIGIN ?? '*' }) {
  return createServer(async (req, res) => {
    res.setHeader('access-control-allow-origin', allowOrigin)
    res.setHeader('access-control-allow-headers', 'authorization, content-type')
    res.setHeader('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS')
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }

    let out
    try {
      const raw = await readBody(req)
      const body = raw ? JSON.parse(raw) : {}
      const token = (req.headers.authorization ?? '').replace(/^Bearer /, '') || null
      const deps = { db, now: now() }
      const r = { body, token }
      const key = `${req.method} ${req.url.split('?')[0]}`
      if (key === 'POST /households') out = createHousehold(deps, r)
      else if (key === 'POST /households/link') out = linkHousehold(deps, r)
      else out = { status: 404, body: { error: 'not found' } }
    } catch {
      out = { status: 400, body: { error: 'bad request' } }
    }
    res.writeHead(out.status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(out.body ?? {}))
  })
}

// Started directly (Railway): serve on PORT with the volume-backed db.
if (import.meta.url === `file://${process.argv[1]}`) {
  const db = openDb(process.env.DB_PATH ?? '/data/arietta.db')
  const port = Number(process.env.PORT ?? 8080)
  createApp({ db }).listen(port, () => console.log(`arietta api on :${port}`))
}
```

Rate-limit state is per-process (`attempts` map). Add `resetRateLimit()` calls in tests if cross-test bleed appears (each test uses a fresh random code, so it should not).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS (8 tests total so far).

- [ ] **Step 5: Commit**

```bash
git add server/src/routes.js server/src/index.js server/test/api.test.js
git commit -m "Phase 5: server api - household create/link with PIN and rate limit"
```

---

### Task 4: Server sync endpoints, server-side merge, household deletion

**Files:**
- Create: `server/merge.js` (byte-identical copy of `app/src/sync/merge.js`)
- Modify: `server/src/routes.js`, `server/src/index.js`
- Test: `server/test/merge-copy.test.js`, extend `server/test/api.test.js`

**Interfaces:**
- Consumes: Task 1 doc shape, Task 3 `household()` auth helper and `createApp` dispatch.
- Produces (HTTP surface Task 6 relies on):
  - `GET /sync` (Bearer) → 200 `{docs: [doc], deleted: [profileId]}`; 401 without valid token.
  - `PUT /sync` (Bearer) `{docs: [doc], deleted: [profileId]}` → 200 `{docs, deleted}` — server merges each incoming doc with its stored copy via `mergeDocs` and returns the full merged household state. A deleted profileId writes a tombstone (`doc = NULL, deleted_at = now`); an incoming doc with `updatedAt > deleted_at` revives it.
  - `DELETE /households` (Bearer) `{pin}` → 204 and all household rows cascade-deleted; 401 on wrong pin.

- [ ] **Step 1: Copy the merge module and write the identity test**

```bash
cp app/src/sync/merge.js server/merge.js
```

```js
// server/test/merge-copy.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('server/merge.js is byte-identical to app/src/sync/merge.js', () => {
  const a = readFileSync(new URL('../../app/src/sync/merge.js', import.meta.url), 'utf8')
  const b = readFileSync(new URL('../merge.js', import.meta.url), 'utf8')
  assert.equal(b, a, 'run: cp app/src/sync/merge.js server/merge.js')
})
```

- [ ] **Step 2: Write the failing api tests (append to server/test/api.test.js)**

```js
test('push merges with stored docs; pull returns household state', async () => {
  const s = await start()
  const { token } = await (await s.call('POST', '/households', { pin: '4321' })).json()
  const d1 = { profileId: 'p1', name: 'Maya', createdAt: 1, lessons: { l1: { completed: true, lastPlayedAt: 10 } }, settings: {}, updatedAt: 10 }
  const push1 = await s.call('PUT', '/sync', { docs: [d1], deleted: [] }, token)
  assert.equal(push1.status, 200)

  // second device pushes less progress on l1, more on l2
  const d2 = { profileId: 'p1', name: 'Maya', createdAt: 1, lessons: { l1: { stepIndex: 2 }, l2: { stepIndex: 3, lastPlayedAt: 20 } }, settings: {}, updatedAt: 20 }
  const push2 = await (await s.call('PUT', '/sync', { docs: [d2], deleted: [] }, token)).json()
  const merged = push2.docs.find(d => d.profileId === 'p1')
  assert.equal(merged.lessons.l1.completed, true)
  assert.equal(merged.lessons.l2.stepIndex, 3)

  const pull = await (await s.call('GET', '/sync', undefined, token)).json()
  assert.deepEqual(pull.docs, push2.docs)
  await s.close()
})

test('sync requires a valid token', async () => {
  const s = await start()
  assert.equal((await s.call('GET', '/sync')).status, 401)
  assert.equal((await s.call('GET', '/sync', undefined, 'deadbeef')).status, 401)
  await s.close()
})

test('deleted profile becomes a tombstone; newer doc revives it', async () => {
  const s = await start()
  const { token } = await (await s.call('POST', '/households', { pin: '4321' })).json()
  const d = { profileId: 'p1', name: 'Maya', createdAt: 1, lessons: {}, settings: {}, updatedAt: 10 }
  await s.call('PUT', '/sync', { docs: [d], deleted: [] }, token)
  const afterDel = await (await s.call('PUT', '/sync', { docs: [], deleted: ['p1'] }, token)).json()
  assert.deepEqual(afterDel.docs, [])
  assert.deepEqual(afterDel.deleted, ['p1'])
  const revived = await (await s.call('PUT', '/sync', { docs: [{ ...d, updatedAt: Date.now() + 60000 }], deleted: [] }, token)).json()
  assert.equal(revived.docs.length, 1)
  assert.deepEqual(revived.deleted, [])
  await s.close()
})

test('household deletion removes everything and needs the pin', async () => {
  const s = await start()
  const { token } = await (await s.call('POST', '/households', { pin: '4321' })).json()
  assert.equal((await s.call('DELETE', '/households', { pin: '0000' }, token)).status, 401)
  assert.equal((await s.call('DELETE', '/households', { pin: '4321' }, token)).status, 204)
  assert.equal((await s.call('GET', '/sync', undefined, token)).status, 401)
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM households').get().n, 0)
  await s.close()
})
```

Run: `cd server && npm test`
Expected: merge-copy PASSES; the four new api tests FAIL (404 responses).

- [ ] **Step 3: Implement (append to server/src/routes.js, wire in index.js)**

```js
// append to server/src/routes.js
import { mergeDocs } from '../merge.js'

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
```

In `server/src/index.js`, extend the imports and dispatch:

```js
import { createHousehold, linkHousehold, pullSync, pushSync, deleteHousehold } from './routes.js'
```
```js
      if (key === 'POST /households') out = createHousehold(deps, r)
      else if (key === 'POST /households/link') out = linkHousehold(deps, r)
      else if (key === 'GET /sync') out = pullSync(deps, r)
      else if (key === 'PUT /sync') out = pushSync(deps, r)
      else if (key === 'DELETE /households') out = deleteHousehold(deps, r)
      else out = { status: 404, body: { error: 'not found' } }
```

For the 204 response, `res.end(JSON.stringify(out.body ?? {}))` already sends `{}` — fine.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS (13 tests). Also `cd app && npm test` still green (nothing touched).

- [ ] **Step 5: Commit**

```bash
git add server/merge.js server/src/routes.js server/src/index.js server/test/merge-copy.test.js server/test/api.test.js
git commit -m "Phase 5: server sync push/pull with server-side merge and deletion"
```

---

### Task 5: Deploy the api service to Railway

**Files:**
- Create: `server/.railwayignore`
- Modify: `app/README.md` (deploy section), create `app/.env.production` later in this task

No unit tests — verification is live curl against the deployed service. The Railway project `arietta` and service `web` already exist (see `app/README.md`).

- [ ] **Step 1: Create the service with its variables**

```bash
printf 'node_modules\n*.db\n' > server/.railwayignore
cd server
railway add --service api --variables DB_PATH=/data/arietta.db --variables ALLOWED_ORIGIN=https://web-production-415a7.up.railway.app
```

- [ ] **Step 2: Attach a volume and deploy**

```bash
railway volume add --service api --mount-path /data
railway up --service api --ci -m "Phase 5: first api deploy"
railway domain --service api --json
```

Expected: build succeeds (Railpack detects Node, runs `npm start`); the last command prints the api domain, e.g. `https://api-production-XXXX.up.railway.app`. Record it — it is `$API_URL` below and `VITE_SYNC_URL` in Step 4.

- [ ] **Step 3: Smoke-test the live service**

```bash
curl -s -X POST "$API_URL/households" -H 'content-type: application/json' -d '{"pin":"4321"}'
# expect: {"code":"......","token":"..."} with 201
curl -s "$API_URL/sync" -H "Authorization: Bearer <token from above>"
# expect: {"docs":[],"deleted":[]}
curl -s -X DELETE "$API_URL/households" -H "Authorization: Bearer <token>" -H 'content-type: application/json' -d '{"pin":"4321"}' -o /dev/null -w '%{http_code}'
# expect: 204
```

Restart the service once (`railway redeploy --service api --yes`) and confirm a freshly created household still exists afterward — proves the volume persists the db. (Create one more household before redeploy, `GET /sync` with its token after.)

- [ ] **Step 4: Bake the api URL into the app build**

```bash
printf 'VITE_SYNC_URL=%s\n' "$API_URL" > app/.env.production
```

Add one line to the Deploy section of `app/README.md`: the api service name, its domain, and that `VITE_SYNC_URL` in `app/.env.production` must match it.

- [ ] **Step 5: Commit**

```bash
git add server/.railwayignore app/.env.production app/README.md
git commit -m "Phase 5: deploy api service to Railway with volume"
```

---

### Task 6: Sync client

**Files:**
- Create: `app/src/sync/client.js`
- Test: `app/test/sync-client.test.js`

**Interfaces:**
- Consumes: Task 1 (`mergeDocs`, `emptyDoc`), Task 4 HTTP surface, the db handle shape from `app/src/store/db.js` (`get/getAll/put/delete`), and `app/src/store/progress.js` row shapes (`progress` rows `{profileId, lessonId, completed, bestCount?, stepIndex?, lastPlayedAt?}`, settings at `app` store key `settings:<profileId>`, profiles `{id, name, createdAt}`).
- Produces (consumed by Task 7 App wiring):

```js
createSyncClient({ db, url, fetchFn = globalThis.fetch, onChange = () => {}, now = () => Date.now() }) -> {
  getState()            // { linked: boolean, code: string|null, lastSyncAt: number|null, failing: boolean }
  create(pin)           // -> { code } ; throws Error('...') on failure
  join(code, pin)       // -> void ; throws on wrong code/pin or lockout
  leave()               // forget token+code locally, keep all local data
  deleteEverywhere(pin) // DELETE /households then leave()
  noteProfileDeleted(profileId)  // queue tombstone for next push
  schedule()            // debounced syncNow; safe to call often; inert when not linked
  syncNow()             // -> 'off' | 'ok' | 'fail' ; never throws
}
```
- Local sync state lives at `app` store key `sync`: `{ token, code, deleted: [], lastSyncAt }`.

- [ ] **Step 1: Write the failing test**

```js
// app/test/sync-client.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSyncClient } from '../src/sync/client.js'

/** Minimal in-memory stand-in for the db handle in src/store/db.js. */
function fakeDb() {
  const stores = { profiles: new Map(), progress: new Map(), app: new Map() }
  const key = (store, v) => store === 'progress' ? `${v.profileId}|${v.lessonId}` : (v.id ?? v.key)
  return {
    get: async (s, k) => stores[s].get(Array.isArray(k) ? k.join('|') : k) ?? undefined,
    getAll: async (s) => [...stores[s].values()],
    put: async (s, v) => { stores[s].set(key(s, v), v) },
    delete: async (s, k) => { stores[s].delete(Array.isArray(k) ? k.join('|') : k) },
    _stores: stores
  }
}

/** Fake server: real merge semantics not needed here — echo store keyed by profileId. */
function fakeServer() {
  const docs = new Map()
  const calls = []
  const fetchFn = async (url, opts = {}) => {
    calls.push({ url, method: opts.method ?? 'GET' })
    const path = new URL(url).pathname
    const body = opts.body ? JSON.parse(opts.body) : {}
    const json = (status, data) => ({ ok: status < 400, status, json: async () => data })
    if (path === '/households' && opts.method === 'POST') return json(201, { code: 'ABCDEF', token: 't0ken' })
    if (path === '/households/link') return body.pin === '4321' ? json(200, { token: 't0ken' }) : json(401, { error: 'wrong code or pin' })
    if (path === '/sync' && opts.method === 'PUT') {
      for (const d of body.docs) docs.set(d.profileId, d)
      for (const p of body.deleted) docs.delete(p)
      return json(200, { docs: [...docs.values()], deleted: body.deleted })
    }
    if (path === '/sync') return json(200, { docs: [...docs.values()], deleted: [] })
    if (path === '/households' && opts.method === 'DELETE') { docs.clear(); return json(204, {}) }
    return json(404, { error: 'not found' })
  }
  return { docs, calls, fetchFn }
}

test('inert without a linked family: syncNow is off and fetch never called', async () => {
  const srv = fakeServer()
  const c = createSyncClient({ db: fakeDb(), url: 'https://api.test', fetchFn: srv.fetchFn })
  assert.equal(await c.syncNow(), 'off')
  assert.equal((await c.getState()).linked, false)
  assert.equal(srv.calls.length, 0)
})

test('create stores token+code and pushes local docs', async () => {
  const db = fakeDb()
  await db.put('profiles', { id: 'p1', name: 'Maya', createdAt: 1 })
  await db.put('progress', { profileId: 'p1', lessonId: 'l1', completed: true, lastPlayedAt: 5 })
  await db.put('app', { key: 'settings:p1', value: { accent: '#B7813A' } })
  const srv = fakeServer()
  const c = createSyncClient({ db, url: 'https://api.test', fetchFn: srv.fetchFn, now: () => 100 })
  const { code } = await c.create('4321')
  assert.equal(code, 'ABCDEF')
  assert.equal(await c.syncNow(), 'ok')
  const pushed = srv.docs.get('p1')
  assert.equal(pushed.lessons.l1.completed, true)
  assert.equal(pushed.settings.accent, '#B7813A')
  assert.equal((await c.getState()).linked, true)
})

test('pull merges remote docs into local rows and creates unknown profiles', async () => {
  const db = fakeDb()
  const srv = fakeServer()
  srv.docs.set('p2', {
    profileId: 'p2', name: 'Sam', createdAt: 2,
    lessons: { l3: { completed: true, bestCount: 8, lastPlayedAt: 9 } },
    settings: { labels: false }, updatedAt: 9
  })
  const c = createSyncClient({ db, url: 'https://api.test', fetchFn: srv.fetchFn })
  await c.join('ABCDEF', '4321')
  assert.equal(await c.syncNow(), 'ok')
  assert.deepEqual(await db.get('profiles', 'p2'), { id: 'p2', name: 'Sam', createdAt: 2 })
  const row = await db.get('progress', ['p2', 'l3'])
  assert.equal(row.completed, true)
  assert.equal(row.bestCount, 8)
  assert.deepEqual((await db.get('app', 'settings:p2')).value, { labels: false })
})

test('join with wrong pin throws and stays unlinked', async () => {
  const srv = fakeServer()
  const c = createSyncClient({ db: fakeDb(), url: 'https://api.test', fetchFn: srv.fetchFn })
  await assert.rejects(() => c.join('ABCDEF', '0000'))
  assert.equal((await c.getState()).linked, false)
})

test('network failure returns fail, marks failing, and leaves local data alone', async () => {
  const db = fakeDb()
  await db.put('profiles', { id: 'p1', name: 'Maya', createdAt: 1 })
  await db.put('app', { key: 'sync', value: { token: 't0ken', code: 'ABCDEF', deleted: [], lastSyncAt: null } })
  const c = createSyncClient({ db, url: 'https://api.test', fetchFn: async () => { throw new Error('offline') } })
  assert.equal(await c.syncNow(), 'fail')
  assert.equal((await c.getState()).failing, true)
  assert.deepEqual(await db.get('profiles', 'p1'), { id: 'p1', name: 'Maya', createdAt: 1 })
})

test('leave forgets the link but keeps data; deleted profiles queue tombstones', async () => {
  const db = fakeDb()
  await db.put('profiles', { id: 'p1', name: 'Maya', createdAt: 1 })
  const srv = fakeServer()
  const c = createSyncClient({ db, url: 'https://api.test', fetchFn: srv.fetchFn })
  await c.create('4321')
  await c.noteProfileDeleted('pGone')
  assert.equal(await c.syncNow(), 'ok')
  assert.equal(srv.docs.has('pGone'), false)
  await c.leave()
  assert.equal((await c.getState()).linked, false)
  assert.deepEqual(await db.get('profiles', 'p1'), { id: 'p1', name: 'Maya', createdAt: 1 })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test test/sync-client.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// app/src/sync/client.js
/**
 * Sync client (SR-STO-04): state-based push/pull of per-profile progress
 * documents. Fully additive — with no linked family every call is inert,
 * and failures are silent ('fail' return, never a throw from syncNow).
 * Docs merge via merge.js on pull; the server merges again on push.
 */
import { mergeDocs, emptyDoc } from './merge.js'

const DEBOUNCE_MS = 3000
const BACKOFF_MS = [30_000, 120_000, 480_000]

export function createSyncClient({ db, url, fetchFn = (...a) => globalThis.fetch(...a), onChange = () => {}, now = () => Date.now() }) {
  let timer = null
  let failStreak = 0

  const getCfg = async () => (await db.get('app', 'sync'))?.value ?? null
  const putCfg = (value) => db.put('app', { key: 'sync', value })

  async function call(method, path, body, token) {
    const res = await fetchFn(url + path, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? `sync ${res.status}`)
    }
    return res.status === 204 ? {} : res.json()
  }

  async function buildDocs() {
    const profiles = await db.getAll('profiles')
    const rows = await db.getAll('progress')
    const docs = []
    for (const p of profiles) {
      const doc = emptyDoc(p)
      for (const r of rows.filter(r => r.profileId === p.id)) {
        const e = { completed: !!r.completed }
        if (r.bestCount != null) e.bestCount = r.bestCount
        if (!e.completed && r.stepIndex != null) e.stepIndex = r.stepIndex
        if (r.lastPlayedAt != null) e.lastPlayedAt = r.lastPlayedAt
        doc.lessons[r.lessonId] = e
        doc.updatedAt = Math.max(doc.updatedAt, r.lastPlayedAt ?? 0)
      }
      doc.settings = (await db.get('app', `settings:${p.id}`))?.value ?? {}
      docs.push(doc)
    }
    return docs
  }

  async function applyDoc(doc) {
    const existing = await db.get('profiles', doc.profileId)
    if (!existing) await db.put('profiles', { id: doc.profileId, name: doc.name, createdAt: doc.createdAt })
    for (const [lessonId, e] of Object.entries(doc.lessons)) {
      await db.put('progress', { profileId: doc.profileId, lessonId, ...e })
    }
    if (Object.keys(doc.settings ?? {}).length) {
      await db.put('app', { key: `settings:${doc.profileId}`, value: doc.settings })
    }
  }

  async function syncNow() {
    const cfg = await getCfg()
    if (!cfg?.token) return 'off'
    try {
      const remote = await call('GET', '/sync', undefined, cfg.token)
      const local = await buildDocs()
      const byId = new Map(local.map(d => [d.profileId, d]))
      const merged = []
      for (const rd of remote.docs) merged.push(mergeDocs(byId.get(rd.profileId) ?? null, rd))
      for (const ld of local) if (!remote.docs.some(rd => rd.profileId === ld.profileId)) merged.push(ld)
      const deleted = cfg.deleted ?? []
      const keep = merged.filter(d => !deleted.includes(d.profileId))
      for (const d of keep) await applyDoc(d)
      const pushed = await call('PUT', '/sync', { docs: keep, deleted }, cfg.token)
      for (const d of pushed.docs) await applyDoc(d)
      failStreak = 0
      await putCfg({ ...cfg, deleted: [], lastSyncAt: now() })
      onChange()
      return 'ok'
    } catch {
      failStreak += 1
      clearTimeout(timer)
      timer = setTimeout(syncNow, BACKOFF_MS[Math.min(failStreak - 1, BACKOFF_MS.length - 1)])
      timer.unref?.() // node timers must not hold the test process open; no-op in browsers
      onChange()
      return 'fail'
    }
  }

  return {
    async getState() {
      const cfg = await getCfg()
      return { linked: !!cfg?.token, code: cfg?.code ?? null, lastSyncAt: cfg?.lastSyncAt ?? null, failing: failStreak > 0 }
    },
    async create(pin) {
      const { code, token } = await call('POST', '/households', { pin })
      await putCfg({ token, code, deleted: [], lastSyncAt: null })
      await syncNow()
      return { code }
    },
    async join(code, pin) {
      const { token } = await call('POST', '/households/link', { code: code.toUpperCase(), pin })
      await putCfg({ token, code: code.toUpperCase(), deleted: [], lastSyncAt: null })
      await syncNow()
    },
    async leave() {
      clearTimeout(timer)
      failStreak = 0
      await db.delete('app', 'sync')
      onChange()
    },
    async deleteEverywhere(pin) {
      const cfg = await getCfg()
      if (!cfg?.token) return
      await call('DELETE', '/households', { pin }, cfg.token)
      await this.leave()
    },
    async noteProfileDeleted(profileId) {
      const cfg = await getCfg()
      if (!cfg?.token) return
      await putCfg({ ...cfg, deleted: [...(cfg.deleted ?? []), profileId] })
    },
    schedule() {
      clearTimeout(timer)
      timer = setTimeout(syncNow, DEBOUNCE_MS)
      timer.unref?.()
    },
    syncNow
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && node --test test/sync-client.test.js`
Expected: PASS (6 tests). Then `cd app && npm test` — full suite green.

- [ ] **Step 5: Commit**

```bash
git add app/src/sync/client.js app/test/sync-client.test.js
git commit -m "Phase 5: sync client - additive pull/merge/push with backoff"
```

---

### Task 7: App wiring + Family sync settings UI

**Files:**
- Create: `app/src/ui/FamilySync.jsx`
- Modify: `app/src/App.jsx`, `app/src/ui/Settings.jsx`, `app/src/content/voice.js`

**Interfaces:**
- Consumes: Task 6 `createSyncClient`.
- Produces: `<FamilySync sync={state} onCreate onJoin onLeave onDeleteEverywhere />` card; App holds `syncRef` and a `syncState` piece of state.

No node-test coverage for JSX (repo has none); logic stays in client.js which is tested. Verification is manual (Step 4).

- [ ] **Step 1: Add voice strings**

In `app/src/content/voice.js`, inside the existing `settings:` object add:

```js
    sync: {
      title: 'Family sync',
      offLine: 'Keep progress safe across iPads. Everything works without it, always.',
      createButton: 'Start a family',
      joinButton: 'Join a family',
      pinLabel: 'Family PIN (4 to 8 digits)',
      codeLabel: 'Family code',
      codeShow: 'Your family code is {code}. Write it inside the piano bench — with the PIN it links another iPad.',
      onLine: 'Linked to family {code}.',
      lastSync: 'Progress last carried over {when}.',
      neverSync: 'Waiting to carry progress over.',
      failing: 'Having trouble reaching home base — it will keep trying quietly.',
      syncNow: 'Carry it over now',
      leaveButton: 'Unlink this iPad',
      leaveLine: 'Progress stays on this iPad; it just stops carrying over.',
      deleteButton: 'Delete family data everywhere',
      deleteLine: 'Removes the family and its progress from home base. iPads keep their local copies.',
      wrong: 'That code and PIN did not match. Have another look.',
      confirm: 'Yes, delete it everywhere',
      cancel: 'Never mind'
    },
```

(If `settings.cancel` already exists at the top level of `settings:`, reuse it and omit the nested `cancel`.)

- [ ] **Step 2: Build the FamilySync card**

```jsx
// app/src/ui/FamilySync.jsx
/** Family sync settings card (SR-STO-04, SR-BCK-02 interim code+PIN). */
import { useState } from 'preact/hooks'
import { VOICE } from '../content/voice.js'

const fill = (t, vals) => t.replace(/\{(\w+)\}/g, (_, k) => vals[k])
const PIN_RE = /^\d{4,8}$/

export function FamilySync({ sync, onCreate, onJoin, onLeave, onDeleteEverywhere, onSyncNow }) {
  const v = VOICE.settings.sync
  const [mode, setMode] = useState(null) // null | 'create' | 'join' | 'delete'
  const [pin, setPin] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [shownCode, setShownCode] = useState(null)

  const input = (props) => (
    <input {...props} class="hit" style="border:1px solid var(--line-strong);border-radius:10px;padding:9px 12px;font-size:15px;background:var(--card-warm);width:150px;" />
  )

  const submit = async (fn) => {
    setError(null)
    try { await fn() ; setMode(null); setPin(''); setCode('') }
    catch { setError(v.wrong) }
  }

  if (!sync.linked) {
    return (
      <>
        <div style="font-size:14px;color:var(--ink-soft);text-wrap:pretty;">{v.offLine}</div>
        {shownCode && <div style="font-size:14px;color:var(--ink-mid);text-wrap:pretty;">{fill(v.codeShow, { code: shownCode })}</div>}
        {mode === null && (
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn-quiet" onClick={() => setMode('create')}>{v.createButton}</button>
            <button class="btn-quiet" onClick={() => setMode('join')}>{v.joinButton}</button>
          </div>
        )}
        {mode !== null && (
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            {mode === 'join' && input({ value: code, placeholder: v.codeLabel, maxLength: 6, onInput: e => setCode(e.target.value.toUpperCase()) })}
            {input({ value: pin, placeholder: v.pinLabel, inputMode: 'numeric', maxLength: 8, onInput: e => setPin(e.target.value.replace(/\D/g, '')) })}
            <button class="btn-primary" disabled={!PIN_RE.test(pin) || (mode === 'join' && code.length !== 6)}
              onClick={() => submit(async () => {
                if (mode === 'create') setShownCode((await onCreate(pin)).code)
                else await onJoin(code, pin)
              })}>
              {mode === 'create' ? v.createButton : v.joinButton}
            </button>
            <button class="btn-quiet" onClick={() => { setMode(null); setError(null) }}>{v.cancel}</button>
          </div>
        )}
        {error && <div style="font-size:13.5px;color:var(--hint);">{error}</div>}
      </>
    )
  }

  return (
    <>
      <div style="font-size:14px;color:var(--ink-soft);">{fill(v.onLine, { code: sync.code })}</div>
      <div style="font-size:13px;color:var(--ink-mid);">
        {sync.failing ? v.failing : sync.lastSyncAt ? fill(v.lastSync, { when: new Date(sync.lastSyncAt).toLocaleString() }) : v.neverSync}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn-quiet" onClick={onSyncNow}>{v.syncNow}</button>
        <button class="btn-quiet" onClick={onLeave}>{v.leaveButton}</button>
      </div>
      <div style="font-size:13px;color:var(--ink-mid);border-top:1px dashed var(--line);padding-top:10px;">{v.deleteLine}</div>
      {mode === 'delete' ? (
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          {input({ value: pin, placeholder: v.pinLabel, inputMode: 'numeric', maxLength: 8, onInput: e => setPin(e.target.value.replace(/\D/g, '')) })}
          <button class="btn-primary" style="background:var(--hint);" disabled={!PIN_RE.test(pin)}
            onClick={() => submit(() => onDeleteEverywhere(pin))}>{v.confirm}</button>
          <button class="btn-quiet" onClick={() => { setMode(null); setError(null) }}>{v.cancel}</button>
        </div>
      ) : (
        <div><button class="btn-quiet" onClick={() => setMode('delete')}>{v.deleteButton}</button></div>
      )}
      {error && <div style="font-size:13.5px;color:var(--hint);">{error}</div>}
    </>
  )
}
```

- [ ] **Step 3: Wire into Settings and App**

`app/src/ui/Settings.jsx`: import `FamilySync`, add props `sync, onSyncCreate, onSyncJoin, onSyncLeave, onSyncDeleteEverywhere, onSyncNow`, and render as a new card after the diagnostics card:

```jsx
        <Card title={VOICE.settings.sync.title}>
          <FamilySync sync={sync} onCreate={onSyncCreate} onJoin={onSyncJoin}
            onLeave={onSyncLeave} onDeleteEverywhere={onSyncDeleteEverywhere} onSyncNow={onSyncNow} />
        </Card>
```

`app/src/App.jsx`:

1. Imports: `import { createSyncClient } from './sync/client.js'`.
2. State + ref near the other state hooks: `const [syncState, setSyncState] = useState({ linked: false, code: null, lastSyncAt: null, failing: false })` and `const syncRef = useRef(null)`.
3. In the boot effect (where `openDb()` resolves and `setDb` is called), create the client and load its state:

```js
      const sync = createSyncClient({
        db: handle,
        url: import.meta.env.VITE_SYNC_URL ?? '',
        onChange: () => sync.getState().then(setSyncState)
      })
      syncRef.current = sync
      sync.getState().then(setSyncState)
      sync.schedule()
```

(`handle` = whatever local name the boot effect gives the opened db. If `VITE_SYNC_URL` is empty the client is only ever reachable when unlinked — `create`/`join` will fail with the error line, which is acceptable in dev.)
4. After every local progress write — the existing call sites of `markComplete`, `recordSongRun`, `savePosition`, `saveSettings`, `createProfile` — add `syncRef.current?.schedule()`. In the `deleteProfile` handler add `await syncRef.current?.noteProfileDeleted(profileId)` before the local delete, then `schedule()`.
5. An online listener effect:

```js
  useEffect(() => {
    const onUp = () => syncRef.current?.schedule()
    window.addEventListener('online', onUp)
    return () => window.removeEventListener('online', onUp)
  }, [])
```

6. Pass to `<Settings>`: `sync={syncState}` and handlers that call the client then refresh profiles/progress from the store (reuse the existing reload helper the app uses after profile changes; pull may have created profiles or advanced lessons):

```js
            onSyncCreate={(pin) => syncRef.current.create(pin)}
            onSyncJoin={async (code, pin) => { await syncRef.current.join(code, pin); await reloadAll() }}
            onSyncLeave={() => syncRef.current.leave()}
            onSyncDeleteEverywhere={(pin) => syncRef.current.deleteEverywhere(pin)}
            onSyncNow={async () => { await syncRef.current.syncNow(); await reloadAll() }}
```

(`reloadAll` = the existing post-mutation refresh: re-list profiles and re-fetch `getProgress` for the active profile. Find it where profile deletion already refreshes state; if inline, extract it.)

- [ ] **Step 4: Verify**

Run: `cd app && npm test` — green (nothing pure changed).
Manual: `cd app && npm run dev`, open Settings. Confirm: Family sync card renders; with the deployed api (`VITE_SYNC_URL` set in `.env.production`, dev uses empty → skip live check or export `VITE_SYNC_URL` in the shell) create a family on one browser profile, join from a private window, complete a lesson in one, press "Carry it over now" in both, and see progress appear in the second. Confirm the app behaves identically with DevTools offline.

- [ ] **Step 5: Commit**

```bash
git add app/src/ui/FamilySync.jsx app/src/ui/Settings.jsx app/src/App.jsx app/src/content/voice.js
git commit -m "Phase 5: family sync settings card and app wiring"
```

---

### Task 8: Practice tempos

**Files:**
- Modify: `app/src/core/engine.js`, `app/src/ui/Song.jsx`, `app/src/App.jsx`, `app/src/content/voice.js`
- Test: extend `app/test/timed.test.js`

**Interfaces:**
- Produces: `TEMPO_CHOICES = [{id:'slow', mult:0.6}, {id:'medium', mult:0.8}, {id:'full', mult:1}]` and `atTempo(lesson, choiceId) -> lesson` exported from `engine.js`; Song props `tempoChoice`, `onTempo(choiceId)`.

- [ ] **Step 1: Write the failing test (append to app/test/timed.test.js)**

```js
import { TEMPO_CHOICES, atTempo } from '../src/core/engine.js'

test('atTempo scales the authored tempo and leaves everything else alone', () => {
  const lesson = { id: 's1', tempo: 90, notes: [{ note: 'C4', beats: 1 }] }
  assert.equal(atTempo(lesson, 'slow').tempo, 54)
  assert.equal(atTempo(lesson, 'medium').tempo, 72)
  assert.equal(atTempo(lesson, 'full'), lesson)
  assert.equal(atTempo(lesson, 'slow').notes, lesson.notes)
  assert.equal(atTempo({ id: 'd1', notes: [] }, 'slow').tempo, undefined)
  assert.equal(TEMPO_CHOICES.length, 3)
})
```

(Match the test file's existing import style for `test`/`assert`.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd app && node --test test/timed.test.js`
Expected: FAIL — `TEMPO_CHOICES` not exported.

- [ ] **Step 3: Implement**

In `app/src/core/engine.js` (near the top, after imports):

```js
/** Practice tempos (SR-CRS-09): every timed piece playable slower, all equally celebrated. */
export const TEMPO_CHOICES = [
  { id: 'slow', mult: 0.6 },
  { id: 'medium', mult: 0.8 },
  { id: 'full', mult: 1 }
]

export function atTempo(lesson, choiceId) {
  const c = TEMPO_CHOICES.find(t => t.id === choiceId)
  if (!lesson.tempo || !c || c.mult === 1) return lesson
  return { ...lesson, tempo: Math.round(lesson.tempo * c.mult) }
}
```

Voice (`voice.js`, inside `song:`):

```js
    tempos: { slow: 'Gently', medium: 'Easy pace', full: 'Full speed' },
    tempoLine: 'Any speed is a good speed.',
```

`app/src/App.jsx`:
- State: `const [tempoChoice, setTempoChoice] = useState('full')`.
- Where the song screen sets `lessonRef.current` (entering a song), keep the authored lesson in a new `baseLessonRef` and set `lessonRef.current = atTempo(baseLessonRef.current, tempoChoice)`.
- Handler passed to Song: `onTempo={(id) => { setTempoChoice(id); lessonRef.current = atTempo(baseLessonRef.current, id); setSong(startSong(lessonRef.current)) }}` — changing tempo restarts the piece (the grid changed; a mid-piece splice would judge unfairly). Match the actual `startSong(...)` call signature used elsewhere in App.jsx.
- The metronome/demo/backing code paths already read `lessonRef.current.tempo`, so they inherit the scaled tempo.

`app/src/ui/Song.jsx`: add props `tempoChoice, onTempo`; render a picker in the header row (next to "Hear it first"), only when `lesson.tempo` and not `song.done`:

```jsx
          {lesson.tempo && !song.done && (
            <div style="display:flex;gap:6px;align-items:center;" role="group" aria-label={v.tempoLine}>
              {['slow', 'medium', 'full'].map(id => (
                <button key={id} class="btn-quiet hit" onClick={() => onTempo(id)}
                  aria-pressed={tempoChoice === id}
                  style={`padding:7px 12px;font-size:12.5px;${tempoChoice === id ? 'background:var(--accent-soft);border-color:var(--line-strong);' : ''}`}>
                  {v.tempos[id]}
                </button>
              ))}
            </div>
          )}
```

- [ ] **Step 4: Run tests and verify**

Run: `cd app && npm test` — all green.
Manual: dev server, open a timed song (Unit 4+), switch to "Gently", confirm the pulse slows and completion celebrates identically.

- [ ] **Step 5: Commit**

```bash
git add app/src/core/engine.js app/src/ui/Song.jsx app/src/App.jsx app/src/content/voice.js app/test/timed.test.js
git commit -m "Phase 5: student-chosen practice tempos (SR-CRS-09)"
```

---

### Task 9: Steadiness view

**Files:**
- Create: `app/src/ui/Steadiness.jsx`
- Modify: `app/src/core/engine.js` (judgeOnset returns offsets; song state records them), `app/src/core/timing.js` (`steadinessPoints`), `app/src/ui/Song.jsx`, `app/src/content/voice.js`
- Test: extend `app/test/timed.test.js`

**Interfaces:**
- Produces: song state gains `offsets: []` (per-note offset in beats, aligned with `verdicts`); `steadinessPoints(verdicts, offsets) -> [{i, off, verdict}]` in `timing.js`; `<Steadiness points={} />` component.
- `judgeOnset` (internal to engine.js) now returns `{ verdict, offBeats } | null`; its two callers (`drillNote`, `songNote`) destructure it.

- [ ] **Step 1: Write the failing tests (append to app/test/timed.test.js)**

```js
import { steadinessPoints } from '../src/core/timing.js'
import { startSong, songNote } from '../src/core/engine.js'

test('songNote records offsets in beats alongside verdicts', () => {
  const lesson = {
    id: 's1', tempo: 60, // 1000ms per beat
    notes: [{ note: 'C4', beats: 1 }, { note: 'D4', beats: 1 }, { note: 'E4', beats: 1 }]
  }
  let s = startSong(lesson)
  s = songNote(s, lesson, { pitch: 60, timestamp: 1000 })
  s = songNote(s, lesson, { pitch: 62, timestamp: 2100 }) // 100ms late = +0.1 beats
  s = songNote(s, lesson, { pitch: 64, timestamp: 3100 }) // on the gap
  assert.ok(Math.abs(s.offsets[1] - 0.1) < 1e-9)
  assert.ok(Math.abs(s.offsets[2]) < 1e-9)
  assert.equal(s.offsets[0], undefined) // first onset anchors, never judged
})

test('steadinessPoints keeps judged notes only and clamps wild offsets', () => {
  const pts = steadinessPoints(
    [undefined, 'on', 'late', 'pause', 'early'],
    [undefined, 0, 0.4, 2.1, -1.5]
  )
  assert.deepEqual(pts.map(p => p.i), [1, 2, 4])
  assert.equal(pts[2].off, -0.6) // clamped
  assert.equal(pts[1].verdict, 'late')
})
```

(Adapt `startSong`/`songNote` call shapes to the existing tests in `timed.test.js` — they already construct song lessons; copy their fixture style. The key assertions are the `offsets` array contents.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd app && node --test test/timed.test.js`
Expected: FAIL — `s.offsets` undefined / `steadinessPoints` not exported.

- [ ] **Step 3: Implement**

`app/src/core/timing.js` — append:

```js
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x))

/**
 * Points for the steadiness view (SR-CRS-09): judged notes only, offset in
 * beats clamped to a gentle band. Rendering stays number-free — these values
 * become positions, never labels.
 */
export function steadinessPoints(verdicts, offsets) {
  return verdicts
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v === 'on' || v === 'early' || v === 'late')
    .map(({ v, i }) => ({ i, off: clamp(offsets[i] ?? 0, -0.6, 0.6), verdict: v }))
}
```

`app/src/core/engine.js` — change `judgeOnset` to also report the signed offset in beats, and record it in both callers:

```js
/** Grid verdict + signed offset (in beats) for a correct onset, or null (SR-CRS-08). */
function judgeOnset(state, tempo, prevBeats, timestamp) {
  if (!tempo || state.lastOnset === null || timestamp == null) return null
  const expectedMs = (prevBeats ?? 1) * beatMs(tempo)
  const actualMs = timestamp - state.lastOnset
  return {
    verdict: judgeGap(actualMs, expectedMs, tempo),
    offBeats: (actualMs - expectedMs) / beatMs(tempo)
  }
}
```

In `drillNote` (engine.js:60) replace the verdict block:

```js
  const judged = judgeOnset(state, tempo, step.targets[state.seqPos - 1]?.beats, ev.timestamp)
  const verdict = judged?.verdict ?? null
```

(rest of `drillNote` unchanged — it only uses `verdict`).

In `startSong`'s initial state add `offsets: []`. In `songNote` (engine.js:264-273):

```js
  const judged = state.misses === 0
    ? judgeOnset(state, lesson.tempo, lesson.notes[state.pos - 1]?.beats, ev.timestamp)
    : null
  const verdict = judged?.verdict ?? null
  const verdicts = verdict ? [...state.verdicts] : state.verdicts
  const offsets = verdict ? [...state.offsets] : state.offsets
  if (verdict) { verdicts[state.pos] = verdict; offsets[state.pos] = judged.offBeats }
  const timed = {
    lastOnset: lesson.tempo ? ev.timestamp : null,
    verdicts,
    offsets,
    pulse: verdict && verdict !== 'pause' ? voice.timing.live[verdict] : null
  }
```

Also thread `offsets: []` through the loop-reset paths if they rebuild `verdicts` (search `verdicts: []` in engine.js and mirror with `offsets: []`).

`app/src/ui/Steadiness.jsx`:

```jsx
/** Number-free steadiness timeline (SR-CRS-09 / §9.2): dots against the pulse line. */
import { VOICE } from '../content/voice.js'

const COLOR = { on: 'var(--accent-ink)', early: 'var(--hint)', late: 'var(--hint)' }

export function Steadiness({ points, width = 520, height = 96 }) {
  if (points.length < 4) return null
  const v = VOICE.timing.steadiness
  const midY = height / 2
  const x = (k) => 24 + (k / (points.length - 1)) * (width - 48)
  const y = (off) => midY - off * (height / 2 - 14) / 0.6 * -1 // late (positive) sits below the line
  return (
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
      <svg width={width} height={height} role="img" aria-label={v.label} style="max-width:100%;">
        <line x1="16" y1={midY} x2={width - 16} y2={midY} stroke="var(--line-strong)" stroke-width="1.5" stroke-dasharray="1 5" stroke-linecap="round" />
        {points.map((p, k) => (
          <circle key={p.i} cx={x(k)} cy={y(p.off)} r="5" fill={COLOR[p.verdict]} opacity={p.verdict === 'on' ? 1 : 0.85} />
        ))}
      </svg>
      <div style="display:flex;justify-content:space-between;width:100%;max-width:520px;font-size:11.5px;color:var(--ink-mid);font-style:italic;">
        <span>{v.eager}</span><span>{v.pulseWord}</span><span>{v.dreamy}</span>
      </div>
    </div>
  )
}
```

Note the vertical mapping: `early` (negative offset) plots above the line, `late` below; the three caption words sit under the plot, no numerals. Voice (`voice.js`, inside `timing:`):

```js
    steadiness: {
      label: 'How the notes sat against the pulse',
      eager: 'a little eager',
      pulseWord: 'right on the pulse',
      dreamy: 'taking their time'
    },
```

`app/src/ui/Song.jsx`: in the done overlay, under `song.timingMention`:

```jsx
            {song.done && lesson.tempo && (
              <div style="margin-top:14px;"><Steadiness points={steadinessPoints(song.verdicts, song.offsets)} /></div>
            )}
```

with imports `import { Steadiness } from './Steadiness.jsx'` and `import { steadinessPoints } from '../core/timing.js'`.

- [ ] **Step 4: Run tests and verify**

Run: `cd app && npm test` — all green (existing timed/engine tests confirm the judgeOnset refactor broke nothing).
Manual: play a timed song deliberately rushing a few notes; the done overlay shows dots drifting above the line, none labeled with numbers.

- [ ] **Step 5: Commit**

```bash
git add app/src/core/engine.js app/src/core/timing.js app/src/ui/Steadiness.jsx app/src/ui/Song.jsx app/src/content/voice.js app/test/timed.test.js
git commit -m "Phase 5: number-free steadiness view after timed pieces"
```

---

### Task 10: In-time backing tracks

**Files:**
- Modify: `app/src/core/engine.js` (`harmonyByBeat`), `app/src/audio/synth.js` (`playHarmony` gain option), `app/src/App.jsx` (backing scheduler effect), `app/src/content/voice.js` (toggle label if needed)
- Test: extend `app/test/timed.test.js`

**Interfaces:**
- Consumes: lesson `harmony` maps (note index → voicing, see `content/course.js:327`), `startMetronome(bpm, onBeat)` from `audio/metronome.js`, Task 8 scaled tempo.
- Produces: `harmonyByBeat(lesson) -> Map<beatIndex, voicing>` exported from `engine.js`.

- [ ] **Step 1: Write the failing test (append to app/test/timed.test.js)**

```js
import { harmonyByBeat } from '../src/core/engine.js'

test('harmonyByBeat places voicings at cumulative note beats', () => {
  const lesson = {
    tempo: 90,
    notes: [{ note: 'C4', beats: 1 }, { note: 'D4', beats: 2 }, { note: 'E4', beats: 1 }, { note: 'F4', beats: 1 }],
    harmony: { 0: ['C3', 'G3'], 2: ['G3', 'B3'], 3: ['C3', 'G3'] }
  }
  const m = harmonyByBeat(lesson)
  assert.deepEqual(m.get(0), ['C3', 'G3'])
  assert.deepEqual(m.get(3), ['G3', 'B3']) // note 2 starts after beats 1+2
  assert.deepEqual(m.get(4), ['C3', 'G3'])
  assert.equal(harmonyByBeat({ notes: [] }).size, 0)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd app && node --test test/timed.test.js`
Expected: FAIL — `harmonyByBeat` not exported.

- [ ] **Step 3: Implement**

`app/src/core/engine.js` — append:

```js
/**
 * Backing track schedule (SR-OUT-05): harmony voicings mapped from note
 * index to the beat where that note starts, so playback can follow the
 * metronome grid instead of reacting to the student.
 */
export function harmonyByBeat(lesson) {
  const map = new Map()
  if (!lesson.harmony) return map
  let beat = 0
  lesson.notes.forEach((n, i) => {
    if (lesson.harmony[i]) map.set(Math.round(beat), lesson.harmony[i])
    beat += n.beats ?? 1
  })
  return map
}
```

`app/src/audio/synth.js`: give `playHarmony` an options parameter with a gain scale, defaulting to current behavior — find the existing gain node value and multiply: `export function playHarmony(notes, { gain = 1 } = {})`, apply `gain` as a multiplier where the harmony gain is set (SR-OUT-05: backing stays quieter than the student; call sites pass `{ gain: 0.55 }` for backing, follow-mode call sites stay unchanged).

`app/src/App.jsx` — a dedicated backing effect (adapt the cleanup shape to how the existing metronome effect at App.jsx:167-176 stores and stops its handle):

```js
  // In-time backing (SR-OUT-05): voicings ride the metronome grid, quieter
  // than the student, only while the piece is underway.
  useEffect(() => {
    const lesson = lessonRef.current
    if (screen !== 'song' || !lesson?.tempo || !lesson.harmony || !accompany || demo.on || earPlaying || !song || song.done) return
    const byBeat = harmonyByBeat(lesson)
    let beatCount = -1
    const handle = startMetronome(lesson.tempo, () => {
      beatCount += 1
      const h = byBeat.get(beatCount % Math.ceil([...byBeat.keys()].reduce((a, b) => Math.max(a, b), 0) + 1))
      if (h) playHarmony(h, { gain: 0.55 })
    })
    return () => handle.stop()
  }, [screen, accompany, demo.on, earPlaying, song?.done, tempoChoice])
```

Simplification allowed: if looping the harmony past the piece end reads awkwardly in practice, drop the modulo and let voicings play once through (`const h = byBeat.get(beatCount)`); pick whichever sounds right at the piano and keep the code that matches. Ensure `playHarmony` output passes through the same self-hearing gate as the follow-mode path (check how App.jsx:383-384 guards it — typically `holdFor`/gate suppression; replicate that guard here).

Also: on the Song screen the existing "With me" toggle (`accompanyAvailable`) now schedules grid-based backing on timed pieces and remains reactive follow-mode on untimed ones — in App.jsx, skip the reactive `playHarmony` call at App.jsx:383 when `lesson.tempo` is set (the effect owns it):

```js
      if (advanced && accompanyRef.current && lesson.harmony && !lesson.tempo) {
```

- [ ] **Step 4: Run tests and verify**

Run: `cd app && npm test` — green.
Manual: timed song with harmony (course.js:481+), toggle "With me": backing sounds on the grid at the chosen practice tempo, audibly quieter than the student notes, and the mic pill never reacts to it.

- [ ] **Step 5: Commit**

```bash
git add app/src/core/engine.js app/src/audio/synth.js app/src/App.jsx app/test/timed.test.js
git commit -m "Phase 5: in-time backing tracks on the metronome grid (SR-OUT-05)"
```

---

### Task 11: C3 low-register thresholds + mic-check calibration step

**Files:**
- Modify: `app/src/audio/detect/tracker.js`, `app/src/audio/detect-worker.js`, `app/src/audio/mic.js`, `app/src/ui/MicCheck.jsx`, `app/src/App.jsx`, `app/src/content/voice.js`
- Test: extend `app/test/tracker.test.js`

**Interfaces:**
- Produces: `NoteTracker` constructor accepts `{ lowClarity, lowBelowMidi = 52 }` (E3 = midi 52); worker `config` message accepts `lowClarity`; `createMic({ lowClarity })` and `mic.setLowClarity(c)`; mic settings gain optional `lowClarity` persisted via existing `saveMicSettings` (`{enabled, clarity, detector, lowClarity}`).

- [ ] **Step 1: Write the failing test (append to app/test/tracker.test.js)**

```js
test('low-register notes use their own clarity threshold (SR-AUD-09)', () => {
  // A new pitch buffers one frame as pending before emitting, so feed twice.
  const t = new NoteTracker({ minClarity: 0.9, lowClarity: 0.8, stableFrames: 1 })
  // C3 = midi 48 ≈ 130.81 Hz — clarity 0.85 passes the low bar, fails the normal one
  t.feed({ freq: 130.81, clarity: 0.85 }, 0.1, 100)
  const low = t.feed({ freq: 130.81, clarity: 0.85 }, 0.1, 120)
  assert.equal(low?.pitch, 48)
  // C4 = midi 60 ≈ 261.63 Hz — same clarity must still be rejected above the low band
  const t2 = new NoteTracker({ minClarity: 0.9, lowClarity: 0.8, stableFrames: 1 })
  t2.feed({ freq: 261.63, clarity: 0.85 }, 0.1, 100)
  assert.equal(t2.feed({ freq: 261.63, clarity: 0.85 }, 0.1, 120), null)
})

test('lowClarity defaults to minClarity when not given', () => {
  const t = new NoteTracker({ minClarity: 0.9, stableFrames: 1 })
  t.feed({ freq: 130.81, clarity: 0.85 }, 0.1, 100)
  assert.equal(t.feed({ freq: 130.81, clarity: 0.85 }, 0.1, 120), null)
})
```

(Match the existing import/fixture style in `tracker.test.js`; it already constructs `NoteTracker` and feeds detections.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd app && node --test test/tracker.test.js`
Expected: FAIL — low note rejected (0.85 < 0.9).

- [ ] **Step 3: Implement**

`app/src/audio/detect/tracker.js` — constructor gains the two options; `feed` computes the midi before thresholding so the threshold can depend on register:

```js
  constructor({ minClarity = 0.9, lowClarity = null, lowBelowMidi = 52, stableFrames = 2, silenceFrames = 3, restrikeFactor = 1.5 } = {}) {
    this.minClarity = minClarity;
    this.lowClarity = lowClarity ?? minClarity;
    this.lowBelowMidi = lowBelowMidi;
```

and replace the first line of `feed`:

```js
    const candidate = detection ? freqToMidi(detection.freq) : null;
    const needed = candidate !== null && candidate < this.lowBelowMidi ? this.lowClarity : this.minClarity;
    const midi = detection && detection.clarity >= needed ? candidate : null;
```

`app/src/audio/detect-worker.js`: keep `lowClarity` in the worker's config state and pass it through both `new NoteTracker(...)` sites (detect-worker.js:53 and :59): `new NoteTracker({ minClarity: clarity, lowClarity })` — mirroring how `clarity` is stored between messages.

`app/src/audio/mic.js`: `createMic({ ..., lowClarity = null })`; include `lowClarity` in the initial `config` postMessage (mic.js:46) and add alongside `setClarity` (mic.js:146):

```js
    setLowClarity(c) {
      lowClarity = c
      worker?.postMessage({ type: 'config', lowClarity: c })
    },
```

(match the surrounding closure style — `clarity` is likely a captured let; do the same for `lowClarity`).

`app/src/ui/MicCheck.jsx` — a new optional stage after `confirm`. Add stage `'low'`: a button on the confirm stage offers it; entering it starts a relaxation timer that lowers a working `lowClarity` from the current clarity down to a floor until a low note is heard:

```jsx
  const [lowStage, setLowStage] = useState('idle') // idle | listening | heard
  const lowClarityRef = useRef(null)
  const relaxRef = useRef(null)

  const beginLow = () => {
    setLowStage('listening')
    lowClarityRef.current = toClarity(sens)
    micRef.current?.setLowClarity(lowClarityRef.current)
    relaxRef.current = setInterval(() => {
      lowClarityRef.current = Math.max(0.78, lowClarityRef.current - 0.03)
      micRef.current?.setLowClarity(lowClarityRef.current)
    }, 2000)
  }
```

In the existing `onNote` handler add: when `lowStage === 'listening'` (use a ref mirror of `lowStage` — the closure is created once in `begin`) and `ev.pitch < 55`, `clearInterval(relaxRef.current)`, `setLowStage('heard')`. Clear the interval in the unmount effect too. The confirm-stage UI gains:

```jsx
        {lowStage === 'idle' && <button class="btn-quiet" onClick={beginLow}>{v.lowOffer}</button>}
        {lowStage === 'listening' && <div style="font-size:14px;color:var(--ink-soft);">{v.lowListening}</div>}
        {lowStage === 'heard' && <div style="font-size:14px;color:var(--ink-mid);">{v.lowHeard}</div>}
```

and `onDone` passes the calibration out: wherever MicCheck currently calls `onDone({ enabled, clarity, ... })`, include `lowClarity: lowStage === 'heard' ? lowClarityRef.current : undefined`.

Voice (`voice.js`, inside the mic-check section — find the object MicCheck reads, e.g. `VOICE.micCheck` or `VOICE.ears`):

```js
    lowOffer: 'One more, if you like — play your lowest C, down on the left.',
    lowListening: 'Listening low… play that deep C a few times.',
    lowHeard: 'Got it — the deep notes come through now.',
```

`app/src/App.jsx`: where micSettings are saved after MicCheck (`saveMicSettings`) persist `lowClarity` when present, and where `createMic` is called pass `lowClarity: micSettings?.lowClarity` (calibration is device-local — it lives in `mic` app-store key, which sync never touches).

- [ ] **Step 4: Run tests and verify**

Run: `cd app && npm test` — green.
Manual (needs the real piano or a low test tone): run "Check my ears" from Settings, take the low-note step, watch it settle; confirm normal-register detection is unchanged.

- [ ] **Step 5: Commit**

```bash
git add app/src/audio/detect/tracker.js app/src/audio/detect-worker.js app/src/audio/mic.js app/src/ui/MicCheck.jsx app/src/App.jsx app/src/content/voice.js app/test/tracker.test.js
git commit -m "Phase 5: C3 low-register clarity band and mic-check calibration (SR-AUD-09)"
```

---

### Task 12: Local-first regression gate, deploy, plan status

**Files:**
- Modify: `PLAN.md` (Phase 5 build status), `app/README.md` if anything drifted

- [ ] **Step 1: Full test sweep**

```bash
cd app && npm test          # expect: 0 fail (149+ pass, new sync/tempo/steadiness/tracker tests included)
cd ../server && npm test    # expect: 0 fail (13+)
```

- [ ] **Step 2: Local-first regression (the Phase 5 gate)**

```bash
cd app && VITE_SYNC_URL=https://unreachable.invalid npm run build && npm run preview
```

In the browser against the preview: create a profile, complete a lesson step, play a song, open Settings — everything must behave exactly as v1 with zero student-visible errors; the Family sync card shows the unlinked state; "Start a family" fails with only the quiet inline line. Check the console for unhandled rejections (none allowed).

- [ ] **Step 3: Two-device sync smoke against the real api**

Rebuild with the real `.env.production` (`npm run build`), `npm run preview`, and in two browser contexts: create family on A, join on B, complete a lesson on A, sync both, confirm it appears on B. Then delete-everywhere from A and confirm B's next manual sync shows unlinked-after-401 behavior is acceptable (B keeps local data; leaving B manually is fine for beta).

- [ ] **Step 4: Deploy the app and update the plan**

```bash
cd app && railway up --service web --ci -m "Phase 5: family sync, practice tempos, steadiness view, backing, C3 prep"
```

Verify the deployed site loads and the api answers from it (create/delete a throwaway family). Update `PLAN.md` Phase 5 with a build-status paragraph in the same voice as Phases 2–4 (what is built and test-covered; what remains open — e.g. real-family sync trial, low-note calibration on the beta pianos). Note the SR-BCK-02 deviation (code+PIN interim, email/Apple auth deferred) in the status line.

- [ ] **Step 5: Final commit and push**

```bash
git add PLAN.md app/README.md
git commit -m "Phase 5: build status - sync, tempo depth, C3 prep complete"
git push
```

---

## Self-Review Notes

- Spec coverage: backend+auth (Tasks 2–5), shared merge (1, 4), sync client (6), Settings UI (7), practice tempos (8), steadiness (9), backing (10), C3 prep (11), regression gate + deploy (12). Spec section 7 error handling is embedded in Tasks 3, 4, 6 (status codes, silent client failures); the profile-duplication caveat is inherent to Task 6's union-by-id.
- The `judgeOnset` return-shape change (Task 9) touches `drillNote` and `songNote` only — both call sites are shown.
- Tasks 7, 10, 11 modify `App.jsx`/`MicCheck.jsx` regions this plan describes by anchor rather than verbatim diff; the executor must read the file first and keep the existing wiring style (refs mirroring state, `this.to()`-style cleanup does not exist here — use effect cleanups as shown in existing effects).
