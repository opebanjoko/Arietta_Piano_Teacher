# Phase 6: Polyphony, MIDI, Course 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polyphonic detection (dyads → triads → hands together) behind the existing NoteEvent seam, unlocking lesson 21 and Course 2 Units 9/11; a Web MIDI input adapter preferred over mic; the native-shell decision recorded; and Course 2 content (Units 7–12, lessons 22–43) as pure data.

**Architecture:** A polyphony **mini-spike gate comes first** (PLAN.md: "same fail-fast discipline" as Phase 0): a dependency-free FFT + spectral harmonic-sieve multi-F0 detector is scored offline against synthesized chord performances in `spike/`; only on a synthetic Go does production work start. Production polyphony adds `NoteSetEvent` (SR-EVT-03), a `poly.js` detector + `PolyTracker` inside the existing worker, and a per-lesson `poly` flag so the mono pipeline is untouched for v1 lessons (the confidence bar rises, never drops — SR-AUD-10). The engine grades chords with a pure **gather** model (accumulate pitches across NoteEvents/NoteSetEvents within a window; all expected tones present, no unexpected neighbors) so mic sets, tap singles, and MIDI singles grade identically (SR-EVT-02). Course 2 is data in `course.js` plus five bounded capability additions: bass clef + accidentals on the Staff, an extended keyboard range, a `dynamics` step kind, and a `setlist` lesson kind (polish + recital). MIDI is a small adapter module normalized through the existing `noteEvent` factory, auto-preferred over mic (SR-MID-01); the Capacitor decision is recorded, not built (SR-MID-02).

**Tech Stack:** Existing only — Preact + Vite PWA (`app/`), plain JS ES modules, `node --test`. No new dependencies anywhere (the FFT is ~60 lines of plain JS).

## Global Constraints

- **Silence over guessing** (SR-AUD-05): polyphonic confidence bar is *higher* than mono (`polyClarity` default 0.93 vs mono 0.9); events below threshold are dropped, never emitted.
- Chords within **C3–C5** (MIDI 48–72) per SR-AUD-10; NoteEvent pitch range stays MIDI 48–96; latency budget unchanged (detector ≤150 ms of the ≤300 ms end-to-end).
- The course engine must not branch on `source` (SR-EVT-02); monophonic consumers unaffected by NoteSetEvent (SR-EVT-03).
- No numeric scores, percentages, stars, grades, or streaks anywhere in student-facing UI — dynamics and recital feedback are words only (§9.2, §1).
- No emojis in code, prints, or logging. Sparse comments; docstring-style module headers matching existing files.
- **Content format requirement** (§9.4): adding a lesson means adding data, not code. All Course 2 lessons are pure data in `course.js` consumed by the existing engine.
- Voice: all student-facing strings live in `app/src/content/voice.js` or lesson data, warm and number-free; BO voice review remains a human release gate (record as open item, do not block build).
- Tests: `cd app && npm test` (node --test). Spike tests: `cd spike && npm test` if a package.json exists, else `node --test test/*.test.js`.
- Commit after every task (working tree green). Push once at the end of the phase (user memory: push each completed phase to github.com/opebanjoko/Arietta_Piano_Teacher main).
- Do not touch `.claude/settings.json` (user-modified) or `.serena/` in commits.
- Local-first: nothing in this phase talks to the network except the existing sync client; sync merge is lessonId-keyed and schema-agnostic, so new lesson ids need no server change.

## File Structure

```
spike/lib/fft.js                 NEW  radix-2 real FFT + Hann + spectral peaks (plain JS)
spike/lib/poly.js                NEW  two multi-F0 candidates: 'sieve' (iterative subtraction), 'salience' (joint pick)
spike/lib/pipeline.js            MOD  renderPerformance supports simultaneous onsets; processBufferPoly
spike/lib/score.js               MOD  scoreSets(events, truth) for set-valued ground truth
spike/test/poly.test.js          NEW  dyad/triad/held-bass/noise suites → the synthetic gate
spike/POLY_GATE_RUNBOOK.md       NEW  human piano validation runbook (mirrors GATE_RUNBOOK.md)
app/src/core/events.js           MOD  noteSetEvent factory
app/src/audio/detect/fft.js      NEW  production copy of spike fft (identical algorithm)
app/src/audio/detect/poly.js     NEW  winning detector, C3–C5, returns [{freq, clarity}]
app/src/audio/detect/polytracker.js NEW  PolyTracker: set tracking, onset gather, higher clarity bar
app/src/audio/detect-worker.js   MOD  poly mode config + {type:'noteset'} messages
app/src/audio/mic.js             MOD  onNoteSet callback, setPoly(on)
app/src/audio/midi.js            NEW  Web MIDI adapter → noteEvent(source:'midi')
app/src/core/engine.js           MOD  chord targets via gather; dynamics step; setlist helpers
app/src/core/hints.js            MOD  chordHintText
app/src/content/voice.js         MOD  chord hints, dynamics words, recital lines, midi pill
app/src/ui/Staff.jsx             MOD  bass clef, accidentals, chord columns
app/src/ui/Keyboard.jsx          MOD  high octave option, flats labels, chord pressed set
app/src/ui/Lesson.jsx            MOD  chord staff notes, dynamics step UI, plain/clef/flats flags
app/src/ui/Song.jsx              MOD  chord entries in song staff; recital mode (no hints)
app/src/ui/Setlist.jsx           NEW  pick-N favourites + play-through (polish and recital)
app/src/ui/Home.jsx              MOD  Course 2 units render; teaser replaced
app/src/app.jsx                  MOD  noteset routing, poly mode per lesson, MIDI preference wiring
app/src/content/course.js        MOD  lesson 21 real steps; COURSE2 units u7–u12 (22 lessons)
app/test/*.test.js               MOD/NEW per task
docs/decisions/2026-07-10-native-shell.md NEW  Capacitor decision record (SR-MID-02)
PLAN.md                          MOD  Phase 6 build status + decision row
```

Task order enforces the fail-fast gate: Tasks 1–3 are the spike; **Task 3 is a hard gate** — if the synthetic suites fail, stop, record No-Go, and re-plan (Units 9/11 and lesson 21 stay gated; Units 7/8/10/12 can still proceed as they need no polyphony).

---

### Task 1: Spike — FFT and spectral peaks

**Files:**
- Create: `spike/lib/fft.js`
- Test: `spike/test/fft.test.js`

**Interfaces:**
- Produces: `realFFT(frame) -> Float32Array` magnitudes (length N/2), `hann(frame) -> Float32Array` (new windowed copy), `spectralPeaks(mags, sampleRate, { floor = 0.01 }) -> [{ freq, mag }]` — local maxima with parabolic interpolation, sorted by mag desc.
- Consumed by: Task 2 detectors, Task 5 production copy.

- [ ] **Step 1: Write the failing test**

