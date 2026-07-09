# Phase 4 Hardening & Beta Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Arietta survive iPad Safari audio interruptions, pass an accessibility bar, report detector timing, and give beta families an on-device diagnostics export — the buildable half of PLAN.md Phase 4.

**Architecture:** A pure recovery state machine (`recovery.js`) is owned and driven by the mic controller (`mic.js`), which detects track loss / context interruption / backgrounding and rebuilds its own audio graph, reporting new `interrupted`/`lost` states through the existing `onState` seam. Diagnostics are a capped rolling log in the existing IndexedDB `app` store, surfaced in Settings with a copy/share export. Accessibility and performance are targeted fixes plus regression tests.

**Tech Stack:** Preact 10 + Vite 8 (PWA), plain `node --test` + `node:assert/strict` for tests (no vitest, no jsdom — tests import pure ES modules only), IndexedDB via the thin `db.js` wrapper.

## Global Constraints

- Working directory for all commands: `app/` inside the repo root.
- Test command: `npm test` (runs `node --test 'test/*.test.js'`). Tests must not import browser-only modules (`mic.js`, `synth.js`, `metronome.js`, anything touching `window`/`document`/Vite `?worker&url` imports).
- SR-PLT-04: zero network calls at runtime, no analytics. The diagnostics log records ONLY: app boots, unhandled errors, mic interruption/recovery/loss. No usage or progress tracking.
- No emojis anywhere in code, strings, or logs.
- All student/parent-facing strings live in `app/src/content/voice.js` (BO review applies to new strings).
- Never edit shipped entries in `MIGRATIONS` in `app/src/store/db.js` (this plan adds no migration).
- No numeric scores or gamification in UI copy.
- Commit after each task; messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Recovery state machine (pure module)

**Files:**
- Create: `app/src/audio/recovery.js`
- Test: `app/test/recovery.test.js`

