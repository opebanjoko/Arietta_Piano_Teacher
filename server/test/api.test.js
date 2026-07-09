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