```js
// spike/test/fft.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { realFFT, hann, spectralPeaks } from '../lib/fft.js'
import { sine, mix } from '../lib/signals.js'

const SR = 48000, N = 4096

test('realFFT finds a lone sine at the right bin', () => {
  const f = 440
  const mags = realFFT(hann(sine(f, SR, N)))
  const bin = Math.round(f / (SR / N))
  const top = mags.indexOf(Math.max(...mags))
  assert.ok(Math.abs(top - bin) <= 1, `peak bin ${top} vs expected ${bin}`)
})

test('spectralPeaks interpolates off-bin frequencies within 3 Hz', () => {
  const f = 261.63 // C4, not bin-aligned
  const peaks = spectralPeaks(realFFT(hann(sine(f, SR, N))), SR, {})
  assert.ok(peaks.length >= 1)
  assert.ok(Math.abs(peaks[0].freq - f) < 3, `got ${peaks[0].freq}`)
})

test('spectralPeaks separates two tones a minor third apart at C3', () => {
  const buf = mix(sine(130.81, SR, N), sine(155.56, SR, N)) // C3 + Eb3
  const peaks = spectralPeaks(realFFT(hann(buf)), SR, {}).slice(0, 6)
  const near = t => peaks.some(p => Math.abs(p.freq - t) < 4)
  assert.ok(near(130.81) && near(155.56))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd spike && node --test test/fft.test.js`
Expected: FAIL — cannot find module `../lib/fft.js`

- [ ] **Step 3: Implement**

```js
// spike/lib/fft.js
/** Dependency-free radix-2 FFT utilities for the polyphony spike. */

export function hann(frame) {
  const out = new Float32Array(frame.length)
  const k = Math.PI / (frame.length - 1)
  for (let i = 0; i < frame.length; i++) out[i] = frame[i] * Math.sin(i * k) ** 2
  return out
}

/** Magnitude spectrum (length N/2) of a real frame; N must be a power of two. */
export function realFFT(frame) {
  const n = frame.length
  const re = Float32Array.from(frame)
  const im = new Float32Array(n)
  // bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]] }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len
    const wr = Math.cos(ang), wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k]
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr
        re[i + k] = ur + vr; im[i + k] = ui + vi
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr
      }
    }
  }
  const mags = new Float32Array(n / 2)
  for (let i = 0; i < n / 2; i++) mags[i] = Math.hypot(re[i], im[i]) / n
  return mags
}

/** Local maxima above floor*max, parabolic-interpolated, sorted by magnitude. */
export function spectralPeaks(mags, sampleRate, { floor = 0.01 } = {}) {
  const binHz = sampleRate / (mags.length * 2)
  const top = Math.max(...mags)
  const peaks = []
  for (let i = 2; i < mags.length - 2; i++) {
    if (mags[i] <= mags[i - 1] || mags[i] < mags[i + 1] || mags[i] < top * floor) continue
    const a = mags[i - 1], b = mags[i], c = mags[i + 1]
    const shift = (a - c) / (2 * (a - 2 * b + c)) || 0
    peaks.push({ freq: (i + shift) * binHz, mag: b })
  }
  return peaks.sort((x, y) => y.mag - x.mag)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd spike && node --test test/fft.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add spike/lib/fft.js spike/test/fft.test.js
git commit -m "Phase 6 spike: FFT, Hann window, interpolated spectral peaks"
```

---

### Task 2: Spike — two multi-F0 detector candidates

**Files:**
- Create: `spike/lib/poly.js`
- Test: `spike/test/poly-detect.test.js`

**Interfaces:**
- Produces: `polySieve(frame, sampleRate, opts?) -> [{ freq, clarity }]` and `polySalience(frame, sampleRate, opts?) -> [{ freq, clarity }]` — both return up to `maxNotes` (default 4) pitches within C3–C5 (fundamentals 125–530 Hz), clarity 0..1, empty array on silence/uncertainty. Shared opts: `{ maxNotes = 4, floor = 0.02 }`.
- Consumed by: Task 3 gate, Task 5 production port (winner only).

**Algorithm (sieve):** Hann → realFFT (frame 4096) → spectralPeaks → for each candidate midi 48..72, score = Σ over harmonics h=1..8 of nearest-peak magnitude within ±3% of h·f0, weighted 1/h, requiring the fundamental or 2nd harmonic present; normalize by total peak energy → clarity. Iteratively take the best candidate above threshold, subtract its matched harmonic peaks (zero them), repeat up to maxNotes. Reject a candidate whose fundamental coincides with a stronger already-picked note's harmonic unless it has ≥2 unshared harmonics (octave-error guard).

**Algorithm (salience):** same per-candidate harmonic score but no subtraction: take the top maxNotes candidates that are not harmonically explained (≥60% of their matched energy shared with a stronger pick → rejected).

- [ ] **Step 1: Write the failing test**

```js
// spike/test/poly-detect.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { polySieve, polySalience } from '../lib/poly.js'
import { pianoTone, whiteNoise, mix, silence } from '../lib/signals.js'

const SR = 48000, N = 4096
const midiF = m => 440 * 2 ** ((m - 69) / 12)
const midisOf = r => r.map(x => Math.round(69 + 12 * Math.log2(x.freq / 440))).sort((a, b) => a - b)

for (const [name, detect] of [['sieve', polySieve], ['salience', polySalience]]) {
  test(`${name}: C4+E4 dyad`, () => {
    const buf = mix(pianoTone(midiF(60), SR, N), pianoTone(midiF(64), SR, N))
    assert.deepEqual(midisOf(detect(buf, SR)), [60, 64])
  })
  test(`${name}: C4 E4 G4 triad`, () => {
    const buf = mix(pianoTone(midiF(60), SR, N), pianoTone(midiF(64), SR, N), pianoTone(midiF(67), SR, N))
    assert.deepEqual(midisOf(detect(buf, SR)), [60, 64, 67])
  })
  test(`${name}: low C3+G3 dyad (worst resolution)`, () => {
    const buf = mix(pianoTone(midiF(48), SR, N), pianoTone(midiF(55), SR, N))
    assert.deepEqual(midisOf(detect(buf, SR)), [48, 55])
  })
  test(`${name}: single note does not sprout phantom octaves`, () => {
    assert.deepEqual(midisOf(detect(pianoTone(midiF(60), SR, N), SR)), [60])
  })
  test(`${name}: silence and noise return nothing`, () => {
    assert.deepEqual(detect(silence(SR, N), SR), [])
    assert.deepEqual(detect(whiteNoise(SR, N, 0.05), SR), [])
  })
}
```

- [ ] **Step 2: Run to verify failure** — `cd spike && node --test test/poly-detect.test.js` → FAIL (module not found)

- [ ] **Step 3: Implement `spike/lib/poly.js`**

