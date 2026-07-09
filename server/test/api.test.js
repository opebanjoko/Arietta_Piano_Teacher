import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openDb } from '../src/db.js'
import { createApp } from '../src/index.js'
import { resetRateLimit } from '../src/routes.js'

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

test('malformed code 401s and never locks out (proves no rate-limit state recorded)', async () => {
  const s = await start()
  for (let i = 0; i < 10; i++) {
    const res = await s.call('POST', '/households/link', { code: 'zzz', pin: '0000' })
    assert.equal(res.status, 401)
  }
  // a 40-char junk code also stays 401, never 429 (a real code would lock after 5 fails)
  const long = await s.call('POST', '/households/link', { code: 'a'.repeat(40), pin: '0000' })
  assert.equal(long.status, 401)
  await s.close()
})

test('many junk-code attempts do not affect a real code afterwards', async () => {
  const s = await start()
  const { code } = await (await s.call('POST', '/households', { pin: '4321' })).json()
  for (let i = 0; i < 20; i++) {
    assert.equal((await s.call('POST', '/households/link', { code: 'nope', pin: '0000' })).status, 401)
  }
  const ok = await s.call('POST', '/households/link', { code, pin: '4321' })
  assert.equal(ok.status, 200)
  await s.close()
})

test('flooding valid-shaped codes past the cap does not evict an active lockout', async () => {
  resetRateLimit(5) // small cap so the test can overflow it quickly
  const s = await start()
  const { code } = await (await s.call('POST', '/households', { pin: '4321' })).json()
  for (let i = 0; i < 5; i++) {
    assert.equal((await s.call('POST', '/households/link', { code, pin: '9999' })).status, 401)
  }
  // 20 distinct CODE_RE-valid nonexistent codes, each recorded in the attempts map
  const alphabet = '23456789ABCDEFGHJKMN'
  for (const ch of alphabet) {
    assert.equal((await s.call('POST', '/households/link', { code: `QQQQQ${ch}`, pin: '0000' })).status, 401)
  }
  const locked = await s.call('POST', '/households/link', { code, pin: '4321' })
  assert.equal(locked.status, 429)
  resetRateLimit()
  await s.close()
})

test('oversized body does not crash the server; next request still works', async () => {
  const s = await start()
  const big = 'x'.repeat(600 * 1024)
  try {
    await s.call('POST', '/households', { pin: '4321', junk: big })
  } catch {
    // a reset connection instead of a 400 is acceptable; the server must keep running
  }
  const res = await s.call('POST', '/households', { pin: '4321' })
  assert.equal(res.status, 201)
  await s.close()
})

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

test('five wrong-pin deletes lock the household out; other household unaffected', async () => {
  const s = await start()
  const { token } = await (await s.call('POST', '/households', { pin: '4321' })).json()
  const other = await (await s.call('POST', '/households', { pin: '4321' })).json()
  for (let i = 0; i < 5; i++) {
    assert.equal((await s.call('DELETE', '/households', { pin: '9999' }, token)).status, 401)
  }
  const locked = await s.call('DELETE', '/households', { pin: '4321' }, token)
  assert.equal(locked.status, 429)
  assert.deepEqual(await locked.json(), { error: 'too many tries' })
  // lockout is keyed per household: the other household can still delete
  assert.equal((await s.call('DELETE', '/households', { pin: '4321' }, other.token)).status, 204)
  await s.close()
})