**Interfaces:**
- Consumes: nothing (pure; injected hooks).
- Produces: `createRecovery({ restart, onState, schedule?, cancel?, delays? })` returning `{ trackEnded(), ctxStateChanged(state), visibility(visible), stop() }`. `restart: () => Promise<void>` (resolves = mic graph rebuilt), `onState(s)` called with `'interrupted'` (recovery began) and `'lost'` (retries exhausted) — never `'listening'` (the mic's own wire() reports that). `delays` defaults to `[1000, 3000]` ms between retries after the immediate first attempt.

Semantics to implement (and test):
- `trackEnded()` or `ctxStateChanged('interrupted')` or `ctxStateChanged('suspended')` marks the graph broken. Any other state string is ignored.
- If broken while the page is visible, recovery starts immediately; if hidden (`visibility(false)` was last), recovery waits until `visibility(true)`.
- Recovery: emit `onState('interrupted')` once, then call `restart()`. Success → reset to healthy (attempt counter cleared, no further calls). Failure → schedule the next attempt after `delays[0]`, then `delays[1]`; when delays are exhausted and the last attempt fails → `onState('lost')` and stop retrying. A later break event (or visibility return) starts a fresh cycle.
- Re-entrant events during an in-flight `restart()` do not start a second concurrent cycle.
- `stop()` cancels any scheduled retry and ignores all further events.

- [ ] **Step 1: Write the failing test**

```js
// app/test/recovery.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test test/recovery.test.js`
Expected: FAIL — `Cannot find module '../src/audio/recovery.js'`

- [ ] **Step 3: Write the implementation**

```js
// app/src/audio/recovery.js
/**
 * Mic recovery state machine (SR-PLT-02): pure logic, injected effects, so it
 * unit-tests under node. The mic controller feeds it break events (track
 * ended, AudioContext interrupted/suspended, page hidden/visible) and it
 * decides when to call restart(), retrying on a short ladder before giving
 * up as 'lost'. Recovery never runs while the page is hidden.
 */
export function createRecovery({
  restart, onState,
  schedule = (fn, ms) => setTimeout(fn, ms),
  cancel = clearTimeout,
  delays = [1000, 3000]
}) {
  let broken = false
  let visible = true
  let attempting = false
  let attempt = 0
  let timer = null
  let stopped = false

  async function tryRestart() {
    attempting = true
    try {
      await restart()
      if (stopped) return
      broken = false
      attempting = false
      attempt = 0
    } catch {
      if (stopped) return
      attempting = false
      if (attempt < delays.length) {
        timer = schedule(() => { timer = null; if (!stopped && broken && visible) tryRestart() }, delays[attempt++])
      } else {
        onState('lost')
      }
    }
  }

  function begin() {
    if (stopped || attempting || timer !== null || !broken || !visible) return
    attempt = 0
    onState('interrupted')
    tryRestart()
  }

  function broke() {
    if (stopped || broken) return
    broken = true
    begin()
  }

  return {
    trackEnded() { broke() },
    ctxStateChanged(state) {
      if (state === 'interrupted' || state === 'suspended') broke()
    },
    visibility(v) {
      visible = v
      if (v) begin()
    },
    stop() {
      stopped = true
      if (timer !== null) { cancel(timer); timer = null }
    }
  }
}
```

Note the subtle points the tests pin down: `begin()` emits `'interrupted'` once per cycle (guarded by `attempting`/`timer`); a repeat break while already broken is a no-op; after `'lost'`, `broken` stays true so a visibility return starts a fresh `begin()` (that is intended — coming back to the app is a fresh chance to recover; the second `trackEnded()` in the "fresh cycle" test works because success reset `broken` to false).

Careful with the "fresh cycle" path after `lost`: `broke()` returns early when `broken` is already true, so after exhaustion nothing restarts until `visibility(true)` fires `begin()` — but `begin()` resets `attempt = 0` only when it runs. Confirm the last test in Step 1 passes exactly as written before moving on.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && node --test test/recovery.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Run the whole suite**

Run: `cd app && npm test`
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add app/src/audio/recovery.js app/test/recovery.test.js
git commit -m "Phase 4: mic recovery state machine (SR-PLT-02)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Self-healing mic + interrupted pill copy

**Files:**
- Modify: `app/src/audio/mic.js`
- Modify: `app/src/content/voice.js` (add `VOICE.pill`)
- Modify: `app/src/app.jsx:433-437` (pill mapping)

**Interfaces:**
- Consumes: `createRecovery` from Task 1 (exact signature above).
- Produces: mic `onState` now also emits `'interrupted'` and `'lost'`. `VOICE.pill.waking` string. No API change for other callers.

- [ ] **Step 1: Rewrite `app/src/audio/mic.js` with recovery wiring**

Replace the whole file with:

```js
/**
 * Mic controller (SR-AUD-01/02/12/13): capture -> worklet -> worker -> NoteEvents.
 * Echo cancellation and auto-gain are disabled (they distort pitch content);
 * noise suppression is configurable from calibration. Audio buffers exist only
 * in memory inside the worklet/worker — nothing is persisted or transmitted.
 *
 * Interruption handling (SR-PLT-02): iPad Safari ends the mic track or
 * suspends the AudioContext on backgrounding, Siri, or calls. The controller
 * watches for that and rebuilds its own graph via recovery.js, reporting
 * 'interrupted' while it works and 'lost' if it gives up — the tap keyboard
 * carries the lesson either way (SR-AUD-12).
 */
import workletUrl from './capture-worklet.js?worker&url'
import { registerMic } from './gate.js'
import { createRecovery } from './recovery.js'

export function createMic({ onNote, onOnset, onState, onStats, detector = 'mpm', clarity = 0.9, noiseSuppression = false } = {}) {
  let ctx = null
  let worker = null
  let stream = null
  let ownsStream = false // injected streams belong to their injector
  let state = 'idle'
  let resumeTO = null
  let recovery = null
  let closing = false // our own teardown must not read as an interruption

  const setState = (s) => { if (s !== state) { state = s; onState?.(s) } }
  const onVisibility = () => recovery?.visibility(!document.hidden)

  async function wire(mediaStream) {
    stream = mediaStream
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') await ctx.resume()
    await ctx.audioWorklet.addModule(workletUrl)
    const node = new AudioWorkletNode(ctx, 'arietta-capture', { numberOfOutputs: 1 })
    const silent = ctx.createGain()
    silent.gain.value = 0
    ctx.createMediaStreamSource(stream).connect(node)
    node.connect(silent).connect(ctx.destination) // keeps the graph pulling

    worker = new Worker(new URL('./detect-worker.js', import.meta.url), { type: 'module' })
    const mc = new MessageChannel()
    node.port.postMessage({ type: 'port' }, [mc.port1])
    worker.postMessage({ type: 'port', sampleRate: ctx.sampleRate }, [mc.port2])
    worker.postMessage({ type: 'config', detector, clarity })
    worker.onmessage = (e) => {
      if (e.data.type === 'note') onNote?.(e.data.event)
      else if (e.data.type === 'onset') onOnset?.(e.data.event)
      else if (e.data.type === 'stats') onStats?.(e.data.avgMs)
    }

    ctx.onstatechange = () => { if (!closing && ctx) recovery?.ctxStateChanged(ctx.state) }
    stream.getAudioTracks().forEach(t => { t.onended = () => { if (!closing) recovery?.trackEnded() } })
    setState('listening')
  }

  /** Tear down the graph but keep config and callbacks (recovery restart path). */
  function unwire() {
    closing = true
    clearTimeout(resumeTO)
    if (ctx) ctx.onstatechange = null
    stream?.getAudioTracks().forEach(t => { t.onended = null })
    worker?.terminate()
    ctx?.close().catch(() => {})
    ctx = null
    worker = null
    closing = false
  }

  async function acquire() {
    const media = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression
      }
    })
    ownsStream = true
    return media
  }

  async function restart() {
    unwire()
    if (ownsStream) {
      stream?.getTracks().forEach(t => t.stop())
      stream = await acquire()
    }
    await wire(stream)
  }

  function armRecovery() {
    if (recovery) return
    recovery = createRecovery({ restart, onState: setState })
    document.addEventListener('visibilitychange', onVisibility)
  }

  const mic = {
    get state() { return state },

    /** Start from the real microphone. Throws on denial/absence — caller degrades to tap (SR-AUD-12). */
    async start() {
      // dev/test simulator seam (like the tap keyboard): a page-supplied
      // MediaStream stands in for the mic so the full pipeline runs headless
      if (window.__ariettaMicStream) {
        await wire(window.__ariettaMicStream)
        armRecovery()
        return
      }
      await wire(await acquire())
      armRecovery()
    },

    /** Start from a supplied MediaStream (dev/test simulator path). */
    async startFromStream(mediaStream) {
      await wire(mediaStream)
      armRecovery()
    },

    /** SR-OUT-02: drop detection while app audio sounds, on the audio clock. */
    suspendFor(ms) {
      if (!ctx || !worker) return
      worker.postMessage({ type: 'suspend', untilMs: ctx.currentTime * 1000 + ms })
      setState('suspended')
      clearTimeout(resumeTO)
      resumeTO = setTimeout(() => { if (state === 'suspended') setState('listening') }, ms)
    },

    /** SR-OUT-02 for accompaniment: deafen only the sounded pitch classes. */
    ignorePitches(pitches, ms) {
      if (!ctx || !worker) return
      worker.postMessage({ type: 'ignore', pitches, untilMs: ctx.currentTime * 1000 + ms })
    },

    setClarity(c) {
      clarity = c
      worker?.postMessage({ type: 'config', clarity: c })
    },

    setDetector(name) {
      detector = name
      worker?.postMessage({ type: 'config', detector: name })
    },

    stop() {
      recovery?.stop()
      recovery = null
      document.removeEventListener('visibilitychange', onVisibility)
      unwire()
      if (ownsStream) stream?.getTracks().forEach(t => t.stop())
      stream = null
      setState('idle')
    }
  }

  registerMic(mic)
  return mic
}
```

Notes:
- `onStats` is consumed in Task 3; wiring it here avoids touching `worker.onmessage` twice. Passing an undefined `onStats` is harmless.
- `wire()` reports `'listening'` on success — that is how recovery's successful restart surfaces (recovery itself never emits `'listening'`).
- The gate's `suspendFor` path is worker-level; it does not touch `ctx.state`, so it cannot trip recovery.

- [ ] **Step 2: Add the pill string to `app/src/content/voice.js`**

Find the top-level `export const VOICE = {` object and add a `pill` section alongside the other top-level sections (e.g. right before `settings`):

```js
  pill: {
    waking: 'Waking up my ears…'
  },
```

- [ ] **Step 3: Map the new states in `app/src/app.jsx`**

The pill object currently reads (around line 433):

```jsx
  const pill = {
    text: heard !== null ? `Heard ${letter(heard)}`
      : (demo.on || earPlaying || micState === 'suspended') ? 'Playing it…' : 'Listening…',
    active: heard !== null
  }
```

Replace with:

```jsx
  const pill = {
    text: heard !== null ? `Heard ${letter(heard)}`
      : micState === 'interrupted' ? VOICE.pill.waking
      : (demo.on || earPlaying || micState === 'suspended') ? 'Playing it…' : 'Listening…',
    active: heard !== null
  }
```

`'lost'` deliberately falls through to 'Listening…' — the teacher IS still listening, via the tap keys (the same copy already shows when the mic is disabled entirely). No changes where `pill` is passed to `<Lesson>`, `<Song>`, `<FreePlay>`.

- [ ] **Step 4: Verify build and suite**

Run: `cd app && npm test && npm run build`
Expected: all tests pass; Vite build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add app/src/audio/mic.js app/src/content/voice.js app/src/app.jsx
git commit -m "Phase 4: self-healing mic — auto-recover from track loss and backgrounding (SR-PLT-02)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Detector timing stats + performance budget test

**Files:**
- Modify: `app/src/audio/detect-worker.js`
- Test: `app/test/perf.test.js`

**Interfaces:**
- Consumes: `onStats(avgMs)` mic option (already wired in Task 2); `yin`, `mpm` from `app/src/audio/detect/pitch.js`; signal helpers from `app/test/signals.js` (read that file and `app/test/corpus.test.js` first to reuse their frame-generation helpers rather than writing new ones).
- Produces: worker posts `{ type: 'stats', avgMs }` every 200 frames. Task 5 reads the latest value for the diagnostics export.

- [ ] **Step 1: Write the failing budget test**

`app/test/signals.js` exports `pianoTone(freq, sampleRate, length, amp?)` returning a `Float32Array` — slice one long tone into hop-strided 2048-sample frames, matching what the capture worklet ships:

```js
// app/test/perf.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { yin, mpm } from '../src/audio/detect/pitch.js'
import { pianoTone } from './signals.js'

const SR = 48000
const FRAME = 2048
const HOP = 1024
const FRAME_MS = (FRAME / SR) * 1000 // ~42.7ms of audio per frame, 21.3ms hop

// Regression tripwire (SR-PLT-03), not a thermal proof: each detector must
// process a frame in well under one hop on the dev machine. Generous bound
// so CI noise never flakes it; a real iPad run is the hardware gate's job.
const BUDGET_MS = 15

const N = 200
const signal = pianoTone(261.63, SR, FRAME + HOP * (N - 1), 0.5) // middle C
const frames = Array.from({ length: N }, (_, i) => signal.subarray(i * HOP, i * HOP + FRAME))

for (const [name, detect] of [['mpm', mpm], ['yin', yin]]) {
  test(`${name} stays under ${BUDGET_MS}ms per 2048-sample frame`, () => {
    // warm-up pass so JIT compilation is not billed to the measurement
    for (const f of frames.slice(0, 20)) detect(f, SR)
    const t0 = performance.now()
    for (const f of frames) detect(f, SR)
    const avg = (performance.now() - t0) / frames.length
    assert.ok(avg < BUDGET_MS, `${name} avg ${avg.toFixed(2)}ms exceeds ${BUDGET_MS}ms (frame is ${FRAME_MS.toFixed(1)}ms of audio)`)
  })
}
```

(If `detect()` mutates its input frame — check `pitch.js` — copy each subarray with `.slice()` instead. The corpus tests will show whether detectors are called on shared buffers today.)

- [ ] **Step 2: Run test to verify it runs (it should already pass — the tripwire's value is regression)**

Run: `cd app && node --test test/perf.test.js`
Expected: PASS (2 tests). If it FAILS, the detectors are already over budget — stop and investigate before proceeding (do not raise the budget).

- [ ] **Step 3: Add stats reporting to `app/src/audio/detect-worker.js`**

In `onFrame`, measure and accumulate; report every 200 frames (~4s of audio):

```js
let statSum = 0
let statN = 0

function onFrame({ frame, timeMs }) {
  if (timeMs < suspendedUntil) return
  const t0 = performance.now()
  const level = rms(frame)
  const ev = tracker.feed(detect(frame, sampleRate), level, timeMs)
  if (ev && !ignored(ev.pitch, timeMs)) postMessage({ type: 'note', event: ev })
  const onset = onsets.feed(level, timeMs)
  if (onset) postMessage({ type: 'onset', event: onset })
  statSum += performance.now() - t0
  if (++statN >= 200) {
    postMessage({ type: 'stats', avgMs: statSum / statN })
    statSum = 0
    statN = 0
  }
}
```

(The two `let` declarations go at module top level next to the other state; the function replaces the existing `onFrame` — the body is identical apart from the timing lines.)

- [ ] **Step 4: Run the whole suite and build**

Run: `cd app && npm test && npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add app/src/audio/detect-worker.js app/test/perf.test.js
git commit -m "Phase 4: detector timing stats + per-frame budget tripwire (SR-PLT-03)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Diagnostics store module

**Files:**
- Create: `app/src/store/diag.js`
- Test: `app/test/diag.test.js`

**Interfaces:**
- Consumes: the `db.js` handle interface (`get/put` on the existing `'app'` store — no migration).
- Produces: `logDiag(db, kind, detail, now?)`, `listDiag(db)`, `clearDiag(db)`. Entries are `{ t: number, kind: string, detail: string }`, capped at 200 (oldest dropped). Task 5 and 6 consume these exact names.

- [ ] **Step 1: Write the failing test**

```js
// app/test/diag.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { logDiag, listDiag, clearDiag, DIAG_CAP } from '../src/store/diag.js'

/** Same in-memory fake as progress.test.js, app store only. */
function memDb() {
  const app = new Map()
  return {
    get: async (_s, k) => app.get(k),
    put: async (_s, v) => { app.set(v.key, structuredClone(v)) }
  }
}

test('logDiag appends timestamped entries; listDiag returns them in order', async () => {
  const db = memDb()
  await logDiag(db, 'boot', 'ua-string', 100)
  await logDiag(db, 'mic-interrupted', '', 200)
  const entries = await listDiag(db)
  assert.deepEqual(entries, [
    { t: 100, kind: 'boot', detail: 'ua-string' },
    { t: 200, kind: 'mic-interrupted', detail: '' }
  ])
})

test('log is capped: oldest entries drop past DIAG_CAP', async () => {
  const db = memDb()
  for (let i = 0; i < DIAG_CAP + 5; i++) await logDiag(db, 'error', `e${i}`, i)
  const entries = await listDiag(db)
  assert.equal(entries.length, DIAG_CAP)
  assert.equal(entries[0].detail, 'e5')
  assert.equal(entries.at(-1).detail, `e${DIAG_CAP + 4}`)
})

test('detail is coerced to string and truncated to 300 chars', async () => {
  const db = memDb()
  await logDiag(db, 'error', { message: 'boom' }, 1)
  await logDiag(db, 'error', 'x'.repeat(500), 2)
  const entries = await listDiag(db)
  assert.equal(typeof entries[0].detail, 'string')
  assert.equal(entries[1].detail.length, 300)
})

test('clearDiag empties the log; listDiag on a fresh db is []', async () => {
  const db = memDb()
  assert.deepEqual(await listDiag(db), [])
  await logDiag(db, 'boot', '', 1)
  await clearDiag(db)
  assert.deepEqual(await listDiag(db), [])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test test/diag.test.js`
Expected: FAIL — `Cannot find module '../src/store/diag.js'`

- [ ] **Step 3: Write the implementation**

```js
// app/src/store/diag.js
/**
 * Beta diagnostics log (SR-PLT-04-safe): a single capped record in the
 * existing 'app' store — on-device only, shared only when a parent copies
 * the export from Settings. Logged kinds are limited to app boots, unhandled
 * errors, and mic interruption/recovery/loss; never usage or progress.
 */
export const DIAG_CAP = 200
const KEY = 'diagLog'

export async function logDiag(db, kind, detail = '', now = Date.now()) {
  const rec = (await db.get('app', KEY)) ?? { key: KEY, entries: [] }
  rec.entries.push({ t: now, kind, detail: String(detail).slice(0, 300) })
  if (rec.entries.length > DIAG_CAP) rec.entries = rec.entries.slice(-DIAG_CAP)
  await db.put('app', rec)
}

export async function listDiag(db) {
  return (await db.get('app', KEY))?.entries ?? []
}

export async function clearDiag(db) {
  await db.put('app', { key: KEY, entries: [] })
}
```

Note: `String({message:'boom'})` yields `'[object Object]'` — fine; callers pass message strings. If you prefer, use `typeof detail === 'string' ? detail : JSON.stringify(detail) ?? ''` — then update the test's first assertion to match (`'{"message":"boom"}'`). Pick one; the test and implementation must agree.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && node --test test/diag.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/src/store/diag.js app/test/diag.test.js
git commit -m "Phase 4: on-device diagnostics log, capped, app-store record

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Boot wiring — error hooks, mic event logging, app version

**Files:**
- Modify: `app/vite.config.js` (inject version)
- Modify: `app/src/app.jsx` (error hooks, mic-state logging, diagnostics assembly)

**Interfaces:**
- Consumes: `logDiag`/`listDiag`/`clearDiag` from Task 4; `onStats` from Tasks 2–3.
- Produces: `diagInfo` prop object passed to `<Settings>` in Task 6:
  `{ version: string, device: string, screen: string, mic: object|null, detectorAvgMs: number|null, entries: Array<{t,kind,detail}> }`, plus handler props `onCopyDiag(): Promise<boolean>` and `onClearDiag(): Promise<void>`.

- [ ] **Step 1: Inject the app version in `app/vite.config.js`**

```js
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  plugins: [
    // ... unchanged ...
  ]
})
```

- [ ] **Step 2: Wire diagnostics into `app/src/app.jsx`**

Imports to add:

```js
import { logDiag, listDiag, clearDiag } from './store/diag.js'
```

Module-level constant (top of file, after imports):

```js
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'
```

New state and refs inside `App()`:

```js
const [diagEntries, setDiagEntries] = useState([])
const detectorMsRef = useRef(null)
const micStateRef = useRef('idle')
```

In the boot effect (the existing `useEffect` that calls `openDb()`), after `setDb(d)` add:

```js
logDiag(d, 'boot', navigator.userAgent)
window.addEventListener('error', (e) => logDiag(d, 'error', e.message))
window.addEventListener('unhandledrejection', (e) => logDiag(d, 'error', e.reason?.message ?? String(e.reason)))
```

(The App component mounts once for the app's lifetime; no cleanup needed for these two listeners.)

In `startMic`, extend the `createMic` call:

```js
const mic = createMic({
  detector: micSettings.detector ?? 'mpm',
  clarity: micSettings.clarity ?? 0.9,
  onNote: (ev) => onNote(ev),
  onOnset: (ev) => onClap(ev),
  onStats: (ms) => { detectorMsRef.current = ms },
  onState: (s) => {
    if (s === 'interrupted') logDiag(db, 'mic-interrupted')
    else if (s === 'lost') logDiag(db, 'mic-lost')
    else if (s === 'listening' && micStateRef.current === 'interrupted') logDiag(db, 'mic-recovered')
    micStateRef.current = s
    setMicState(s)
  }
})
```

Note: `startMic` closes over `db` state — it is only called from the screen effect after boot completes, so `db` is set. `stopMic` should also reset `micStateRef.current = 'idle'`.

Settings navigation loads the log — change the Home `onSettings` prop:

```jsx
onSettings={async () => { setDiagEntries(await listDiag(db)); setScreen('settings') }}
```

Assemble the export payload and handlers (place near the settings screen render):

```js
const diagInfo = {
  version: APP_VERSION,
  device: navigator.userAgent,
  screen: `${window.screen.width}x${window.screen.height}`,
  mic: micSettings,
  detectorAvgMs: detectorMsRef.current,
  entries: diagEntries
}

const onCopyDiag = async () => {
  const text = JSON.stringify(diagInfo, null, 2)
  try {
    if (navigator.share) { await navigator.share({ text }); return true }
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false // user cancelled the share sheet, or clipboard denied
  }
}

const onClearDiag = async () => {
  await clearDiag(db)
  setDiagEntries([])
}
```

Pass all three to `<Settings>` (Task 6 renders them):

```jsx
<Settings profile={active} micEnabled={!!micSettings?.enabled}
  settings={profileSettings} canDelete={profiles.length > 1}
  glimpse={glimpseText({ name: active.name, lessons: allLessons(), progress })}
  diagInfo={diagInfo} onCopyDiag={onCopyDiag} onClearDiag={onClearDiag}
  ... existing props unchanged ...
/>
```

- [ ] **Step 3: Verify suite and build**

Run: `cd app && npm test && npm run build`
Expected: all tests pass; build succeeds (the unused `diagInfo` props are fine until Task 6).

- [ ] **Step 4: Commit**

```bash
git add app/vite.config.js app/src/app.jsx
git commit -m "Phase 4: boot diagnostics wiring — error hooks, mic events, app version

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Settings diagnostics card

**Files:**
- Modify: `app/src/ui/Settings.jsx`
- Modify: `app/src/content/voice.js` (`VOICE.settings` additions)

**Interfaces:**
- Consumes: `diagInfo`, `onCopyDiag`, `onClearDiag` props from Task 5 (exact shapes above).
- Produces: parent-facing UI only.

- [ ] **Step 1: Add strings to `VOICE.settings` in `app/src/content/voice.js`**

Add inside the existing `settings: { ... }` object:

```js
    diagTitle: 'For the beta helpers',
    diagLine: 'If something odd happened, copy this and send it to us — it never leaves the iPad on its own.',
    diagCopy: 'Copy report',
    diagCopied: 'Copied — thank you',
    diagClear: 'Clear the notes',
    diagEmpty: 'Nothing to report — all quiet.',
```

- [ ] **Step 2: Add the card to `app/src/ui/Settings.jsx`**

Update the component signature:

```js
export function Settings({ profile, micEnabled, settings, glimpse, diagInfo,
  onHome, onMicCheck, onAccent, onLabels, onReset, onDelete, onCopyDiag, onClearDiag, canDelete }) {
```

Add local state next to `confirming`:

```js
const [copied, setCopied] = useState(false)
```

Add a fifth `<Card>` after the player card (inside the existing grid div). Timestamps render with `new Date(e.t).toLocaleString()`; the newest 12 entries show, newest first:

```jsx
<Card title={v.diagTitle}>
  <div style="font-size:14px;color:var(--ink-soft);text-wrap:pretty;">{v.diagLine}</div>
  <div style="font-family:var(--mono);font-size:11px;color:var(--ink-mono);line-height:1.7;">
    <div>Arietta {diagInfo.version} — screen {diagInfo.screen}</div>
    <div>Ears: {diagInfo.mic?.enabled ? `on (${diagInfo.mic.detector ?? 'mpm'})` : 'off'}{diagInfo.detectorAvgMs != null ? ` — ${diagInfo.detectorAvgMs.toFixed(1)}ms/frame` : ''}</div>
  </div>
  <div style="max-height:120px;overflow:auto;background:var(--card-warm);border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-family:var(--mono);font-size:11px;color:var(--ink-soft);line-height:1.8;">
    {diagInfo.entries.length === 0
      ? <div>{v.diagEmpty}</div>
      : diagInfo.entries.slice(-12).reverse().map(e => (
          <div key={e.t}>{new Date(e.t).toLocaleString()} — {e.kind}{e.detail ? `: ${e.detail}` : ''}</div>
        ))}
  </div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;">
    <button class="btn-quiet" onClick={async () => { if (await onCopyDiag()) { setCopied(true); setTimeout(() => setCopied(false), 2500) } }}>
      {copied ? v.diagCopied : v.diagCopy}
    </button>
    {diagInfo.entries.length > 0 && <button class="btn-quiet" onClick={onClearDiag}>{v.diagClear}</button>}
  </div>
</Card>
```

- [ ] **Step 3: Verify suite and build**

Run: `cd app && npm test && npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 4: Visual check**

Run the app (`cd app && npm run dev`), open Settings, confirm: the card renders, Copy puts JSON on the clipboard, Clear empties the list. If a `verify` project skill is available to the executor, use it; otherwise a quick manual/browser check of just this card is enough.

- [ ] **Step 5: Commit**

```bash
git add app/src/ui/Settings.jsx app/src/content/voice.js
git commit -m "Phase 4: diagnostics card in Settings — copyable on-device report

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Accessibility — tokens, motion, focus, contrast test

**Files:**
- Modify: `app/src/theme.css`
- Test: `app/test/contrast.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `.hit` utility class (used in Task 8); adjusted `--ink-faint` token.

- [ ] **Step 1: Write the failing contrast test**

The test reads `theme.css` as text (tokens using `color-mix()` are out of scope — hex literals only). Tiered WCAG AA: primary text tokens ≥ 4.5:1, secondary/label tokens ≥ 3:1, against every background they sit on.

```js
// app/test/contrast.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/theme.css', import.meta.url), 'utf8')

function token(name) {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))
  assert.ok(m, `token --${name} must be a hex literal in theme.css`)
  return m[1]
}

