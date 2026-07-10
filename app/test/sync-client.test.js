import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSyncClient } from '../src/sync/client.js'
import { mergeDocs } from '../src/sync/merge.js'
import { saveSettings } from '../src/store/progress.js'

/** Minimal in-memory stand-in for the db handle in src/store/db.js. */
function fakeDb() {
  const stores = { profiles: new Map(), progress: new Map(), practice: new Map(), app: new Map() }
  const key = (store, v) => store === 'progress' ? `${v.profileId}|${v.lessonId}`
    : store === 'practice' ? `${v.profileId}|${v.packId}` : (v.id ?? v.key)
  return {
    get: async (s, k) => stores[s].get(Array.isArray(k) ? k.join('|') : k) ?? undefined,
    getAll: async (s) => [...stores[s].values()],
    put: async (s, v) => { stores[s].set(key(s, v), v) },
    delete: async (s, k) => { stores[s].delete(Array.isArray(k) ? k.join('|') : k) },
    _stores: stores
  }
}

/**
 * Fake server: real merge semantics not needed here — echo store keyed by
 * profileId, plus a tombstones map (profileId -> deleted_at) modeling the
 * real server's progress_docs.deleted_at column. PUT deletes add tombstones;
 * a pushed doc revives one only if its updatedAt is newer than deleted_at
 * (server/src/routes.js pushSync). GET and PUT both return the full
 * { docs, deleted } state, matching householdState().
 */
