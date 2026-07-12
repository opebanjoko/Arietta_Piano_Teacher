# Letter Weaning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** From Unit 7 onward, staff and keyboard letters appear only on notes that are genuinely new (derived from course order), with a 2-miss struggle reveal and a three-way parent override — per `docs/superpowers/specs/2026-07-12-letter-weaning-design.md`.

**Architecture:** One new pure module (`core/wean.js`) derives per-lesson letter policy and novelty from `allLessons()` order. UI components stop taking a `plain` boolean: Staff entries carry a per-note `letter` flag, Keyboard takes `labels: 'all' | 'none' | Set<midi>`, and `app.jsx` computes everything from the per-player `labels` setting (`'auto'` default). No engine/grading changes.

**Tech Stack:** Vite + Preact in `app/`; tests via `node --test`.

## Global Constraints

- Units 1–6 visuals unchanged (letters everywhere).
- Struggle reveal threshold is **2 misses** — the same constant as the existing key-glow hint.
- `labels` setting values: `'auto'`/unset → progression; `true` → always on; `false` → always off (suppresses glow/struggle letters too, as today).
- Novelty is keyed by **(clef, midi)**: a new clef makes known pitches novel again.
- Reading warm-ups are always novel-only (read cold).
- Do NOT push to origin/main (broken web auto-deploy); commits stay local until deploy time.
- Working dir: `/Users/ope_d_coder/projects/VIBE CODING AGENTIC ENGINEER/Home_Piano_Teacher/app` unless stated.

---

### Task 1: `core/wean.js` — policy + novelty (TDD)

**Files:**
- Create: `app/src/core/wean.js`
- Modify: `app/src/core/practice.js:36-44` (practiceLesson copies `unitId`)
- Modify: `app/src/core/reading.js` (`readingWarmup` marks `readCold: true`)
- Test: `app/test/wean.test.js`

**Interfaces:**
- Produces: `letterPolicy(lesson) -> 'all' | 'novel-only'`; `noveltyFor(lesson) -> Set<number>` (midis novel in that lesson); `letterMidis(labelsSetting, lesson) -> 'all' | 'none' | Set<number>` — Task 2 consumes `letterMidis` in app.jsx.

- [ ] **Step 1: Write the failing tests**

```js
// app/test/wean.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { letterPolicy, noveltyFor, letterMidis } from '../src/core/wean.js'
import { findLesson, READING_POOL } from '../src/content/course.js'
import { readingWarmup } from '../src/core/reading.js'
import { practiceLesson } from '../src/core/practice.js'
import { PRACTICE_PACKS } from '../src/content/practice.js'
import { nameToMidi } from '../src/core/notes.js'

test('letters everywhere in units 1-6; weaned from unit 7 (§3.5)', () => {
  assert.equal(letterPolicy(findLesson('ode-to-joy')), 'all')          // u3
  assert.equal(letterPolicy(findLesson('labe-igi-orombo')), 'all')     // u5
  assert.equal(letterPolicy(findLesson('notes-cold')), 'novel-only')   // u7
  assert.equal(letterPolicy(findLesson('london-bridge-in-g')), 'novel-only') // u10
  assert.equal(letterPolicy(findLesson('saints-with-chords')), 'novel-only') // u11
})

test('novelty: new clef relabels; known material labels nothing', () => {
  // the bass clef lesson is the first bass-staff sighting — its notes are novel
  const bass = noveltyFor(findLesson('the-bass-clef'))
  assert.ok(bass.size > 0, 'first bass-clef notes are novel')
  // Merrily (later, also bass) re-uses those positions — nothing novel
  assert.equal(noveltyFor(findLesson('merrily-left-hand')).size, 0)
  // Meet F sharp introduces F#4; G4 was met long ago
  const fs = noveltyFor(findLesson('meet-f-sharp'))
  assert.ok(fs.has(nameToMidi('F#4')))
  assert.ok(!fs.has(nameToMidi('G4')))
  // London Bridge (after meet-f-sharp) is pure notation
  assert.equal(noveltyFor(findLesson('london-bridge-in-g')).size, 0)
})

test('reading warm-ups read cold; practice inherits its source unit', () => {
  const warmup = readingWarmup(READING_POOL, 1)
  assert.equal(letterPolicy(warmup), 'novel-only')
  assert.equal(noveltyFor(warmup).size, 0)
  const pack = PRACTICE_PACKS[0]
  const lessonised = practiceLesson(pack)
  const expected = Number(pack.unitId.slice(1)) < 7 ? 'all' : 'novel-only'
  assert.equal(letterPolicy(lessonised), expected)
})

test('letterMidis maps the three-way setting', () => {
  const u3 = findLesson('ode-to-joy')
  const u10 = findLesson('london-bridge-in-g')
  assert.equal(letterMidis(false, u3), 'none')
  assert.equal(letterMidis(true, u10), 'all')
  assert.equal(letterMidis(undefined, u3), 'all')
  assert.equal(letterMidis('auto', u3), 'all')
  const set = letterMidis(undefined, u10)
  assert.ok(set instanceof Set && set.size === 0)
  // free play (no lesson): letters on unless always-off
  assert.equal(letterMidis(undefined, null), 'all')
  assert.equal(letterMidis(false, null), 'none')
})
```

