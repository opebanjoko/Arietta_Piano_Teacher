# Practice Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional daily practice and between-lesson practice packs that increase repetition for already-built modules.

**Architecture:** Practice is pure data plus a pure planner. Practice packs resolve into the existing drill/song lesson shapes, and the app records separate practice recency so lesson completion and linear unlock behavior stay unchanged.

**Tech Stack:** Vite + Preact, plain JS ES modules, Node `node:test`, IndexedDB wrapper in `app/src/store/db.js`.

## Global Constraints

- Practice must be optional and must not block lesson unlocks.
- Practice must not introduce scores, streaks, XP, penalties, red-X language, or gamified pressure.
- Practice must only use completed skills and already-built step kinds.
- Every playable target must carry a finger number.
- Practice must work offline and local-first with no backend requirement.
- Lesson 21 remains `comingSoon` and must not appear in practice.

---

## Role Review

- PM: The expansion fits after Phase 3/4 because the engine, content schema, warm-up flow, and E2E harness already exist. It is a retention/depth layer, not a new course phase.
- Dev: Keep boundaries small: `content/practice.js` for pack data, `core/practice.js` for selection, store helpers for recency, app wiring for offers and completion.
- QA: Require red-green tests for content validity, planner behavior, store persistence, and E2E completion of every pack.
- Dev Spec: New public interfaces are `PRACTICE_PACKS`, `planPracticeSession`, `getPracticeProgress`, and `recordPracticeRun`.
- Business Owner: First pass covers Units 1-3 plus Unit 4 rhythm. Copy stays warm, concrete, and non-gamified.

## File Structure

- Create `app/src/content/practice.js`: practice pack data and tiny note helper.
- Create `app/src/core/practice.js`: pack validation helpers and daily session planner.
- Create `app/test/practice.test.js`: content, planner, and E2E practice coverage.
- Modify `app/src/store/db.js`: add v2 `practice` object store.
- Modify `app/src/store/progress.js`: add practice progress helpers and profile cleanup.
- Modify `app/test/progress.test.js`: practice persistence and cleanup tests.
- Modify `app/src/content/voice.js`: practice offer labels.
- Modify `app/src/app.jsx`: load practice progress, show offer, open packs, record practice completion.
- Modify `app/src/ui/Home.jsx`: render daily practice offer.
- Modify `app/src/ui/Lesson.jsx`: support practice completion action through existing `doneAction`.
- Modify `app/src/ui/Song.jsx`: support practice completion overlay action if a song-shaped pack is used.

## Task 1: Practice Content And Planner

**Files:**
- Create: `app/src/content/practice.js`
- Create: `app/src/core/practice.js`
- Create: `app/test/practice.test.js`

**Interfaces:**
- Produces: `PRACTICE_PACKS: Array<PracticePack>`
- Produces: `planPracticeSession({ lessons, packs, progress, practiceProgress, maxEntries = 3 }): null | { id, entries }`
- Produces: `practiceLesson(pack): lesson`

- [ ] Write failing tests for pack validity, Unit 1 gating, least-recent selection, variety, and pack completion through the engine.
- [ ] Run `npm test -- test/practice.test.js` and confirm missing-module failure.
- [ ] Implement `content/practice.js` with Units 1-3 plus Unit 4 rhythm packs.
- [ ] Implement `core/practice.js` planner and pack resolver.
- [ ] Run `npm test -- test/practice.test.js` and confirm pass.

## Task 2: Practice Progress Store

**Files:**
- Modify: `app/src/store/db.js`
- Modify: `app/src/store/progress.js`
- Modify: `app/test/progress.test.js`

**Interfaces:**
- Produces: `getPracticeProgress(db, profileId): Promise<Map<string, PracticeRecord>>`
- Produces: `recordPracticeRun(db, profileId, packId, now = Date.now()): Promise<PracticeRecord>`

- [ ] Write failing tests for practice recency, completed count, reset cleanup, and profile delete cleanup.
- [ ] Run `npm test -- test/progress.test.js` and confirm helper-not-found failure.
- [ ] Add v2 `practice` store and progress helpers.
- [ ] Update reset/delete cleanup to remove practice rows for the profile.
- [ ] Run `npm test -- test/progress.test.js` and confirm pass.

## Task 3: App Wiring And UI

**Files:**
- Modify: `app/src/content/voice.js`
- Modify: `app/src/app.jsx`
- Modify: `app/src/ui/Home.jsx`
- Modify: `app/src/ui/Lesson.jsx`
- Modify: `app/src/ui/Song.jsx`

**Interfaces:**
- Consumes: `PRACTICE_PACKS`, `planPracticeSession`, `practiceLesson`, `getPracticeProgress`, `recordPracticeRun`
- Produces: Home practice offer and practice completion recording without changing lesson completion.

- [ ] Add practice copy in `VOICE.practice`.
- [ ] Load practice progress with profile progress.
- [ ] Plan a daily practice offer once per browser session after Unit 1 completion.
- [ ] Open practice entries as ephemeral lessons.
- [ ] After each practice entry completes, record `recordPracticeRun`; offer the next entry or return home.
- [ ] Keep normal lesson completion and song best-count behavior unchanged for non-practice lessons.

## Task 4: Full Verification

**Files:**
- Test: `app/test/*.test.js`

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Inspect `git diff --check`.
- [ ] Commit all intended files only.
- [ ] Push the branch requested by the user.