function fakeServer() {
  const docs = new Map()
  const tombstones = new Map()
  const calls = []
  let clock = 1
  const fetchFn = async (url, opts = {}) => {
    calls.push({ url, method: opts.method ?? 'GET' })
    const path = new URL(url).pathname
    const body = opts.body ? JSON.parse(opts.body) : {}
    const json = (status, data) => ({ ok: status < 400, status, json: async () => data })
    if (path === '/households' && opts.method === 'POST') return json(201, { code: 'ABCDEF', token: 't0ken' })
    if (path === '/households/link') return body.pin === '4321' ? json(200, { token: 't0ken' }) : json(401, { error: 'wrong code or pin' })
    if (path === '/sync' && opts.method === 'PUT') {
      for (const p of body.deleted ?? []) { docs.delete(p); tombstones.set(p, clock++) }
      for (const d of body.docs ?? []) {
        const deletedAt = tombstones.get(d.profileId)
        if (deletedAt != null && !((d.updatedAt ?? 0) > deletedAt)) continue // tombstone holds
        tombstones.delete(d.profileId)
        docs.set(d.profileId, d)
      }
      return json(200, { docs: [...docs.values()], deleted: [...tombstones.keys()] })
    }
    if (path === '/sync') return json(200, { docs: [...docs.values()], deleted: [...tombstones.keys()] })
    if (path === '/households' && opts.method === 'DELETE') { docs.clear(); tombstones.clear(); return json(204, {}) }
    return json(404, { error: 'not found' })
  }
  return { docs, tombstones, calls, fetchFn }
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

test('cross-device deletion: a server tombstone newer than the local doc wipes local p1 rows', async () => {
  const db = fakeDb()
  await db.put('profiles', { id: 'p1', name: 'Maya', createdAt: 1 })
  await db.put('progress', { profileId: 'p1', lessonId: 'l1', completed: true, lastPlayedAt: 5 })
  await db.put('practice', { profileId: 'p1', packId: 'k1', completedCount: 2, lastPracticedAt: 4 })
  await db.put('app', { key: 'settings:p1', value: { accent: '#B7813A' } })
  await db.put('app', { key: 'sync', value: { token: 't0ken', code: 'ABCDEF', deleted: [], lastSyncAt: null } })
  const srv = fakeServer()
  srv.tombstones.set('p1', 1000) // deleted_at is after p1's local lastPlayedAt of 5
  const c = createSyncClient({ db, url: 'https://api.test', fetchFn: srv.fetchFn })
  assert.equal(await c.syncNow(), 'ok')
  assert.equal(await db.get('profiles', 'p1'), undefined)
  assert.equal(await db.get('progress', ['p1', 'l1']), undefined)
  assert.equal(await db.get('practice', ['p1', 'k1']), undefined)
  assert.equal(await db.get('app', 'settings:p1'), undefined)
  assert.equal(srv.docs.has('p1'), false)
  assert.equal(srv.tombstones.has('p1'), true)
})

test('legitimate revive: a local doc newer than the tombstone brings p1 back on the server and keeps it local', async () => {
  const db = fakeDb()
  await db.put('profiles', { id: 'p1', name: 'Maya', createdAt: 1 })
  await db.put('progress', { profileId: 'p1', lessonId: 'l1', completed: true, lastPlayedAt: 2000 })
  await db.put('app', { key: 'sync', value: { token: 't0ken', code: 'ABCDEF', deleted: [], lastSyncAt: null } })
  const srv = fakeServer()
  srv.tombstones.set('p1', 1000) // deleted_at is before p1's local lastPlayedAt of 2000
  const c = createSyncClient({ db, url: 'https://api.test', fetchFn: srv.fetchFn })
  assert.equal(await c.syncNow(), 'ok')
  assert.equal(srv.docs.has('p1'), true)
  assert.equal(srv.tombstones.has('p1'), false)
  assert.deepEqual(await db.get('profiles', 'p1'), { id: 'p1', name: 'Maya', createdAt: 1 })
})

/** Wraps a server fetchFn so its first call blocks until release() is called. */
function gatedFetch(fetchFn) {
  let release
  const gate = new Promise(r => { release = r })
  let n = 0
  return { release, fetchFn: async (url, opts) => { if (++n === 1) await gate; return fetchFn(url, opts) } }
}

test('leave during an in-flight sync stays left: the success writeback is skipped', async () => {
  const db = fakeDb()
  await db.put('app', { key: 'sync', value: { token: 't0ken', code: 'ABCDEF', deleted: [], lastSyncAt: null } })
  const srv = fakeServer()
  const gated = gatedFetch(srv.fetchFn)
  const c = createSyncClient({ db, url: 'https://api.test', fetchFn: gated.fetchFn })
  const p = c.syncNow()
  await c.leave()
  gated.release()
  assert.equal(await p, 'ok')
  assert.equal((await c.getState()).linked, false)
  assert.equal(await db.get('app', 'sync'), undefined)
})

test('a tombstone queued during an in-flight sync survives the writeback and pushes next round', async () => {
  const db = fakeDb()
  await db.put('app', { key: 'sync', value: { token: 't0ken', code: 'ABCDEF', deleted: [], lastSyncAt: null } })
  const srv = fakeServer()
  srv.docs.set('pGone', { profileId: 'pGone', name: 'Old', createdAt: 1, lessons: {}, settings: {}, updatedAt: 0 })
  const gated = gatedFetch(srv.fetchFn)
  const c = createSyncClient({ db, url: 'https://api.test', fetchFn: gated.fetchFn })
  const p = c.syncNow()
  await c.noteProfileDeleted('pGone')
  gated.release()
  assert.equal(await p, 'ok')
  assert.deepEqual((await db.get('app', 'sync')).value.deleted, ['pGone'])
  assert.equal(await c.syncNow(), 'ok')
  assert.equal(srv.docs.has('pGone'), false)
  assert.equal(srv.tombstones.has('pGone'), true)
  assert.deepEqual((await db.get('app', 'sync')).value.deleted, [])
})

test('reentrancy: two concurrent syncNow calls collapse into one round trip', async () => {
  const db = fakeDb()
  await db.put('app', { key: 'sync', value: { token: 't0ken', code: 'ABCDEF', deleted: [], lastSyncAt: null } })
  const srv = fakeServer()
  const c = createSyncClient({ db, url: 'https://api.test', fetchFn: srv.fetchFn })
  const [a, b] = await Promise.all([c.syncNow(), c.syncNow()])
  assert.equal(a, 'ok')
  assert.equal(b, 'ok')
  assert.equal(srv.calls.length, 2) // one GET + one PUT, not two rounds
})

/**
 * Real-merge fake server (unlike fakeServer() above, which just overwrites):
 * runs the actual mergeDocs on push the way server/src/routes.js does —
 * stored doc first, incoming doc second — so a tie keeps the stored side.
 * Needed to reproduce Finding 1: a settings-only push whose clock ties the
 * server copy gets its settings silently reverted by that tie-break.
 */
function realMergeServer() {
  const docs = new Map()
  const fetchFn = async (url, opts = {}) => {
    const path = new URL(url).pathname
    const body = opts.body ? JSON.parse(opts.body) : {}
    const json = (status, data) => ({ ok: status < 400, status, json: async () => data })
    if (path === '/sync' && opts.method === 'PUT') {
      for (const incoming of body.docs ?? []) docs.set(incoming.profileId, mergeDocs(docs.get(incoming.profileId) ?? null, incoming))
      return json(200, { docs: [...docs.values()], deleted: [] })
    }
    if (path === '/sync') return json(200, { docs: [...docs.values()], deleted: [] })
    return json(404, { error: 'not found' })
  }
  return { docs, fetchFn }
}

test('a settings-only change survives a sync round trip instead of being reverted by a merge tie (Finding 1)', async () => {
  const db = fakeDb()
  await db.put('profiles', { id: 'p1', name: 'Maya', createdAt: 1 })
  await db.put('progress', { profileId: 'p1', lessonId: 'l1', completed: true, lastPlayedAt: 5 })
  await db.put('app', { key: 'sync', value: { token: 't0ken', code: 'ABCDEF', deleted: [], lastSyncAt: null } })
  await saveSettings(db, 'p1', { accent: '#B7813A' }, 5) // stamped the same as the lesson's lastPlayedAt

  const srv = realMergeServer()
  const c = createSyncClient({ db, url: 'https://api.test', fetchFn: srv.fetchFn })
  assert.equal(await c.syncNow(), 'ok') // seeds the server with the original settings

  // settings-only change, no new lesson activity — its own clock must still advance
  await saveSettings(db, 'p1', { accent: '#6F8C5A' }, 999)

  assert.equal(await c.syncNow(), 'ok')
  assert.equal((await db.get('app', 'settings:p1')).value.accent, '#6F8C5A')
  assert.equal(srv.docs.get('p1').settings.accent, '#6F8C5A')
})

test('401 from GET or PUT /sync auto-unlinks (no backoff), keeping local data intact', async () => {
  const db = fakeDb()
  await db.put('profiles', { id: 'p1', name: 'Maya', createdAt: 1 })
  await db.put('progress', { profileId: 'p1', lessonId: 'l1', completed: true, lastPlayedAt: 5 })
  await db.put('app', { key: 'sync', value: { token: 'revoked', code: 'ABCDEF', deleted: [], lastSyncAt: null } })
  const fetchFn = async () => ({ ok: false, status: 401, json: async () => ({ error: 'unknown token' }) })
  const c = createSyncClient({ db, url: 'https://api.test', fetchFn })
  assert.equal(await c.syncNow(), 'off')
  assert.equal(await db.get('app', 'sync'), undefined)
  assert.deepEqual(await c.getState(), { linked: false, code: null, lastSyncAt: null, failing: false })
  assert.deepEqual(await db.get('profiles', 'p1'), { id: 'p1', name: 'Maya', createdAt: 1 })
  assert.deepEqual(await db.get('progress', ['p1', 'l1']), { profileId: 'p1', lessonId: 'l1', completed: true, lastPlayedAt: 5 })
})