- [ ] **Step 2: Run to verify failure**

Run: `cd app && node --test test/wean.test.js 2>&1 | tail -3`
Expected: FAIL — cannot find module `../src/core/wean.js`.

- [ ] **Step 3: Implement `core/wean.js`**

```js
// app/src/core/wean.js
/**
 * Letter weaning (§3.5): letters are training wheels. Units 1-6 show them
 * everywhere; from Unit 7 ("Reading the Map") a letter appears only where a
 * (clef, pitch) pair is genuinely new — in the lesson that introduces it.
 * Derived from course order so it can never drift back to letters-everywhere.
 */
import { allLessons } from '../content/course.js'
import { nameToMidi } from './notes.js'

const WEAN_FROM_UNIT = 7
const clefOf = (lesson) => lesson.clef ?? 'treble'

/** Note names a lesson puts on the staff: song notes, play/dynamics targets, reading pools. */
function staffNames(lesson) {
  const out = []
  const push = (t) => { for (const nm of t.notes ?? [t.note]) out.push(nm) }
  if (lesson.kind === 'song') lesson.notes.forEach(push)
  for (const s of lesson.steps ?? []) {
    if (s.kind === 'play' || s.kind === 'dynamics') s.targets.forEach(push)
    if (s.kind === 'reading-snippet') s.pool.forEach(push)
  }
  return out
}

let cache = null
/** "clef:midi" -> id of the lesson (course order) that first shows it. */
function firstSeen() {
  if (cache) return cache
  cache = new Map()
  for (const l of allLessons()) {
    for (const nm of staffNames(l)) {
      const k = `${clefOf(l)}:${nameToMidi(nm)}`
      if (!cache.has(k)) cache.set(k, l.id)
    }
  }
  return cache
}

const unitIndex = (lesson) => Number(/^u(\d+)$/.exec(lesson?.unitId ?? '')?.[1] ?? NaN)

/** 'all' (letters everywhere) or 'novel-only' (letters only on new notes). */
export function letterPolicy(lesson) {
  if (lesson.readCold) return 'novel-only' // fresh reading is read cold by design
  const u = unitIndex(lesson)
  return Number.isNaN(u) || u < WEAN_FROM_UNIT ? 'all' : 'novel-only'
}

/** Midis whose letters this lesson may still show under 'novel-only'. */
export function noveltyFor(lesson) {
  const fs = firstSeen()
  const set = new Set()
  for (const nm of staffNames(lesson)) {
    const midi = nameToMidi(nm)
    if (fs.get(`${clefOf(lesson)}:${midi}`) === lesson.id) set.add(midi)
  }
  return set
}

/**
 * What the UI shows for a per-player labels setting + lesson:
 * 'all' | 'none' | Set of midis. lesson null (free play) reads as 'all'.
 */
export function letterMidis(labelsSetting, lesson) {
  if (labelsSetting === false) return 'none'
  if (labelsSetting === true || !lesson) return 'all'
  return letterPolicy(lesson) === 'all' ? 'all' : noveltyFor(lesson)
}
```