```js
// spike/lib/poly.js
/** Multi-F0 candidates for the Phase 6 polyphony spike (chords within C3-C5). */
import { hann, realFFT, spectralPeaks } from './fft.js'

const MIDI_LO = 48, MIDI_HI = 72
const midiFreq = m => 440 * 2 ** ((m - 69) / 12)

function harmonicScore(peaks, f0, taken) {
  let score = 0, hits = [], unshared = 0
  for (let h = 1; h <= 8; h++) {
    const target = f0 * h
    let best = null
    for (const p of peaks) {
      if (Math.abs(p.freq - target) < target * 0.03 && (!best || p.mag > best.mag)) best = p
    }
    if (!best) continue
    score += best.mag / h
    hits.push(best)
    if (!taken.has(best)) unshared++
  }
  const hasRoot = hits.some(p => Math.abs(p.freq - f0) < f0 * 0.03 || Math.abs(p.freq - 2 * f0) < 2 * f0 * 0.03)
  return hasRoot ? { score, hits, unshared } : { score: 0, hits: [], unshared: 0 }
}

function candidates(frame, sampleRate, floor) {
  const mags = realFFT(hann(frame))
  const peaks = spectralPeaks(mags, sampleRate, {})
  let total = 0
  for (const p of peaks) total += p.mag
  let rms = 0
  for (let i = 0; i < frame.length; i++) rms += frame[i] * frame[i]
  rms = Math.sqrt(rms / frame.length)
  return { peaks, total, quiet: rms < floor || peaks.length === 0 }
}

export function polySieve(frame, sampleRate, { maxNotes = 4, floor = 0.005 } = {}) {
  const { peaks, total, quiet } = candidates(frame, sampleRate, floor)
  if (quiet) return []
  let pool = peaks.slice()
  const taken = new Set(), out = []
  for (let n = 0; n < maxNotes; n++) {
    let best = null
    for (let m = MIDI_LO; m <= MIDI_HI; m++) {
      const r = harmonicScore(pool, midiFreq(m), taken)
      if (r.score > 0 && (!best || r.score > best.score)) best = { midi: m, ...r }
    }
    if (!best) break
    const clarity = Math.min(1, best.score / (total * 0.35))
    if (clarity < 0.5) break
    if (out.length && best.unshared < 2) break // harmonic ghost of a picked note
    out.push({ freq: midiFreq(best.midi), clarity })
    for (const p of best.hits) { taken.add(p); pool = pool.filter(x => x !== p) }
  }
  return out
}

export function polySalience(frame, sampleRate, { maxNotes = 4, floor = 0.005 } = {}) {
  const { peaks, total, quiet } = candidates(frame, sampleRate, floor)
  if (quiet) return []
  const scored = []
  for (let m = MIDI_LO; m <= MIDI_HI; m++) {
    const r = harmonicScore(peaks, midiFreq(m), new Set())
    if (r.score > 0) scored.push({ midi: m, ...r })
  }
  scored.sort((a, b) => b.score - a.score)
  const out = [], used = new Set()
  for (const c of scored) {
    if (out.length >= maxNotes) break
    const clarity = Math.min(1, c.score / (total * 0.35))
    if (clarity < 0.5) continue
    let shared = 0
    for (const p of c.hits) if (used.has(p)) shared += p.mag
    const own = c.hits.reduce((s, p) => s + p.mag, 0)
    if (out.length && own > 0 && shared / own >= 0.6) continue
    out.push({ freq: midiFreq(c.midi), clarity })
    for (const p of c.hits) used.add(p)
  }
  return out
}
```

Tune the magic numbers (`0.35`, `0.5`, tolerance `0.03`) against the test suite until green — record final values in the gate note. Do not loosen the silence/noise test; that is the cardinal rule.

- [ ] **Step 4: Run** — `cd spike && node --test test/poly-detect.test.js` → PASS (10 tests)

- [ ] **Step 5: Commit** — `git add spike/lib/poly.js spike/test/poly-detect.test.js && git commit -m "Phase 6 spike: sieve and salience multi-F0 candidates"`

---

### Task 3: Spike — chord pipeline, set scoring, THE GATE

**Files:**
- Modify: `spike/lib/pipeline.js` (chords in `renderPerformance`; `processBufferPoly`)
- Modify: `spike/lib/score.js` (add `scoreSets`)
- Create: `spike/test/poly-gate.test.js`, `spike/POLY_GATE_RUNBOOK.md`

**Interfaces:**
- `renderPerformance(notes, sampleRate)` — `notes: [{ midi | midis: [..], atMs, durMs, amp? }]`; truth entries become `{ midis: [...], atMs }` (single midi normalized to `[midi]`).
- `processBufferPoly(samples, sampleRate, { detect, frameSize = 4096, hopSize = 1024, minClarity = 0.93, stableFrames = 2 })` → `[{ midis: [..], timestamp }]` — frame the buffer, run detector, apply a simple stable-set tracker (a pitch enters after `stableFrames` consecutive appearances ≥ minClarity; a *new-onset group* = pitches entering within 100 ms of each other → one event).
- `scoreSets(events, truth, { durationMs, matchWindowMs = 500 })` → `{ detectionRate, falsePer10Min, latency: { mean, p95, max }, pass }` — a truth chord is detected iff one event within the window contains **exactly** its midi set; extra events (or extra pitches forming unmatched sets) count as false events. `pass = detectionRate >= 0.95 && falsePer10Min <= 1`.

