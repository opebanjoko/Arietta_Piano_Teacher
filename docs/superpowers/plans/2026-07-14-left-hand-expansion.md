# Left-Hand Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add six new left-hand lessons in place — 2 mono in Unit 8, 4 hands-together (poly) in Unit 9 — as pure data in `app/src/content/course.js`.

**Architecture:** Content-only. New lesson/song objects use the existing `n()`/`c()` helpers and step kinds; no engine, detector, schema, or step-kind changes. Insertion relies on the engine's existing high-water-mark unlock so already-completed units stay playable. The `recap.seed` narrative chain is rewritten at each insertion point.

**Tech Stack:** Plain ES modules; `node --test` (node:test); Preact app (untouched here).

## Global Constraints

- All work is in `app/`; run commands from `app/` (`cd app`). Package manager context: `node --test 'test/*.test.js'` via `npm test`.
- Fingering is mandatory on every target/note (SR-CRS-05): `n(note, finger)`, `c(notes, fingers)`. Fingers are integers 1–5.
- Bass C3 position fingering: C3=5, D3=4, E3=3, F3=2, G3=1.
- Hands-together chords (`c(...)`) must obey the poly gate: 2–4 members, each within C3–C5 (midi 48–72), and **no two members share a pitch class** (no simultaneous unison/octave between hands). This is already enforced by `checkTarget` in `test/content.test.js:11-19` — new chords must pass it; no new test needed.
- Every lesson needs `done.title`, `done.line`, `recap.summary`, and `recap.seed` (`test/content.test.js:34,121`).
- Every song needs ≥ 8 `notes` (`test/content.test.js:127`).
- Units 9 and 11 lessons must set `poly: true` (`test/content.test.js:51`).
- Copy is written in Arietta's gentle voice; all new student-facing strings require BO voice review before release (flag in PLAN.md, do not block this plan).
- Song melodies use accurate public-domain notation (Lightly Row, Ode to Joy — transposed as noted).

---

### Task 1: Unit 8 — two mono lessons + recap chain

**Files:**
- Modify: `app/src/content/course.js` (Unit `u8` lessons array; anchors `the-bass-clef`, `merrily-left-hand`)
- Modify: `app/test/content.test.js:38-48` (course-shape assertion)

**Interfaces:**
- Consumes: `n(note, finger)` helper (course.js:12).
- Produces: lessons with ids `left-hand-warmup`, `lightly-row-left-hand` (referenced by Task 3 docs and by the Task 2 slice list).

- [ ] **Step 1: Update the course-shape test to the post-Task-1 state (failing test)**

In `app/test/content.test.js`, change the test name and body at lines 38-48. Set the count to 49 and insert the two new Unit 8 ids in order:

```js
test('the course completes the year (§9.4 + Yoruba tunes + left-hand expansion)', () => {
  assert.equal(lessons.length, 49)
  assert.equal(new Set(lessons.map(l => l.unitId)).size, 12)
  assert.deepEqual(lessons.map(l => l.id).slice(25), [
    'notes-cold', 'steps-and-skips', 'meet-g-position', 'ode-whole-theme',
    'the-bass-clef', 'left-hand-warmup', 'walking-down-the-bass', 'merrily-left-hand', 'lightly-row-left-hand', 'echo-games',
    'both-thumbs', 'drone-and-melody', 'au-clair-together', 'twinkle-together',
    'meet-f-sharp', 'meet-b-flat', 'london-bridge-in-g',
    'building-the-c-chord', 'c-and-g7', 'f-joins', 'saints-with-chords',
    'louds-and-softs', 'putting-on-polish', 'recital-day'
  ])
  for (const l of lessons.filter(l => ['u9', 'u11'].includes(l.unitId))) {
    assert.ok(l.poly, `${l.id}: Units 9/11 require polyphonic listening`)
  }
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd app && node --test test/content.test.js`
Expected: FAIL — `lessons.length` is 47, and the slice will not contain `left-hand-warmup`/`lightly-row-left-hand`.

- [ ] **Step 3: Insert the warm-up drill after `the-bass-clef`**

In `app/src/content/course.js`, inside unit `u8`'s `lessons` array, add this object immediately AFTER the `the-bass-clef` lesson object (before `walking-down-the-bass`):