- [ ] **Step 4: `practiceLesson` copies the pack's unit; `readingWarmup` marks readCold**

In `app/src/core/practice.js`, inside `practiceLesson(pack)`'s returned object, add one line after `ephemeral: true,`:

```js
    unitId: pack.unitId, // letter policy follows the unit the pack draws from
```

In `app/src/core/reading.js`, inside `readingWarmup`'s lesson object, add after `ephemeral: true,` line:

```js
    readCold: true, // never show letters — fresh reading is the point (§3.5)
```

- [ ] **Step 5: Run the tests**

Run: `cd app && node --test test/wean.test.js 2>&1 | grep -E "✔|✖|fail [0-9]"`
Expected: all 4 tests PASS. If the `meet-f-sharp` assertion fails because an earlier ear-step plays F#, check `staffNames` only collects play/dynamics/reading/song entries (ear steps have no staff).

- [ ] **Step 6: Commit**

```bash
git add app/src/core/wean.js app/src/core/practice.js app/src/core/reading.js app/test/wean.test.js
git commit -m "Wean core: derived letter policy and novelty per lesson"
```

---

### Task 2: UI wiring — Staff, Keyboard, Lesson, Song, app

**Files:**
- Modify: `app/src/ui/Staff.jsx` (drop `plain`, per-entry `letter`)
- Modify: `app/src/ui/Keyboard.jsx` (`showLabels` → `labels`)
- Modify: `app/src/ui/Lesson.jsx`, `app/src/ui/Song.jsx` (accept `letters`, build per-entry flags + struggle reveal)
- Modify: `app/src/app.jsx:750,795-825` (compute `letters`, pass down, drop `plain`/`showLabels`)
- Modify: `app/src/content/course.js` (delete the three `plain: true` lines)

**Interfaces:**
- Consumes: `letterMidis(labelsSetting, lesson)` from Task 1.
- Produces: Staff note entries carry `letter: boolean`; Keyboard prop `labels: 'all' | 'none' | Set<number>`.

- [ ] **Step 1: Staff.jsx — per-entry letters**

Replace the signature line:

```js
export function Staff({ notes, clef = 'treble', flats = false, plain = false, width = 620, height = 166 }) {
```
with
```js
export function Staff({ notes, clef = 'treble', flats = false, width = 620, height = 166 }) {
```

and replace the letter-label render:

```js
              {!plain && (
                <div style={`position:absolute;left:0;top:${Math.max(bottomY + 14, 140)}px;transform:translateX(-50%);font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.5px;color:${label};`}>{letters}</div>
              )}
```
with
```js
              {n.letter && (
                <div style={`position:absolute;left:0;top:${Math.max(bottomY + 14, 140)}px;transform:translateX(-50%);font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.5px;color:${label};`}>{letters}</div>
              )}
```

Also update the doc comment (`plain` fades → entries carry `letter`).

- [ ] **Step 2: Keyboard.jsx — `labels` prop**

Change the signature from `showLabels = true` to `labels = 'all'` and compute visibility per key. White keys — replace:

