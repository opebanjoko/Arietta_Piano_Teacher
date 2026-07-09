import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRecovery } from '../src/audio/recovery.js'

/** Manual scheduler: capture callbacks, fire them explicitly. */
function scheduler() {
  const timers = new Map()
  let id = 0
  return {
    schedule: (fn, ms) => { timers.set(++id, { fn, ms }); return id },
    cancel: (t) => timers.delete(t),
    fire: () => { const [k, t] = [...timers.entries()][0]; timers.delete(k); t.fn() },
    pending: () => [...timers.values()].map(t => t.ms)
  }
}

function harness({ results = [] } = {}) {
  const calls = { restarts: 0, states: [] }
  const sch = scheduler()
  const rec = createRecovery({
    restart: () => { calls.restarts++; return results.shift() === 'fail' ? Promise.reject(new Error('no mic')) : Promise.resolve() },
    onState: (s) => calls.states.push(s),
    schedule: sch.schedule,
    cancel: sch.cancel
  })
  return { rec, calls, sch }
}

const tick = () => new Promise(r => setTimeout(r, 0))

test('track loss while visible restarts immediately and recovers', async () => {
  const { rec, calls } = harness()
  rec.trackEnded()
  await tick()
  assert.deepEqual(calls.states, ['interrupted'])
  assert.equal(calls.restarts, 1)
})

test('interruption while hidden waits for visibility to return', async () => {
  const { rec, calls } = harness()
  rec.visibility(false)
  rec.ctxStateChanged('interrupted')
  await tick()
  assert.equal(calls.restarts, 0)
  rec.visibility(true)
  await tick()
  assert.equal(calls.restarts, 1)
  assert.deepEqual(calls.states, ['interrupted'])
})

test('running ctx state is ignored', async () => {
  const { rec, calls } = harness()
  rec.ctxStateChanged('running')
  await tick()
  assert.equal(calls.restarts, 0)
  assert.deepEqual(calls.states, [])
})

test('failed restarts retry on the delay ladder then give up as lost', async () => {
  const { rec, calls, sch } = harness({ results: ['fail', 'fail', 'fail'] })
  rec.trackEnded()
  await tick()
  assert.equal(calls.restarts, 1)
  assert.deepEqual(sch.pending(), [1000])
  sch.fire(); await tick()
  assert.equal(calls.restarts, 2)
  assert.deepEqual(sch.pending(), [3000])
  sch.fire(); await tick()
  assert.equal(calls.restarts, 3)
  assert.deepEqual(calls.states, ['interrupted', 'lost'])
  assert.deepEqual(sch.pending(), [])
})

test('a retry succeeding ends the cycle cleanly', async () => {
  const { rec, calls, sch } = harness({ results: ['fail'] })
  rec.trackEnded()
  await tick()
  sch.fire(); await tick()
  assert.equal(calls.restarts, 2)
  assert.deepEqual(calls.states, ['interrupted'])
  // a later break starts a fresh cycle with fresh delays
  rec.trackEnded()
  await tick()
  assert.equal(calls.restarts, 3)
  assert.deepEqual(calls.states, ['interrupted', 'interrupted'])
})

test('break events during an in-flight restart do not double-restart', async () => {
  let release
  const calls = { restarts: 0, states: [] }
  const rec = createRecovery({
    restart: () => { calls.restarts++; return new Promise(r => { release = r }) },
    onState: (s) => calls.states.push(s)
  })
  rec.trackEnded()
  rec.ctxStateChanged('suspended')
  rec.trackEnded()
  await tick()
  assert.equal(calls.restarts, 1)
  release(); await tick()
  assert.equal(calls.restarts, 1)
})

test('stop() cancels scheduled retries and ignores further events', async () => {
  const { rec, calls, sch } = harness({ results: ['fail'] })
  rec.trackEnded()
  await tick()
  assert.deepEqual(sch.pending(), [1000])
  rec.stop()
  assert.deepEqual(sch.pending(), [])
  rec.trackEnded()
  await tick()
  assert.equal(calls.restarts, 1)
  assert.deepEqual(calls.states, ['interrupted'])
})
