# Practice Expansion Design

Date: 2026-07-09

## Context

Arietta already has the important practice building blocks:

- Returning-session warm-ups through `pickWarmup`.
- Drill steps: `info`, `play`, `ear-choice`, `ear-echo`, `watch-me`, `rhythm-clap`, and `reading-snippet`.
- Song play-along, timed feedback, and trouble-spot mini-loops.
- Local progress records with completion and `lastPlayedAt`.

The problem is not a missing engine. The current course can teach a lesson, but students need more short repetition between new material so learned notes and rhythms become reliable.

## Goal

Add more training and exercise opportunities around already-built modules without lengthening first-time lessons too much.

The practice layer should:

- Offer a short daily practice session after Unit 1 is complete.
- Add optional between-lesson practice packs tied to completed lessons.
- Reuse the existing drill/song engine where possible.
- Keep sessions gentle, optional, and short.
- Avoid scores, streaks, XP, penalties, or gamified pressure.

## Non-Goals

- No new backend or account dependency.
- No new scoring model.
- No replacement of the home screen course map.
- No new step kind unless existing step kinds cannot express a required exercise.
- No change to the linear lesson-unlock rules.
- No requirement that practice be completed before the next lesson unlocks.

## Recommended Approach

Use a small practice planner plus pure-data practice packs.

The planner selects a 2-5 minute session from completed material. A session is a sequence of existing playable items, not a new engine mode. Most practice entries resolve into ephemeral drill lessons that can be opened by the existing lesson screen.

Daily practice and between-lesson practice packs share the same pack data. The difference is entry point:

- Daily practice is offered when a returning student opens the app.
- Between-lesson practice is available after completing a lesson or from that lesson's replay surface.

## Product Behavior

### Daily Practice

Daily practice appears after Unit 1 is complete and at least one practice-eligible item exists.

Session shape:

1. Warm hello: one familiar item from older completed material.
2. Focused review: one short pack for a recently learned note, rhythm, or song corner.
3. Musical payoff: one tiny song phrase, echo, or fresh reading snippet when available.

The student can start or skip. Skipping is never treated as failure and should not block the next lesson.

Daily practice should not introduce new notes or concepts. It only uses skills from completed lessons.

### Between-Lesson Practice Packs

Each eligible lesson can expose 1-2 short packs. Packs should be small enough to finish in about one minute.

Examples:

- After `meet-d`: C-D steps up and back; higher/lower ear-choice.
- After `meet-e`: C-D-E hill repetitions; echo-by-ear.
- After `meet-f-and-g`: five-finger walk and a short fresh reading prompt.
- After Unit 3 songs: the most useful phrase as a mini song loop.
- After Unit 4 rhythm lessons: clap patterns and timed C-D-E or C-D-E-F-G patterns.
- After Unit 5: upper-note walks and short reading snippets using C4-C5.
- After Unit 6: left-hand C3-G3 mirror drills and taking-turns fragments.

Practice packs are optional. Completing one updates practice recency, but does not alter lesson completion.

## Data Model

Add practice-pack data in a new `app/src/content/practice.js` module. Keep `course.js` focused on the core lesson map and export packs separately so practice breadth can grow without making the course file harder to review.

Suggested shape:

```js
{
  id: 'practice-meet-e-little-hill',
  title: 'The little hill',
  afterLessonId: 'meet-e',
  unitId: 'u2',
  tags: ['notes', 'review'],
  estimatedMinutes: 1,
  unlocksAfter: ['meet-e'],
  lesson: {
    id: 'practice-meet-e-little-hill',
    title: 'The little hill',
    kind: 'drill',
    ephemeral: true,
    steps: [
      {
        kind: 'play',
        prompt: 'Walk up the little hill again: C, D, E.',
        sub: 'Fingers 1, 2, 3.',
        targets: [
          { note: 'C4', finger: 1 },
          { note: 'D4', finger: 2 },
          { note: 'E4', finger: 3 }
        ]
      }
    ],
    done: {
      title: 'That hill is getting familiar.',
      line: 'C, D, and E are starting to feel like neighbors.'
    }
  }
}
```

The embedded `lesson` object follows the existing lesson schema so the current engine and UI can run it with minimal changes.

## Planner Rules

Create a pure planner function in a new `app/src/core/practice.js` module. Keep selection logic separate from the existing lesson state machine in `engine.js`.

Inputs:

- Flat course lessons.
- Practice packs.
- Progress map.
- Optional seed/current time for deterministic testing.

Outputs:

- `null` when practice should not be offered.
- A session object with an ordered list of 1-3 practice entries.

Selection rules:

- Require Unit 1 completion before offering daily practice.
- Only include packs whose `unlocksAfter` lessons are complete.
- Prefer least-recently-practiced packs.
- Include no more than one rhythm/timed item per short session.
- Prefer variety: one note drill, one ear/reading/rhythm item, one song phrase when available.
- Never select coming-soon lesson content.
- Keep generated sessions deterministic under test by accepting a seed.

## Progress Tracking

Current progress has lesson completion and recency. Practice needs lightweight recency so the planner can rotate packs.

Add a practice progress record keyed by practice pack id:

```js
{
  lastPracticedAt: number,
  completedCount: number
}
```

This can live beside lesson progress in IndexedDB using the existing schema migration pattern. Practice progress should remain local-first and syncable later, but practice must work offline with no account.

## UI Flow

Reuse current screens as much as possible:

- Home can show a daily practice offer near the existing warm-up offer.
- Lesson completion can show a quiet optional practice action when packs exist for that lesson.
- Opening a pack uses the existing `Lesson` screen because packs resolve to drill-like ephemeral lessons.
- Returning home after practice shows a normal recap-style line, not a score.

The first implementation can avoid a full standalone practice dashboard. A dashboard can be a later iteration if families need manual browsing.

## Error Handling

- If no eligible packs exist, do not show the daily practice offer.
- If a pack references a missing lesson id or invalid note, content tests should fail.
- If practice progress is missing or from an older schema, treat every eligible pack as unpracticed.
- If a selected pack cannot resolve into a playable lesson, fall back to the existing warm-up selector rather than blocking the student.

## Testing

Add focused tests before implementation:

- Practice pack ids are unique.
- Every practice pack resolves to a valid drill or song-shaped lesson.
- All targets carry finger numbers.
- Packs unlock only after completed source lessons.
- Planner returns `null` before Unit 1 completion.
- Planner prefers least-recently-practiced eligible packs.
- Planner keeps sessions short and varied.
- Course E2E can complete every generated practice pack.
- Store tests cover practice progress persistence and migration.

Run `npm test` from `app/` after implementation. Run `npm run build` if UI or imports change.

## First Content Pass

The first implementation should author practice packs for Units 1-3 plus Unit 4 rhythm. These are the highest-retention foundations: keyboard geography, C-position notes, first songs, and pulse.

Song phrase practice should initially be represented as shortened song objects when the goal is play-along continuity, and as drill steps when the goal is a tiny note pattern. This preserves the existing distinction between songs and drills.

## Implementation Slices

1. Content schema and tests for practice packs.
2. Pure planner and tests.
3. Store support for practice recency.
4. Home daily-practice offer using planner output.
5. Lesson-completion optional practice action.
6. E2E coverage for all packs and generated sessions.