```js
                  <div style={`font-weight:800;font-size:14px;color:${glow ? 'var(--accent-ink)' : 'var(--ink-mid)'};opacity:${showLabels ? 1 : 0};`}>{letter(nameToMidi(name))}</div>
```
with (the key's midi is already computed for `glow`; hoist it):
```js
            {whites.map(name => {
              const midi = nameToMidi(name)
              const isPressed = pressed.has(name)
              const glow = glowMidi === midi
              const showL = labels === 'all' || (labels !== 'none' && (labels.has(midi) || glow))
```
and in the label div: `opacity:${showL ? 1 : 0}` with `{letter(midi)}`.

Black keys — replace the label condition:

```js
                {showLabels && glow && <div style="font-weight:800;font-size:11px;color:#EFE3C4;">{letterIn(midi, flats)}</div>}
```
with
```js
                {labels !== 'none' && glow && <div style="font-weight:800;font-size:11px;color:#EFE3C4;">{letterIn(midi, flats)}</div>}
```

(Blacks keep letters only while glowing, as today; `'none'` suppresses even that, matching the old `showLabels === false`.)

- [ ] **Step 3: Lesson.jsx — per-entry letters + struggle reveal**

Add import: `import { nameToMidi } from '../core/notes.js'` (already present). Add `letters` to the component props, and replace the staffNotes builder:

```js
  const staffNotes = step.kind === 'play' || step.kind === 'dynamics'
    ? step.targets.map((t, i) => {
        const status = i < drill.seqPos ? 'played'
          : (i === drill.seqPos && drill.phase === 'working') ? 'current' : 'up'
        const midis = (t.notes ?? [t.note]).map(nameToMidi)
        const letter = letters === 'all' ||
          (letters !== 'none' && (midis.some(m => letters.has(m)) ||
            (status === 'current' && drill.misses >= 2))) // struggle reveal, same threshold as the key glow
        return { ...t, status, letter }
      })
    : []
```

Remove `plain={!!lesson.plain}` from the `<Staff …>` call.

- [ ] **Step 4: Song.jsx — same treatment**

Add `import { nameToMidi } from '../core/notes.js'` and `letters` to props. Replace the staffNotes builder:

```js
  const staffNotes = lesson.notes.map((t, i) => {
    let status = 'up'
    if (demo.on && i === demo.pos) status = 'demo'
    else if (song.loop) status = i === ti ? 'current' : (i >= song.loop.from && i < ti ? 'played' : 'up')
    else if (i < song.pos) status = 'played'
    else if (i === song.pos && !song.done && !demo.on) status = 'current'
    const midis = (t.notes ?? [t.note]).map(nameToMidi)
    const letter = letters === 'all' ||
      (letters !== 'none' && (midis.some(m => letters.has(m)) ||
        (status === 'current' && song.misses >= 2)))
    return { ...t, status, letter }
  })
```

Remove `plain={!!lesson.plain}` from the `<Staff …>` call.

- [ ] **Step 5: app.jsx — compute and pass `letters`**

Add import: `import { letterMidis } from './core/wean.js'`.

Free play keyboard (line ~750): replace `showLabels={profileSettings.labels !== false}` with `labels={letterMidis(profileSettings.labels, null)}`.

Lesson/Song screen (before the return, next to `glowMidi`): add

```js
  const letters = letterMidis(profileSettings.labels, lesson)
```

Pass `letters={letters}` to both `<Lesson …>` and `<Song …>`, and replace the keyboard line

```js
      <Keyboard onNote={onNote} glowMidi={glowMidi} low={lessonLow} high={lessonHigh} flats={!!lesson.flats}
        showLabels={profileSettings.labels !== false && !lesson.plain} />
```
with
```js
      <Keyboard onNote={onNote} glowMidi={glowMidi} low={lessonLow} high={lessonHigh} flats={!!lesson.flats}
        labels={letters} />
```

- [ ] **Step 6: Delete the three `plain: true,` lines from `app/src/content/course.js`** (lessons `notes-cold`, `steps-and-skips`, `ode-whole-theme`) and confirm no `plain` remains:

Run: `grep -rn "plain" app/src --include="*.jsx" --include="*.js" | grep -v "plain-language"`
Expected: no hits (or only unrelated words like "explain").

- [ ] **Step 7: Full suite + build**

Run: `cd app && npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)" && npm run build 2>&1 | tail -2`
Expected: `fail 0`; build completes.

- [ ] **Step 8: Commit**

```bash
git add app/src app/test
git commit -m "Letters wean across staff and keyboard; struggle reveal at 2 misses"
```

---

### Task 3: Settings three-way control + voice

**Files:**
- Modify: `app/src/ui/Settings.jsx:29-63`
- Modify: `app/src/content/voice.js:246-248`

**Interfaces:**
- Consumes: existing `onLabels(value)` → `patchSettings({ labels })`; now receives `'auto' | true | false`.

- [ ] **Step 1: Voice strings**

Replace in `voice.js`:

```js
    labelsLine: 'Letter names on the tap keys.',
    labelsOn: 'Shown',
    labelsOff: 'Hidden',
```
with
```js
    labelsLine: 'Letter names on notes and keys.',
    labelsAuto: 'Auto — they fade as reading grows',
    labelsOn: 'Always shown',
    labelsOff: 'Hidden',
```

- [ ] **Step 2: Settings.jsx segmented control**

Replace `const labels = settings.labels !== false` with `const labels = settings.labels ?? 'auto'`, and replace the labels row:

```jsx
          <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;">
            <div style="font-size:14px;color:var(--ink-soft);">{v.labelsLine}</div>
            <button class="btn-quiet" onClick={() => onLabels(!labels)}>{labels ? v.labelsOn : v.labelsOff}</button>
          </div>
```
with
```jsx
          <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;">
            <div style="font-size:14px;color:var(--ink-soft);">{v.labelsLine}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;" role="group" aria-label={v.labelsLine}>
              {[['auto', v.labelsAuto], [true, v.labelsOn], [false, v.labelsOff]].map(([val, text]) => (
                <button key={String(val)} class="btn-quiet" onClick={() => onLabels(val)}
                  aria-pressed={labels === val}
                  style={labels === val ? 'background:var(--accent-soft);border-color:var(--line-strong);' : ''}>
                  {text}
                </button>
              ))}
            </div>
          </div>
```

- [ ] **Step 3: Full suite**

Run: `cd app && npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: `fail 0` (voice pool test tolerates added keys).

- [ ] **Step 4: Commit**

```bash
git add app/src/ui/Settings.jsx app/src/content/voice.js
git commit -m "Settings: three-way letter labels (auto / always / hidden)"
```

---

### Task 4: REQUIREMENTS.md + in-app verification

**Files:**
- Modify: `REQUIREMENTS.md` (§3.5 addition; lesson-22 line)

- [ ] **Step 1: Document the ladder in §3.5**

After the "Fresh reading" bullet in §3.5, add:

```markdown
- **Letters wean as reading grows.** Note letters (staff labels and tap-key labels)
  are training wheels: fully on through Unit 6, then from Unit 7 a letter appears
  only where a (clef, pitch) pair is genuinely new — in the lesson that introduces
  it. Two misses on the current note reveal its letter until it is played. Derived
  from course order, never hand-tagged. A per-player setting overrides: auto
  (default), always shown, hidden.
```

Update the Unit 7 lesson line `22. *Notes without training wheels* — letter labels fade on known notes; read C–G cold.` to end with `; the derived letter-weaning rule takes over from here.`

- [ ] **Step 2: In-app verification (dev server + Playwright, iPad viewport)**

Run `cd app && npx vite --port 5199 --strictPort` (background), then verify:

1. Unit 3 song (Ode to Joy): all staff letters + all key labels visible (acceptance 1).
2. `the-bass-clef` drill: staff letters visible on its bass notes (acceptance 2a).
3. `merrily-left-hand`: no staff letters, no key labels (acceptance 2b).
4. `london-bridge-in-g`: no letters (acceptance 3); `meet-f-sharp`: F♯ labeled.
5. In Merrily, miss the current note twice (tap a wrong key twice): current note's letter appears on the staff and the glowing key shows its letter; play it right — letter disappears (acceptance 4).
6. Settings: switch to "Always shown" → Merrily shows all letters; "Hidden" → Unit 3 shows none; back to Auto (acceptance 5).

- [ ] **Step 3: Full suite one last time**

Run: `cd app && npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: `fail 0`.

- [ ] **Step 4: Commit**

```bash
git add REQUIREMENTS.md
git commit -m "REQUIREMENTS: letter-weaning ladder in §3.5"
```

Deploy note: ships together with the Yoruba-tunes work in one push + staging-dir `web` deploy (user gate), per the Yoruba plan's Task 6.
