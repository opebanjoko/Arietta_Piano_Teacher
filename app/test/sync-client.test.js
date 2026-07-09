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