function luminance(hex) {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
}

function ratio(fg, bg) {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

const BACKGROUNDS = ['paper', 'paper-top', 'card', 'card-warm']
const PRIMARY = ['ink', 'ink-soft']          // body text: WCAG AA 4.5:1
const SECONDARY = ['ink-mid', 'ink-mono', 'ink-faint'] // labels/kickers: 3:1

for (const fg of PRIMARY) {
  for (const bg of BACKGROUNDS) {
    test(`--${fg} on --${bg} meets 4.5:1`, () => {
      const r = ratio(token(fg), token(bg))
      assert.ok(r >= 4.5, `${r.toFixed(2)}:1`)
    })
  }
}

for (const fg of SECONDARY) {
  for (const bg of BACKGROUNDS) {
    test(`--${fg} on --${bg} meets 3:1`, () => {
      const r = ratio(token(fg), token(bg))
      assert.ok(r >= 3, `${r.toFixed(2)}:1`)
    })
  }
}
```

- [ ] **Step 2: Run test to verify it fails on --ink-faint**

Run: `cd app && node --test test/contrast.test.js`
Expected: FAIL — the four `--ink-faint` pairs are ~2.3–2.8:1; everything else passes. If any OTHER pair fails, note it and darken that token too using the same procedure as Step 3.

- [ ] **Step 3: Darken `--ink-faint` in `app/src/theme.css`**

```css
  --ink-faint: #8F7F58;
```

(#8F7F58 computes to ≈3.3:1 on `--paper`, the worst background. If the test still fails, darken further — e.g. #877750 — until all four pass; keep it visibly lighter than `--ink-mid` #8A7B60 is dark, so verify the hierarchy still reads in the dev app.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && node --test test/contrast.test.js`
Expected: PASS (20 tests)

- [ ] **Step 5: Add motion, focus, and hit-target CSS to `app/src/theme.css`**

Append at the end of the file:

```css
/* Accessibility (Phase 4): keyboard focus, calm motion, 44px touch targets. */

:focus-visible {
  outline: 3px solid var(--accent-ink);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Expands a small control's touch target to >=44x44 without changing its look. */
.hit { position: relative; }
.hit::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: max(100%, 44px);
  height: max(100%, 44px);
  transform: translate(-50%, -50%);
}
```

- [ ] **Step 6: Run suite and build**

Run: `cd app && npm test && npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add app/src/theme.css app/test/contrast.test.js
git commit -m "Phase 4 accessibility: contrast regression test, reduced motion, focus rings, hit-target utility

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Accessibility — apply hit targets and keyboard semantics

**Files:**
- Modify: `app/src/ui/Home.jsx`
- Modify: `app/src/ui/Settings.jsx`

**Interfaces:**
- Consumes: `.hit` class from Task 7.
- Produces: UI-only changes; no API changes.

A shared pattern for clickable `<div>`s — make each focusable and keyboard-activatable. Reusable helper (put a copy in each file, or inline the three attributes — they are small):

```js
const pressable = (fn) => ({
  role: 'button',
  tabIndex: 0,
  onClick: fn,
  onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn() } }
})
```

- [ ] **Step 1: `app/src/ui/Home.jsx` — profile dots, "+" button, small buttons, cards**

- Profile dots (`Home.jsx:78`): replace `onClick={() => onSelectProfile(p.id)}` with `{...pressable(() => onSelectProfile(p.id))}` and add `hit` to a `class` attribute (the div currently has only `style`; add `class="hit"`).
- New-player "+" (`Home.jsx:85`): same treatment — `{...pressable(onNewProfile)}` and `class="hit"`.
- Small mic-check button (`Home.jsx:70`, `padding:5px 12px;font-size:11.5px`): add `class="btn-quiet hit"`.
- Free play / settings header buttons (`Home.jsx:62-63`): add `hit` to their classes: `class="btn-quiet hit"`.
- Unit cards (`Home.jsx:128`) and song rows (`Home.jsx:172`): these are large (no `.hit` needed) but keyboard-dead. Where `onClick={openable ? () => onOpen(firstOpen.id) : null}`, replace with `{...(openable ? pressable(() => onOpen(firstOpen.id)) : {})}` — and equivalently for the song row with its `playable` guard.

- [ ] **Step 2: `app/src/ui/Settings.jsx` — accent swatches**

The swatches (`Settings.jsx:50-51`, 30px circles, gap 9px): apply `{...pressable(() => onAccent(c))}` (replacing the bare `onClick`), add `class="hit"`, and widen the container gap from `gap:9px` to `gap:15px` so the expanded 44px targets do not overlap.

- [ ] **Step 3: Verify keyboard operation in the browser**

Run: `cd app && npm run dev`. Tab through Home: every control described above receives a visible focus ring (Task 7's `:focus-visible`) and activates with Enter/Space. Confirm swatches in Settings likewise.

- [ ] **Step 4: Run suite and build**

Run: `cd app && npm test && npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add app/src/ui/Home.jsx app/src/ui/Settings.jsx
git commit -m "Phase 4 accessibility: 44px hit targets and keyboard semantics on small controls

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Beta protocol doc + plan/runbook updates