```js
{
  id: 'left-hand-warmup',
  title: 'The left hand warms up',
  kind: 'drill',
  clef: 'bass',
  low: true,
  steps: [
    {
      kind: 'info',
      prompt: 'Before the hands ever play together, the left hand does its own warm-up.',
      sub: 'Five deep fingers, five deep notes — pinky to thumb, C up to G.'
    },
    {
      kind: 'watch-me',
      prompt: 'Watch the left hand climb: pinky first, up to the thumb.',
      sub: 'C, D, E, F, G — fingers 5, 4, 3, 2, 1.',
      anim: { keys: ['C3', 'D3', 'E3', 'F3', 'G3'], fingers: [5, 4, 3, 2, 1], hand: 'left' }
    },
    {
      kind: 'play',
      prompt: 'Climb the five deep notes: C, D, E, F, G.',
      sub: 'Pinky to thumb — 5, 4, 3, 2, 1.',
      targets: [n('C3', 5), n('D3', 4), n('E3', 3), n('F3', 2), n('G3', 1)]
    },
    {
      kind: 'play',
      prompt: 'And back down: G, F, E, D, C.',
      sub: 'Thumb to pinky — 1, 2, 3, 4, 5.',
      targets: [n('G3', 1), n('F3', 2), n('E3', 3), n('D3', 4), n('C3', 5)]
    },
    {
      kind: 'play',
      prompt: 'Now skip about, and the left hand gets nimble.',
      sub: 'C, E, D, F, E, G — little hops between the deep notes.',
      targets: [n('C3', 5), n('E3', 3), n('D3', 4), n('F3', 2), n('E3', 3), n('G3', 1)]
    }
  ],
  done: {
    title: 'The left hand is warm.',
    line: 'Five fingers, five deep notes — up, down, and skipping. Ready for anything.'
  },
  recap: {
    summary: 'Today the left hand warmed up its five deep fingers, on its own.',
    seed: 'Next time it walks down the bass clef, reading little melodies.'
  }
},
```

- [ ] **Step 4: Insert the Lightly Row song after `merrily-left-hand`**

In unit `u8`'s `lessons` array, add this object immediately AFTER the `merrily-left-hand` lesson object (before `echo-games`):

```js
{
  id: 'lightly-row-left-hand',
  title: 'Lightly Row — left hand',
  kind: 'song',
  clef: 'bass',
  card: 'The little boat song, rowed by the left hand alone — deep and warm.',
  notes: [
    n('G3', 1), n('E3', 3), n('E3', 3), n('F3', 2), n('D3', 4), n('D3', 4), n('C3', 5),
    n('D3', 4), n('E3', 3), n('F3', 2), n('G3', 1), n('G3', 1), n('G3', 1)
  ],
  done: {
    title: 'The left hand rowed the whole boat.',
    line: 'Lightly Row, all the way through, deep and low — no right hand needed.'
  },
  recap: {
    summary: 'Today your left hand carried Lightly Row by itself.',
    seed: 'Next time the hands play echo games — one asks, the other answers.'
  }
},
```

- [ ] **Step 5: Rewrite the two upstream recap seeds in Unit 8**

In `the-bass-clef`'s `recap`, change the `seed` from
`'Next time you’ll walk down it, note by note.'`
to:

```js
    seed: 'Next time the left hand warms up its five deep fingers.'
```

In `merrily-left-hand`'s `recap`, change the `seed` from
`'Next time the hands play echo games — one asks, the other answers.'`
to:

```js
    seed: 'Next time the left hand rows a second song of its own: Lightly Row.'
```

(`walking-down-the-bass`'s seed already points to Merrily and `echo-games`'s seed already bridges to Unit 9 — leave both unchanged.)

- [ ] **Step 6: Run the content suite to verify green**

Run: `cd app && node --test test/content.test.js`
Expected: PASS (all content tests, including the updated course-shape test).

- [ ] **Step 7: Run the wean and full suite to verify no regressions**

Run: `cd app && npm test`
Expected: the mono corpus gate (`recorded corpus meets the gate`) fails as before (pre-existing, recorded-audio-only); ALL other tests pass, including `test/wean.test.js` and `test/e2e-course.test.js`. No new failures.

- [ ] **Step 8: Commit**

```bash
cd "/Users/ope_d_coder/projects/VIBE CODING AGENTIC ENGINEER/Home_Piano_Teacher"
git add app/src/content/course.js app/test/content.test.js
git commit -m "Unit 8: left-hand warm-up + Lightly Row (left hand alone)"
```

---

### Task 2: Unit 9 — four hands-together lessons + recap chain

**Files:**
- Modify: `app/src/content/course.js` (Unit `u9` lessons array; anchors `both-thumbs`, `drone-and-melody`, `au-clair-together`, `twinkle-together`)
- Modify: `app/test/content.test.js:38-48` (course-shape assertion → 53)