**The gate suites** (in `poly-gate.test.js`), each rendered at 48 kHz with `pianoTone`, scored for both detectors:
1. **Stage a — dyads**: 20 random-seeded dyads (intervals 3–12 semitones, roots C3–C4), 900 ms apart.
2. **Stage a — melody over held bass**: held C3 (4 s) with melody C4 D4 E4 F4 G4 onsets every 700 ms — melody notes must be detected as they land (sets may include the ringing bass; score melody onsets by subset match — the tracker's new-onset groups).
3. **Stage b — triads**: C, F, G major root-position triads across C3–C5 roots, 12 chords.
4. **Stage c — hands together**: left-hand triad (C3 E3 G3) held under a 5-note right-hand melody.
5. **Noise floor**: 60 s of white noise + no notes → falsePer10Min must be ≤ 1 (target 0).
6. **Latency**: mean detection latency ≤ 150 ms, p95 ≤ 250 ms on suite 3.

Suite 2 and 4 use subset scoring: pass an option `scoreSets(..., { subset: true })` where a truth entry matches if an event's midi set ⊇ truth set is false — instead event set must equal the *newly-onset* set. Keep it strict: the tracker emits new-onset groups, so equality against the new-onset truth is the right check.

- [ ] **Step 1: Write `scoreSets` test + implementation** (extend `spike/test/score.test.js` if present, else inline in poly-gate.test.js): truth `[{midis:[60,64], atMs:0}]`, events `[{midis:[60,64], timestamp:80}]` → detectionRate 1, latency.mean 80, pass true; wrong set `[{midis:[60,65]}]` → detectionRate 0 and 1 false event.
- [ ] **Step 2: Extend `renderPerformance`** — accept `midis` arrays; render each midi with the existing per-note synthesis, sum, normalize truth to `{midis, atMs}`.
- [ ] **Step 3: Implement `processBufferPoly`** with the stable-set tracker described above.
- [ ] **Step 4: Write the six gate suites** in `spike/test/poly-gate.test.js`, asserting `pass` for at least one detector per suite, and record per-suite metrics with `console.log` lines like `gate dyads sieve: detection=1.00 false/10min=0.0 latency=86ms`.
- [ ] **Step 5: Run the gate** — `cd spike && node --test test/poly-gate.test.js`.
  - **If any suite fails for both detectors after honest tuning: STOP.** Record No-Go in `spike/POLY_GATE.md` with metrics, mark Units 9/11 + lesson 21 as still gated, and continue only with Tasks 12–14 and Units 7/8/10/12 content (they need no polyphony). Re-plan with BO per PLAN.md.
  - If green: record the winner (expected: sieve) and final thresholds in the gate note inside `POLY_GATE_RUNBOOK.md`.
- [ ] **Step 6: Write `spike/POLY_GATE_RUNBOOK.md`** — mirror `GATE_RUNBOOK.md` structure: Session 1 record chord corpus (C/F/G triads + dyads at 3 distances on both team pianos), Session 2 offline scoring via `processBufferPoly`, Session 3 live chords + 10-min noise soak, gate rules G1 ≥95% exact-set detection, G2 ≤1 false/10 min, G3 ≤300 ms feel. State that synthetic Go is **provisional**, human validation is a release blocker exactly like Phase 0.
- [ ] **Step 7: Commit** — `git commit -m "Phase 6 spike gate: chord pipeline, set scoring, synthetic Go recorded"`

---

### Task 4: NoteSetEvent (SR-EVT-03)

**Files:** Modify `app/src/core/events.js`; test `app/test/events.test.js` (extend).

**Interfaces:**
- Produces: `noteSetEvent({ pitches, source, timestamp, confidence = 1 }) -> { pitches, source, confidence, timestamp }` — `pitches` is a sorted, deduped array of ≥2 MIDI numbers, each range-checked 48–96 (RangeError otherwise). Also `eventPitches(ev) -> number[]` — `ev.pitches ?? [ev.pitch]`, the engine's uniform accessor.

- [ ] **Step 1: Failing tests** — extend `app/test/events.test.js`:

```js
test('noteSetEvent sorts, dedupes, range-checks', () => {
  const e = noteSetEvent({ pitches: [67, 60, 64, 64], source: 'mic', timestamp: 5, confidence: 0.95 })
  assert.deepEqual(e.pitches, [60, 64, 67])
  assert.equal(e.confidence, 0.95)
  assert.throws(() => noteSetEvent({ pitches: [60, 97], source: 'mic', timestamp: 1 }), RangeError)
  assert.throws(() => noteSetEvent({ pitches: [60], source: 'mic', timestamp: 1 }), RangeError)
})
test('eventPitches unifies both shapes', () => {
  assert.deepEqual(eventPitches(noteEvent({ pitch: 60, source: 'tap', timestamp: 1 })), [60])
  assert.deepEqual(eventPitches(noteSetEvent({ pitches: [60, 64], source: 'mic', timestamp: 1 })), [60, 64])
})
```

- [ ] **Step 2: Verify fail → implement → verify pass** (implementation is a direct transcription of the interface above).
- [ ] **Step 3: Commit** — `"Phase 6: NoteSetEvent factory and eventPitches accessor (SR-EVT-03)"`

---

### Task 5: Production poly detector

**Files:** Create `app/src/audio/detect/fft.js`, `app/src/audio/detect/poly.js`; test `app/test/poly.test.js`.

- [ ] **Step 1:** Copy the spike's `fft.js` verbatim; port the **winning** detector from Task 3 into `poly.js` as `export function poly(frame, sampleRate, opts)` with the gate-tuned thresholds as defaults. Header comment names the spike gate and the losing candidate.
- [ ] **Step 2:** Port the poly-detect test suite (Task 2 shape, winner only) to `app/test/poly.test.js` using `app/test/signals.js`. Run `cd app && npm test` → green.
- [ ] **Step 3: Commit** — `"Phase 6: production multi-F0 detector behind the detect seam"`

---

### Task 6: PolyTracker

**Files:** Create `app/src/audio/detect/polytracker.js`; test `app/test/polytracker.test.js`.

**Interfaces:**
- `new PolyTracker({ minClarity = 0.93, stableFrames = 2, silenceFrames = 3, gatherMs = 100, restrikeFactor = 1.5 })`
- `feed(dets, frameRms, timestampMs) -> event | null` where `dets = [{ freq, clarity }]`. Returns a mic `NoteEvent` (one new pitch) or `NoteSetEvent` (≥2 new pitches gathered within `gatherMs`), else null. Sustained pitches are not re-emitted; a pitch leaves the active set after `silenceFrames` frames absent; RMS re-attack (`frameRms > restrikeFactor * lastRms` while the same set persists) re-emits, mirroring `NoteTracker`.
- Pitches below `minClarity` are ignored (higher bar than mono — SR-AUD-10).

- [ ] **Step 1: Failing tests** — feed synthetic det-frames (same style as `tracker.test.js`):
  - triad appears across 2 frames → exactly one NoteSetEvent `{pitches:[60,64,67]}`, then sustained frames → no more events;
  - held bass then melody note enters → bass set-event first (single → NoteEvent with `pitch:48`), later one NoteEvent `{pitch:64}` for the newcomer only;
  - clarity 0.91 pitch (below 0.93) never emits;
  - staggered chord within gatherMs (frame k: C, frame k+1: C+E+G stable) → single set event, not three singles;
  - silence clears; re-strike re-emits.
- [ ] **Step 2–4:** Verify fail → implement (~70 lines, modeled on `tracker.js`: per-pitch pending counters, active set, gather buffer flushed when `timestampMs - gatherStart >= gatherMs` or via the next feed) → verify pass.
- [ ] **Step 5: Commit** — `"Phase 6: PolyTracker with onset gather and raised clarity bar"`

---

### Task 7: Worker poly mode + mic plumbing

**Files:** Modify `app/src/audio/detect-worker.js`, `app/src/audio/mic.js`; test `app/test/mic-config.test.js` (new, message-protocol level) — the worker body stays thin.

**Interfaces:**
- Worker inbound `config` gains `poly: boolean` (rebuilds a 4096-sample ring buffer + PolyTracker when true; mono path untouched when false). Worker outbound gains `{ type: 'noteset', event }`.
- Worker keeps posting mono `note` events in poly mode when the tracker returns a single-pitch event — mono consumers unaffected (SR-EVT-03).
- `createMic` gains `onNoteSet` callback and `setPoly(on)` method (posts `config {poly}`); suspend/ignore semantics apply to both paths (`ignore` filters any set containing an ignored pitch-class by removing those pitches; empty remainder → dropped).
- The worker accumulates 4096-sample windows from the existing 2048-frame port messages via `copyWithin` ring; runs poly detect every incoming frame once warm.

- [ ] **Step 1:** Tests: instantiate the worker's exported-for-test handlers if the current file allows; otherwise test at the unit level (ring accumulation helper + "single-pitch set becomes note message" routing extracted as pure functions into `polytracker.js`/worker-local module `app/src/audio/detect/polyroute.js` with `routePolyEvent(ev) -> { type: 'note' | 'noteset', event }`). Follow the existing repo pattern — check how `detect-worker.js` is currently covered and match it.
- [ ] **Step 2:** Implement worker + mic changes.
- [ ] **Step 3:** `cd app && npm test` green; commit — `"Phase 6: worker poly mode and mic onNoteSet plumbing"`

---

### Task 8: Engine chords — gather grading, hints, voice

**Files:** Modify `app/src/core/engine.js`, `app/src/core/hints.js`, `app/src/content/voice.js`; tests `app/test/engine-chord.test.js` (new), extend `app/test/engine.test.js` fixtures only if needed.

**Interfaces:**
- Chord target shape (drill `targets[]` and song `notes[]` entries): `{ notes: ['C4','E4','G4'], fingers: [1,3,5], beats? }`. Helper in course.js (Task 11): `c = (notes, fingers, beats) => ...`. Single-note entries unchanged.
- `drillNote(state, lesson, ev, voice)` and `songNote(...)` now accept NoteEvent or NoteSetEvent (`eventPitches`). For a chord target they run **gather**: state gains `gather: { pitches: [], startTs }`.
  - Gather window: `CHORD_WINDOW_MS = 2500` (rolled chords welcome — lesson 37 "roll it gently"); a note arriving after the window restarts the gather with just itself.
  - Drill matching: exact midi per chord member (or pitch-class when `step.match === 'pitch-class'`); song chord entries match per-member pitch-class with distinct assignment (no double-counting one played pitch).
  - A gathered pitch not in the target → miss: `chordHintText`, gather cleared, misses++.
  - Target set fully gathered → advance exactly like a matched single note (same phase/seqPos/encouragement flow).
- `hints.js`: `chordHintText({ heardPitches, gathered, targetMidis, voice })` → strings from `voice.hints.chordMissing` ("{have} is there — {missing} is still hiding.") / `voice.hints.chordExtra` ("I heard an extra {extra} in there — just {want} this time.") — letters via `letter()`, lists joined " and ".
- `voice.js` additions (student-facing, BO-reviewable): `hints.chordMissing`, `hints.chordExtra`, `encouragements` reuse existing pool; `pill.heardChord` "Heard {letters}"; plus Task 15/16 strings when they arrive.

- [ ] **Step 1: Failing tests** (`engine-chord.test.js`): tap-by-tap C then E then G within window → step advances; C then D → miss with chordExtra hint mentioning D, gather reset; NoteSetEvent [60,64,67] in one event → advances; set [60,64] then single 67 → advances (mixed sources); window expiry: C at t=0, E at t=3000 → gather restarted at E (no false miss); song chord entry graded pitch-class (C3 played as C4+... no — keep song chords octave-strict for hands-together bass vs melody: assert C3 target not satisfied by C4; implement song chord members as **exact-midi** — document the deviation from single-note song pitch-class matching in a comment: hands-together needs the octave).
- [ ] **Step 2–4:** fail → implement → pass. Full app suite green (`npm test`) — existing engine tests must not change behavior.
- [ ] **Step 5: Commit** — `"Phase 6: chord gather grading, chord hints, voice strings"`

---

### Task 9: UI — Staff chords/accidentals/bass clef, Keyboard range/flats

**Files:** Modify `app/src/ui/Staff.jsx`, `app/src/ui/Keyboard.jsx`, `app/src/ui/Lesson.jsx`, `app/src/ui/Song.jsx`, `app/src/core/notes.js`; test `app/test/notes.test.js` (extend).

**Interfaces:**
- `notes.js`: `nameToMidi` accepts flats (`/^([A-G][#b]?)(-?\d)$/`, `Bb4` → 70); new `letterIn(midi, flats = false)` returns 'Bb' style when `flats`; `staffPos(midi)` returns `{ line: whiteIndex-of-natural, accidental: '#' | 'b' | null }` using sharps by default, flats when asked — Staff spacing must key off the **natural letter's** whiteIndex (F#4 sits on F4's position with a ♯ glyph), never `whiteIndex(midi)` (null for black keys).
- `Staff({ notes, clef = 'treble', flats = false, width, height })`:
  - entries may be `{ note, finger, status }` or chord `{ notes: [...], fingers: [...], status }` — a chord renders stacked noteheads sharing one x/stem, fingers stacked above, letter labels joined below ("C·E·G").
  - `clef: 'bass'`: glyph 𝄢, top line = A3 (`noteY_bass(midi) = 46 - (whiteIndexNatural(midi) - whiteIndexNatural(A3)) * 7`), ledger lines generalized: above top line and below bottom line for either clef (C4 in bass = first ledger above).
  - accidental glyph (♯/♭) rendered left of the notehead when `staffPos().accidental`.