**Files:**
- Create: `docs/BETA_PROTOCOL.md`
- Modify: `PLAN.md` (Phase 4 build-status note, mirroring the Phase 2/3 notes)
- Modify: `spike/GATE_RUNBOOK.md` (append Phase 4 hardware flags)

**Interfaces:** documentation only.

- [ ] **Step 1: Write `docs/BETA_PROTOCOL.md`**

Content requirements (write in the project's plain, warm-but-precise doc voice; no emojis):

```markdown
# Arietta family beta — protocol

Owner: QA (protocol, triage). BO judges pedagogy severity. PM owns the cut list.
References: PLAN.md Phase 4, REQUIREMENTS.md section 1 (tone, privacy).

## Who and how long
- At least 2 households, at least 1 child aged 8 or under, two weeks, real pianos.
- Each household gets: an iPad with Arietta installed (PWA, offline verified
  before handoff), a one-page setup sheet, and a contact for questions.

## Setup checklist (per household, before day 1)
- [ ] App installed to home screen; airplane-mode cold start verified.
- [ ] Mic check completed in the room where the piano lives.
- [ ] One profile per player created.
- [ ] Parent shown the Settings diagnostics card and the copy button.

## During the two weeks
- Families play as they like — no scripts. We ask only:
  - if something feels wrong or confusing, note roughly when it happened;
  - when convenient, copy the diagnostics report from Settings and message it
    to us (it contains no recordings and nothing personal beyond the device
    description — see SR-PLT-04).
- Mid-point check-in (day 7): one short call or message thread per household.

## What we collect
- The diagnostics export (app version, device, mic settings, detector timing,
  error/interruption log). Nothing is transmitted by the app itself.
- The family's own words about what happened. No screen recording, no analytics.

## Triage rules (from PLAN.md Phase 4)
- Pedagogy problems (hints confuse the child, wrong difficulty, trust broken
  by false positives) — BO judges; these BLOCK release.
- Polish items (visual nits, wording preferences) — logged, do not block.
- Data loss of any kind — blocks release, no judgment call needed.

## Exit review
- Both households completed Unit 2 or beyond unassisted.
- Zero data-loss incidents; diagnostics logs reviewed for silent mic losses.
- Findings sorted into: release blockers / v1.x fixes / ideas for Course 2.
```

- [ ] **Step 2: Update `PLAN.md` Phase 4**

Append a build-status bullet to the Phase 4 section, matching the Phase 2/3 pattern (adjust the date to the actual completion date):

```markdown
- **Build status (2026-07-09): software scope complete; human/hardware items open.**
  Interruption handling (self-healing mic with interrupted/lost states), the
  accessibility pass (44px targets, AA-tiered contrast enforced by test,
  reduced motion, focus rings), detector timing instrumentation with a budget
  tripwire, and the on-device diagnostics export in Settings are built and
  test-covered. Beta protocol documented (docs/BETA_PROTOCOL.md). Open: the
  device-matrix runs, the two-week family beta, BO voice review, and
  SR-VER-01/04/05 — tracked in spike/GATE_RUNBOOK.md as release blockers.
```

- [ ] **Step 3: Update `spike/GATE_RUNBOOK.md`**

Read the runbook's structure first, then append a section in its existing style:

```markdown
## Phase 4 additions to the hardware session

Run these alongside the deferred Phase 0 gate validation, same iPad:

- **Interruption drill (SR-PLT-02)**: mid-lesson, in order — switch apps and
  return; invoke Siri; lock and unlock; trigger a timer alarm. After each, the
  pill must pass through "Waking up my ears…" and return to listening within
  a few seconds, and the lesson position must be exactly where it was left.
  Check the Settings diagnostics log afterward: each drill should appear as
  mic-interrupted followed by mic-recovered, with zero mic-lost entries.
- **Thermal run (SR-PLT-03)**: 10 minutes of continuous listening on the
  oldest target iPad; the device may get warm but the UI must stay at 60 fps
  and detection must not degrade. Record the Settings card's ms/frame reading
  at minutes 1 and 10.
- **Onset thresholds vs. metronome bleed** (flag carried from Phase 3): with
  the metronome audible from the iPad speaker, clap steps must not
  self-trigger from the click.
```

- [ ] **Step 4: Full suite, build, and commit**

Run: `cd app && npm test && npm run build`
Expected: all tests pass; build succeeds.

```bash
git add docs/BETA_PROTOCOL.md PLAN.md spike/GATE_RUNBOOK.md
git commit -m "Phase 4: beta protocol, plan status, hardware runbook additions

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Final verification (after all tasks)

- [ ] `cd app && npm test` — entire suite green, including the new recovery, diag, perf, and contrast tests.
- [ ] `cd app && npm run build` — clean PWA build.
- [ ] Browser pass with the project `verify` skill (or manually): boot → Settings shows the diagnostics card → copy works; tab-navigate Home; play one lesson step by tap to confirm nothing regressed.
- [ ] Per the project memory: push to `main` on github.com/opebanjoko/Arietta_Piano_Teacher once the phase is verified.