**Interfaces:**
- Consumes: `n(note, finger)`, `c(notes, fingers)` helpers (course.js:12,14).
- Produces: lessons `hands-keep-the-beat`, `walking-bass`, `ode-together`, `lightly-row-together` (all `poly: true`); referenced by Task 3 docs.

- [ ] **Step 1: Update the course-shape test to the final state (failing test)**

In `app/test/content.test.js`, set the count to 53 and the slice to the final ordering:

```js
  assert.equal(lessons.length, 53)
  assert.equal(new Set(lessons.map(l => l.unitId)).size, 12)
  assert.deepEqual(lessons.map(l => l.id).slice(25), [
    'notes-cold', 'steps-and-skips', 'meet-g-position', 'ode-whole-theme',
    'the-bass-clef', 'left-hand-warmup', 'walking-down-the-bass', 'merrily-left-hand', 'lightly-row-left-hand', 'echo-games',
    'both-thumbs', 'hands-keep-the-beat', 'drone-and-melody', 'walking-bass', 'au-clair-together', 'ode-together', 'twinkle-together', 'lightly-row-together',
    'meet-f-sharp', 'meet-b-flat', 'london-bridge-in-g',
    'building-the-c-chord', 'c-and-g7', 'f-joins', 'saints-with-chords',
    'louds-and-softs', 'putting-on-polish', 'recital-day'
  ])
```