- `Keyboard({ onNote, glowMidi, showLabels, low, high = false, flats = false })`: `high` extends layout through octave 5 (whites to C6); `pressed` becomes a Set with per-key timeouts so chords light together; black keys get labels when `showLabels` (letterIn with flats).
- `Lesson.jsx` / `Song.jsx`: build staffNotes tolerating chord entries; pass through lesson flags `clef`, `flats`, `plain` (plain → `showLabels={false}` on Keyboard and letter labels hidden on Staff), `high`/`low`.

- [ ] **Step 1:** Failing notes.js tests (flats parse, letterIn, staffPos for F#4/Bb3/E4).
- [ ] **Step 2:** Implement notes.js → pass.
- [ ] **Step 3:** Implement Staff/Keyboard/Lesson/Song changes (UI untested by node; keep pure math in notes.js).
- [ ] **Step 4: Browser verify with the `verify` skill**: run the app, drive a temporary dev lesson (or lesson 21 preview once Task 11 lands) showing a chord on the staff, bass clef rendering, F# with sharp glyph, keyboard high range, chord key-press lighting. Console clean.
- [ ] **Step 5: Commit** — `"Phase 6: staff bass clef, accidentals, chord columns; keyboard range and flats"`

---

### Task 10: App wiring — noteset routing, per-lesson poly, pill

**Files:** Modify `app/src/app.jsx`.

**Interfaces:**
- Worker `noteset` messages → `onNoteSet(ev)` → same engine sinks as `onNote` (drill/song reducers accept both shapes after Task 8); `markHeard` shows joined letters via `voice.pill.heardChord`.
- On lesson/song start: `mic.setPoly(!!lesson.poly)`; on exit back to mono. Tap keyboard needs no change — engine gather handles serial taps.
- Self-hearing gate: `ignorePitches` already pitch-class-based; chord demos pass all chord pitch-classes.

- [ ] **Step 1:** Implement; run full suite (`npm test`) green.
- [ ] **Step 2:** Browser verify: with `poly` lesson active, `window.__ariettaMicStream` synthesized chord stream (reuse the Phase 2 verification approach) produces one advance per chord; mono lessons unchanged.
- [ ] **Step 3: Commit** — `"Phase 6: noteset routing and per-lesson poly mode"`

---

### Task 11: Unlock lesson 21 — Your first chord

**Files:** Modify `app/src/content/course.js`, `app/test/content.test.js`, `app/test/e2e-course.test.js`.

- [ ] **Step 1:** Author real steps for `your-first-chord` (drill, `poly: true`): info (what a chord is) → watch-me C-E-G simultaneous (`anim` gains `together: true`; WatchMe lands all fingers at once — small WatchMe.jsx addition) → play dyad `c(['C4','E4'],[1,3])` → play dyad `c(['E4','G4'],[3,5])` → play triad `c(['C4','E4','G4'],[1,3,5])` twice ("roll it gently" then "land it as one") → done/recap rewrite ("Your first chord — three notes, one sound."). Remove `comingSoon: true`. Add the chord helper `const c = (notes, fingers, beats) => ...` at the top of course.js.
- [ ] **Step 2:** Update invariants: `content.test.js` — comingSoon count 1 → 0 *(until Course 2 lands; Task 13 revisits)*, `your-first-chord` assertions now check `poly` + chord steps; `e2e-course.test.js` — add `playChord(pitches, ts)` helper feeding serial taps (and one NoteSetEvent variant), lesson 21 now plays through; total-lesson assertions updated.
- [ ] **Step 3:** Full suite green; browser-verify lesson 21 end-to-end by tap.
- [ ] **Step 4: Commit** — `"Phase 6: lesson 21 unlocked - Your first chord (SR-AUD-10 stage b)"`

---

### Task 12: MIDI adapter + native-shell decision (SR-MID-01/02)

**Files:** Create `app/src/audio/midi.js`, `docs/decisions/2026-07-10-native-shell.md`; modify `app/src/app.jsx`, `app/src/content/voice.js` (pill line), `PLAN.md` (§5 decision row); test `app/test/midi.test.js`.

**Interfaces:**
- `createMidiInput({ onNote, onDevices, midiAccess })` — `midiAccess` injectable for tests (defaults to `navigator.requestMIDIAccess?.({ sysex: false })`; resolves to null when unsupported — iPad Safari path).
  - NoteOn (status 0x90–0x9F, velocity > 0) → `noteEvent({ pitch, source: 'midi', velocity: vel / 127, timestamp: performance.now() })`; pitches outside 48–96 dropped silently; NoteOff and other messages ignored.
  - `onDevices(count)` fires on statechange; returns `{ stop() }`.
- App preference (SR-MID-01): when `count > 0` → `mic.stop()`, pill text `voice.pill.midi` ("Hearing your piano through the cable."); when it drops to 0 → mic restarts via the existing recovery path. MIDI chords need no set events — engine gather covers near-simultaneous NoteOns.

- [ ] **Step 1:** Failing tests with a fake MIDIAccess (`{ inputs: Map, onstatechange }` + fake port dispatching `midimessage`): NoteOn 0x90/60/100 → event `{pitch:60, source:'midi', velocity≈0.787}`; NoteOn vel 0 ignored; pitch 30 dropped; statechange fires onDevices.
- [ ] **Step 2:** Implement adapter → pass; wire app preference; browser sanity (no MIDI hardware: verify unsupported path leaves mic untouched).
- [ ] **Step 3:** Write the decision record: **Capacitor chosen as the thin native shell if/when device MIDI ships; not built in Phase 6** — Web MIDI adapter works today in Chrome/Edge and in any future shell; the PWA stays wrap-additive (no code assumes a browser-only API at module top level). Update PLAN.md §5 row "Native shell (Capacitor) for MIDI" → decided, linked.
- [ ] **Step 4: Commit** — `"Phase 6: Web MIDI adapter preferred over mic; native-shell decision recorded"`

---

### Task 13: Course 2 scaffolding

**Files:** Modify `app/src/content/course.js`, `app/src/core/engine.js` (only if `allLessons` needs it — it should not), `app/src/ui/Home.jsx`, `app/test/content.test.js`, `app/test/e2e-course.test.js`.

- [ ] **Step 1:** Add `u7`–`u12` unit shells to `COURSE.units` with tags `'UNIT 7'`..`'UNIT 12'` and their titles from §9.4 (*Reading the Map*, *The Left Hand Speaks*, *Hands Together*, *Black Keys Join In*, *First Chords*, *Your First Recital*). Lessons land per-unit in Tasks 14–19; scaffolding ships each unit with its lessons in the same commit as its content task — this task only: remove the `COMING_SOON` teaser rendering in Home.jsx once `u7` exists (Home already renders units generically; delete the teaser block and the `COMING_SOON` export when the last unit task lands — leave a checklist note).
- [ ] **Step 2:** Update `content.test.js` invariants to derive counts from data (units 12, lessons 43 asserted at Task 19, not before): make the count assertions data-driven per unit map `{u1:3,...}` extended task by task.
- [ ] **Step 3: Commit** with Task 14 (below) — scaffolding alone need not be a green standalone commit if empty units break invariants; fold into Task 14's commit in that case.

---

### Task 14: Unit 7 — Reading the Map (lessons 22–25)

**Files:** Modify `app/src/content/course.js`; extend `app/test/e2e-course.test.js` (runs all lessons automatically via `allLessons`).

No new engine capability except the `plain` flag (Task 9). Lesson data (ids, kinds, targets fixed here; prompt prose authored at execution in the established voice — every step carries real prompt/sub text, no TODOs):

- **22 `notes-cold`** *Notes without training wheels* — drill, `plain: true`: info (labels are fading) → play C4–G4 sequence unlabeled → reading-snippet `pool: [n('C4',1)..n('G4',5)], len: 4` → reading-snippet len 5.
- **23 `steps-and-skips`** *Steps and skips* — drill, `plain: true`: info (neighbors step, gaps skip) → play step pattern C4 D4 E4 D4 C4 → play skip pattern C4 E4 G4 E4 C4 → ear-choice (play C4,D4 vs C4,E4 — "Step or skip?") → reading-snippet len 4.
- **24 `meet-g-position`** *Meet G position* — drill, `high: true`: info → watch-me keys G4–D5 fingers 1–5 right → play G4 A4 B4 C5 D5 → play D5 C5 B4 A4 G4 → play mixed G4 B4 D5 B4 G4.
- **25 `ode-whole-theme`** *Ode to Joy — the whole theme* — song, `plain: true`, notes:
  `E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4 D4 D4` then `E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4 C4 C4`, fingers `3 3 4 5 5 4 3 2 1 1 2 3 3 2 2 / 3 3 4 5 5 4 3 2 1 1 2 3 2 1 1`, harmony at phrase heads `{0:['C3','G3'], 8:['G3','B3'], 15:['C3','G3'], 23:['G3','B3'], 27:['C3','G3']}` (adjust indices to the final array).

- [ ] Author, wire unit into COURSE, extend content invariants (u7: 4 lessons), run full suite + e2e → green; browser spot-check lesson 22 (labels absent) and 24 (high keyboard).
- [ ] Commit — `"Phase 6: Unit 7 - Reading the Map (lessons 22-25)"`

---

### Task 15: Unit 8 — The Left Hand Speaks (lessons 26–29)

Uses `clef: 'bass'` + `low: true` (Task 9). Data:

- **26 `the-bass-clef`** — drill, `clef:'bass'`, `low:true`: info (the left hand's own map) → watch-me C3 D3 E3 fingers 5 4 3 left → play C3 D3 E3 (bass staff) → play C3–G3 up (fingers 5 4 3 2 1).
- **27 `walking-down-the-bass`** — drill, same flags: play G3 F3 E3 D3 C3 → play mixed C3 E3 D3 F3 E3 G3 → reading-snippet pool C3–G3 (fingers 5..1) len 4.
- **28 `merrily-left-hand`** — song, `clef:'bass'`, `low:true`, notes (left hand, fingers C3=5 D3=4 E3=3 F3=2 G3=1):
  `E3 D3 C3 D3 E3 E3 E3 / D3 D3 D3 / E3 G3 G3 / E3 D3 C3 D3 E3 E3 E3 E3 D3 D3 E3 D3 C3`.
- **29 `echo-games`** — drill, `low:true`: ear-echo right phrase C4 E4 G4 → ear-echo left answer C3 E3 G3 → ear-echo right G4 E4 C4 → ear-echo left G3 E3 C3 (one hand at a time — v1 listening suffices; no poly flag).

- [ ] Author, invariants (u8: 4), suite green, browser spot-check bass clef on 26.
- [ ] Commit — `"Phase 6: Unit 8 - The Left Hand Speaks (lessons 26-29)"`

---

### Task 16: Unit 9 — Hands Together (lessons 30–33, `poly: true`)

Chord entries via `c(notes, fingers)`; song chord members exact-midi (Task 8). Data:

- **30 `both-thumbs`** — drill, `poly:true`, `low:true`: info → play `c(['C3','C4'],[5,1])` (both hands sound middle-C world together) → play sequence: chord `c(['C3','C4'])` then singles D4 E4 D4 C4 (melody over the ringing bass).
- **31 `drone-and-melody`** — drill, `poly:true`, `low:true`: play `c(['C3','C4'],[5,1])` then C4 D4 E4 F4 G4 F4 E4 D4 C4 (the five-finger hill over the drone) split across two play steps.
- **32 `au-clair-together`** — song, `poly:true`, `low:true`: notes `c(['C3','C4'],[5,1]) C4 C4 D4 E4 | c(['G3','D4'],[1,2]) C4 | c(['C3','E4'],[5,3]) D4 D4 C4` — i.e. Au clair de la lune (C C C D E, D, C E D D, C) with a left-hand long note starting each phrase.
- **33 `twinkle-together`** — song, `poly:true`, `low:true`: Twinkle first half with bass changes: `c(['C3','C4']) C4 c(['C3','G4']) G4 c(['F3','A4']) A4 G4 | c(['F3','F4']) F4 c(['C3','E4']) E4 c(['G3','D4']) D4 c(['C3','C4'])` (final bare chord ends it). Fingers: melody 1 1 5 5 6→? — C position won't reach A4 with 5-finger C position; use fingers melody `1 1 5 5 (shift) …` — author with the standard beginner fingering `C4:1 G4:4 A4:5 F4:3? ` — set melody fingers `1 1 4 4 5 5 4 / 3 3 2 2 ... 1` matching a C-position-with-stretch; keep left fingers 5 (C3), 2 (F3), 1 (G3).

- [ ] Author (fix exact indices/fingers while writing; every note carries a finger), invariants (u9: 4), suite + e2e chord playback green (e2e `playChord` from Task 11 handles chord entries in songs), browser spot-check 32 with tap.
- [ ] Commit — `"Phase 6: Unit 9 - Hands Together (lessons 30-33)"`

---

### Task 17: Unit 10 — Black Keys Join In (lessons 34–36)

Uses accidentals (Task 9). Data:

- **34 `meet-f-sharp`** — drill, `high:true`: info (G position earns its sharp) → watch-me G4 A4 B4 C5 D5 right 1–5 → play G4 A4 B4 C5 D5 with F#4 intro: play F#4 (finger 4? — F#4 played by finger 1 stretch? author: F#4 as the note under G, finger 1 slides) — steps: play `F#4` (1) alone → play G4 F#4 G4 (2 1 2? keep 1 on F#) → play pattern G4 A4 F#4 G4.
- **35 `meet-b-flat`** — drill, `flats:true`: info (same tune, new home — first transposing) → watch-me F4 G4 A4 Bb4 C5 fingers 1–5 → play F4 G4 A4 Bb4 C5 → play the Merrily opening transposed: A4 G4 F4 G4 A4 A4 A4 (3 2 1 2 3 3 3).
- **36 `london-bridge-in-g`** — song, `high:true`: notes (in G, F# in the cadence):
  `D5 E5 D5 C5 B4 C5 D5 / A4 B4 C5 / B4 C5 D5 / D5 E5 D5 C5 B4 C5 D5 / A4 D5 F#4? ` — author final phrase as `A4 D5 B4 G4` with an F#4 passing step *before* the song inside the same lesson is impossible (songs are notes-only) — so make lesson 36 a **drill** whose last steps are the full song phrases as play steps, F# included in a cadence step `D5 C5 B4 A4 F#4 G4`, with `done.nextSongId` absent. Steps: play phrase 1, play phrase 2 (`A4 B4 C5`), play phrase 3 (`B4 C5 D5`), play phrase 1 again, play cadence `A4 D5 F#4 G4` ("my fair la-dy" with the sharp leaning home). Fingers G-position: G4=1 A4=2 B4=3 C5=4 D5=5, F#4=1, E5=5 stretch.

- [ ] Author, invariants (u10: 3), suite green, browser spot-check sharp/flat glyphs and labels on 34/35.
- [ ] Commit — `"Phase 6: Unit 10 - Black Keys Join In (lessons 34-36)"`

---

### Task 18: Unit 11 — First Chords (lessons 37–40, `poly: true`)

- **37 `building-the-c-chord`** — drill, `poly:true`: info → watch-me C4 E4 G4 together (fingers 1 3 5, `together:true`) → play `c(['C4','E4'],[1,3])` → play `c(['E4','G4'],[3,5])` → play `c(['C4','E4','G4'],[1,3,5])` ("roll it gently") → play same ("now land it as one").
- **38 `c-and-g7`** — drill, `poly:true`: info (two chords take turns) → watch-me B3 F4 G4 (fingers 1 4 5) → play `c(['B3','F4','G4'],[1,4,5])` → play alternation: C chord, G7, C, G7, C (five chord targets in one play step).
- **39 `f-joins`** — drill, `poly:true`: info (the I–IV–V neighborhood) → watch-me C4 F4 A4 (1 4 5? use 1 4 5) → play `c(['C4','F4','A4'],[1,4,5])` → play the round trip: C, F, C, G7, C.
- **40 `saints-with-chords`** — song, `poly:true`, `low:true`: When the Saints, melody right + block chords left at phrase heads:
  melody `C4 E4 F4 G4 | C4 E4 F4 G4 | C4 E4 F4 G4 E4 C4 E4 D4 | E4 E4 D4 C4 C4 E4 G4 G4 F4 | E4 F4 G4 E4 C4 D4 C4`, chords `c(['C3','E3','G3'],[5,3,1])` at bar heads, `c(['F3','A3','C4'],[5,3,1])` under the F-harmony bar, `c(['G3','B3','D4'],[5,3,1])` under the V bar — author exact indices while writing; melody fingers C-position 1 3 4 5.

- [ ] Author, invariants (u11: 4), suite + e2e green (chord e2e already in place), browser spot-check 38 switching.
- [ ] Commit — `"Phase 6: Unit 11 - First Chords (lessons 37-40)"`

---

### Task 19: Unit 12 — Your First Recital (lessons 41–43) + dynamics + setlist

**Files:** Modify `app/src/core/engine.js` (dynamics step, setlist helpers), `app/src/audio/detect/tracker.js` + `polytracker.js` (coarse velocity on mic events), `app/src/store/progress.js` (recital record), `app/src/ui/Lesson.jsx`, new `app/src/ui/Setlist.jsx`, `app/src/ui/Song.jsx` (recital mode), `app/src/app.jsx`, `app/src/content/voice.js`, `app/src/content/course.js`; tests `app/test/dynamics.test.js`, `app/test/setlist.test.js`.

**Interfaces:**
- Mic velocity (coarse loudness, §9.4 lesson 41): trackers attach `velocity: Math.min(1, frameRms * 8)` to emitted events. MIDI velocity already real (Task 12). Tap events carry no velocity.
- New step kind `dynamics`: `{ kind: 'dynamics', mode: 'soft' | 'loud', prompt, sub, targets: [{note,finger}] }`. Engine `drillNote` on a dynamics step: pitch graded as usual; then if `ev.velocity !== undefined`, bucket = `ev.velocity >= 0.45 ? 'loud' : 'soft'`; wrong bucket → stay on the note with a words-only nudge from `voice.dynamics` (`mouse`: "That was a lion — try a mouse: barely brush the key." / `lion`: "That was a mouse — be a lion: let it ring."); right bucket or no velocity (tap fallback) → advance with `voice.dynamics.praise[mode]`.
- New lesson kind `setlist`: `{ kind: 'setlist', pick: 3, from: [songLessonIds], recital?: true }`. Engine helpers: `setlistCandidates(lesson, course, completedIds) -> lessons` (completed songs only, fallback to all `from` if fewer than `pick` completed) and `setlistDone(picked, playedIds) -> bool`.
- `Setlist.jsx`: pick screen (cards, pick N), then plays each via the existing Song screen; `recital` passes `recital: true` to Song → hints suppressed (no hintFor calls surfaced), no trouble-spot loops, Arietta introduces each piece (`voice.recital.intro`: "{title}. Whenever you're ready.") and goes quiet; after the last piece the warmest celebration (`voice.recital.done`) and `saveRecital(profileId, { pieces, at })` in progress.js → Home shows a small "My first recital" keepsake line on the profile (words, no numbers).
- Lesson data:
  - **41 `louds-and-softs`** — drill: info (music breathes) → dynamics soft C4 G4 ("play it like a mouse") → dynamics loud C4 G4 ("now a lion") → dynamics soft then loud on E4 (two steps).
  - **42 `putting-on-polish`** — setlist, `pick: 3`, `from`: the course's song lessons (`ode-to-joy`, `ode-in-time`, `merrily-left-hand`, `au-clair-together`, `twinkle-together`, `london-bridge` if song, `saints-with-chords`, plus v1 songs already in course) — "make it beautiful" pass, normal hints.
  - **43 `recital-day`** — setlist, `pick: 3`, `recital: true`, same `from`; done/recap celebrate and name the saved set.

- [ ] **Step 1:** Failing engine tests: dynamics bucket praise/nudge/tap-fallback; setlistCandidates filtering; setlistDone.
- [ ] **Step 2:** Implement engine + tracker velocity (extend `tracker.test.js`: emitted event has velocity ∈ (0,1]) → pass.
- [ ] **Step 3:** Implement UI (Setlist.jsx, Song recital mode, Lesson dynamics rendering with mouse/lion framing), progress.saveRecital + read path, Home keepsake.
- [ ] **Step 4:** Author lessons 41–43; e2e: extend runner to handle `dynamics` (tap → advances via fallback) and `setlist` (programmatic pick + song runs; recital run asserts no hint text emitted).
- [ ] **Step 5:** Full suite green; browser-verify the recital flow end-to-end by tap.
- [ ] **Step 6:** Remove the `COMING_SOON` teaser (course.js export + Home rendering) — Course 2 is real now. Final content invariants: 12 units, 43 lessons, exactly zero `comingSoon`.
- [ ] **Step 7: Commit** — `"Phase 6: Unit 12 - Your First Recital; dynamics and setlist/recital (lessons 41-43)"`

---

### Task 20: Phase close-out

- [ ] **Step 1:** Full app + spike + server suites green (`cd app && npm test`, `cd spike && node --test test/*.test.js`, `cd server && npm test`).
- [ ] **Step 2:** Local-first regression spot-check in browser: backend unreachable, play a Course 2 lesson, chord lesson, recital — clean console (Phase 5 gate discipline).
- [ ] **Step 3:** Perf sanity: `perf.test.js` still green (poly detector runs off-thread; verify the detector-budget tripwire covers poly frames — extend `perf.test.js` with a 4096-frame poly timing assertion ≤ 150 ms).
- [ ] **Step 4:** Docs: PLAN.md Phase 6 build status (built/verified vs deferred-to-piano items: poly gate human validation via `spike/POLY_GATE_RUNBOOK.md`, MIDI on real hardware, dynamics thresholds on a real piano — all release blockers alongside the Phase 0 runbook); §5 decisions table (native shell decided); `app/README.md` note on poly mode + MIDI.
- [ ] **Step 5:** Commit and **push to origin main** (user memory: push each completed phase).

## Self-review notes

- Spec coverage: SR-AUD-10 (Tasks 1–7, 10), SR-EVT-03 (Task 4, 7, 8), lesson 21 + Units 9/11 unlock (Tasks 11, 16, 18), SR-MID-01/02 (Task 12), §9.4 lessons 22–43 (Tasks 14–19) incl. the content-format rule (all data), dynamics via velocity (Tasks 12+19), recital mode (Task 19), mini-spike gate discipline (Task 3 hard gate + runbook).
- Deliberate deviations, recorded: song chord members grade exact-midi (hands-together needs octaves) unlike single song notes (pitch-class); lesson 36 is a drill (songs are notes-only and the F# cadence needs step framing); Bb spelled internally as `Bb` via extended `nameToMidi`; tap has no velocity so dynamics steps auto-advance on tap (keeps E2E honest and the fallback rule of SR-AUD-12 intact).
- Human/BO gates stay open items, never build blockers: voice review of all new strings, piano validation of the poly gate, MIDI hardware smoke.