(Leave the test name and the Units-9/11 poly loop from Task 1 as they are.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd app && node --test test/content.test.js`
Expected: FAIL — count is 49, and the slice lacks the four new Unit 9 ids.

- [ ] **Step 3: Insert "Two hands keep the beat" after `both-thumbs`**

In unit `u9`'s `lessons` array, add this object immediately AFTER `both-thumbs` (before `drone-and-melody`):

```js
{
  id: 'hands-keep-the-beat',
  title: 'Two hands keep the beat',
  kind: 'drill',
  poly: true,
  low: true,
  steps: [
    {
      kind: 'info',
      prompt: 'Now both hands strike at the very same instant — like two feet landing together.',
      sub: 'No walking yet. Just land together, lift together.'
    },
    {
      kind: 'play',
      prompt: 'Land them together: deep C and the E above.',
      sub: 'Left pinky, right middle finger — one press, one sound.',
      targets: [c(['C3', 'E4'], [5, 3])]
    },
    {
      kind: 'play',
      prompt: 'Two together-hits in a row: low C with E, then G with D.',
      sub: 'Both hands move as one — land, lift, land.',
      targets: [c(['C3', 'E4'], [5, 3]), c(['G3', 'D4'], [1, 2])]
    },
    {
      kind: 'play',
      prompt: 'Keep the beat: C-with-E, G-with-D, C-with-E.',
      sub: 'Steady as a heartbeat — both hands together every time.',
      targets: [c(['C3', 'E4'], [5, 3]), c(['G3', 'D4'], [1, 2]), c(['C3', 'E4'], [5, 3])]
    }
  ],
  done: {
    title: 'Both hands, one beat.',
    line: 'Landing together is its own skill — and you just found it.'
  },
  recap: {
    summary: 'Today both hands learned to strike at the very same instant.',
    seed: 'Next time the left hand holds one long drone while the right sings above it.'
  }
},
```

- [ ] **Step 4: Insert "A walking bass" after `drone-and-melody`**

In unit `u9`'s `lessons` array, add this object immediately AFTER `drone-and-melody` (before `au-clair-together`):

```js
{
  id: 'walking-bass',
  title: 'A walking bass',
  kind: 'drill',
  poly: true,
  low: true,
  steps: [
    {
      kind: 'info',
      prompt: 'A walking bass: the left hand steps between two notes while the right hand sings above.',
      sub: 'This is the big one — the left hand moves on its own now, not just holding still.'
    },
    {
      kind: 'play',
      prompt: 'Right hand holds E. Left hand steps: deep C, then G.',
      sub: 'Left pinky, then left thumb — the right hand stays put on E.',
      targets: [c(['C3', 'E4'], [5, 3]), c(['G3', 'E4'], [1, 3])]
    },
    {
      kind: 'play',
      prompt: 'Now walk it: C, G, C, G — right hand still singing E.',
      sub: 'Left hand steps back and forth, steady and low.',
      targets: [c(['C3', 'E4'], [5, 3]), c(['G3', 'E4'], [1, 3]), c(['C3', 'E4'], [5, 3]), c(['G3', 'E4'], [1, 3])]
    }
  ],
  done: {
    title: 'The left hand walks on its own.',
    line: 'A moving bass under a steady tune — the hands are truly independent now.'
  },
  recap: {
    summary: 'Today the left hand walked between two notes while the right hand held its own.',
    seed: 'Next time: Au clair de la lune, hands together.'
  }
},
```

- [ ] **Step 5: Insert "Ode to Joy — together" after `au-clair-together`**

In unit `u9`'s `lessons` array, add this object immediately AFTER `au-clair-together` (before `twinkle-together`):

```js
{
  id: 'ode-together',
  title: 'Ode to Joy — together',
  kind: 'song',
  poly: true,
  low: true,
  card: 'The tune that started it all — now both hands, a deep note holding the ground beneath the melody.',
  notes: [
    c(['C3', 'E4'], [5, 3]), n('E4', 3), n('F4', 4), n('G4', 5), n('G4', 5), n('F4', 4), n('E4', 3),
    c(['G3', 'D4'], [1, 2]), n('C4', 1), n('C4', 1), n('D4', 2), n('E4', 3), n('E4', 3), n('D4', 2), n('D4', 2)
  ],
  done: {
    title: 'Ode to Joy, hands together.',
    line: 'The very first tune you learned — now with its own ground underneath. Both hands, one music.'
  },
  recap: {
    summary: 'Today Ode to Joy came back with a deep left-hand note under every phrase.',
    seed: 'Next time Twinkle returns, with the left hand moving beneath the tune.'
  }
},
```

- [ ] **Step 6: Insert "Lightly Row — together" after `twinkle-together`**

In unit `u9`'s `lessons` array, add this object immediately AFTER `twinkle-together` (it becomes the last lesson in `u9`):

```js
{
  id: 'lightly-row-together',
  title: 'Lightly Row — together',
  kind: 'song',
  poly: true,
  low: true,
  card: 'The little boat song, both hands aboard now.',
  notes: [
    c(['C3', 'G4'], [5, 5]), n('E4', 3), n('E4', 3), n('F4', 4), n('D4', 2), n('D4', 2),
    c(['F3', 'C4'], [2, 1]), n('D4', 2), n('E4', 3), n('F4', 4), n('G4', 5), n('G4', 5), n('G4', 5)
  ],
  done: {
    title: 'Lightly Row, both hands aboard.',
    line: 'The boat you rowed left-hand-alone, now with the melody singing on top. You did both at once.'
  },
  recap: {
    summary: 'Today Lightly Row played with both hands — the tune on top, a deep note beneath.',
    seed: 'Next time the black keys finally join in.'
  }
},
```

- [ ] **Step 7: Rewrite the four upstream recap seeds in Unit 9**

- `both-thumbs` `seed`: from `'Next time the left hand holds one long drone while the right sings.'` to:

```js
    seed: 'Next time both hands keep a steady beat together.'
```

- `drone-and-melody` `seed`: from `'Next time: Au clair de la lune, hands together.'` to:

```js
    seed: 'Next time the left hand walks a bass while the right hand sings.'
```

- `au-clair-together` `seed`: from `'Next time Twinkle comes back, with the left hand changing beneath the tune.'` to:

```js
    seed: 'Next time Ode to Joy returns — both hands together.'
```

- `twinkle-together` `seed`: from `'Next time the black keys finally join in.'` to:

```js
    seed: 'Next time Lightly Row comes back, both hands aboard.'
```

(`lightly-row-together` carries the Unit-10 bridge seed added in Step 6.)

- [ ] **Step 8: Run the content suite to verify green**

Run: `cd app && node --test test/content.test.js`
Expected: PASS — count 53, ordering matches, all four new Unit 9 lessons are `poly` and well-formed; both new songs have ≥ 8 notes and pass `checkTarget` (no simultaneous octave/unison).

- [ ] **Step 9: Run the full suite (incl. wean + e2e) to verify no regressions**

Run: `cd app && npm test`
Expected: only the pre-existing mono corpus gate fails; everything else passes, including `test/wean.test.js` (no new novelty introduced) and `test/e2e-course.test.js` (now driving 53 lessons via tap, including the four new poly chords).

- [ ] **Step 10: Verify no other hardcoded course counts remain**

Run: `cd app && grep -rn "47" test/ src/ | grep -iv "midi\|freq\|0x\|470\|147\|247\|347\|472\|473\|474\|475\|476\|477\|478\|479"`
Expected: no remaining reference to a 47-lesson course count in tests or source. If any surfaces, update it to 53 and re-run `npm test`.

- [ ] **Step 11: Commit**

```bash
cd "/Users/ope_d_coder/projects/VIBE CODING AGENTIC ENGINEER/Home_Piano_Teacher"
git add app/src/content/course.js app/test/content.test.js
git commit -m "Unit 9: keep-the-beat, walking bass, Ode + Lightly Row hands-together"
```

---

### Task 3: Docs — REQUIREMENTS course map + PLAN voice-review flag

**Files:**
- Modify: `REQUIREMENTS.md` (§9.4 Unit 8 & Unit 9 lesson lists)
- Modify: `PLAN.md` (Phase 3 build-status note or a new content note)

**Interfaces:** none (documentation only).

- [ ] **Step 1: Update REQUIREMENTS §9.4 Unit 8 block**

Replace the Unit 8 lesson list (currently items 26–29) with the six-lesson list:

```markdown
**Unit 8 — The Left Hand Speaks** *(bass clef; hands alternate — v1 listening suffices)*
26. *The bass clef* — the left hand gets its own map; bass-clef C3 position.
27. *The left hand warms up* — a five-finger warm-up in bass C3 position, up, down, and skipping.
28. *Walking down the bass* — C3–G3 melodies read from the bass clef.
29. *Merrily We Roll Along — left hand* — the full melody, left hand alone.
30. *Lightly Row — left hand* — a second left-hand-alone song, in bass C3 position.
31. *Echo games* — the right hand plays a phrase, the left answers; one hand at a time.
```

- [ ] **Step 2: Update REQUIREMENTS §9.4 Unit 9 block**

Replace the Unit 9 lesson list (currently items 30–33) with the eight-lesson list:

```markdown
**Unit 9 — Hands Together** *(requires §9.1 stages a–b)*
32. *Both thumbs share middle C* — one held left-hand note under a right-hand melody.
33. *Two hands keep the beat* — both hands strike on the same instant; no independent movement yet.
34. *Drone and melody* — the left sustains C while the right walks the five-finger hill.
35. *A walking bass* — the left hand steps between two notes under a held right-hand note.
36. *Au clair de la lune — together* — long left-hand notes under the melody.
37. *Ode to Joy — together* — a deep left-hand note anchors each phrase of the melody.
38. *Twinkle — together* — the left hand changes notes beneath the tune.
39. *Lightly Row — together* — melody on top, a left-hand note beneath; consolidates coordination.
```

- [ ] **Step 3: Renumber the following units in REQUIREMENTS §9.4**

The six insertions shift every later lesson number by +6. Update the lesson numbers in the Unit 10, Unit 11, and Unit 12 blocks accordingly: Unit 10 items 34–36 → 40–42; Unit 11 items 37–40 → 43–46; Unit 12 items 41–43 → 47–49. Update only the leading numbers; leave the lesson text unchanged. Also update the section heading `(Units 7–12, lessons 22–43)` to `(Units 7–12, lessons 22–49)`.

- [ ] **Step 4: Add a PLAN.md content note flagging BO voice review**

In `PLAN.md`, under the Phase 3 build-status note (the paragraph beginning "Build status (2026-07-09): complete"), append a sentence:

```markdown
  Left-hand expansion (2026-07-14): six lessons added in place — Unit 8
  gains a five-finger warm-up and Lightly Row (left hand alone); Unit 9
  gains keep-the-beat, a walking bass, and Ode to Joy / Lightly Row
  hands-together. Content only, tests green. Open: BO voice review of the
  new student-facing strings, and the four new Unit 9 lessons ride the
  deferred poly gate (spike/POLY_GATE_RUNBOOK.md) like all hands-together
  content.
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/ope_d_coder/projects/VIBE CODING AGENTIC ENGINEER/Home_Piano_Teacher"
git add REQUIREMENTS.md PLAN.md
git commit -m "Docs: course map + PLAN note for the left-hand expansion"
```

---

## Notes for the implementer

- The four new Unit 9 lessons use `low: true` (the keyboard shows the C3 octave) and no `clef` field — they render on the treble staff with ledger lines below, exactly like the existing `au-clair-together`/`twinkle-together`. Do NOT set `clef: 'bass'` on them.
- The two new Unit 8 lessons DO set `clef: 'bass'` and `low: true`, matching `walking-down-the-bass`/`merrily-left-hand`.
- Do not set `sneakPeek` on `ode-together` — exactly one sneak-peek (`ode-to-joy`) is asserted by `test/content.test.js:146-149`.
- If `npm test` shows the mono corpus gate failing, that is pre-existing and expected (it only fails where the private recorded audio exists); it is unrelated to this work.
