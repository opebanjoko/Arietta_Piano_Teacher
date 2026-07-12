# Yoruba tunes in the course — design

2026-07-12. Approved approach: **B — full repertoire integration** (data + setlists +
voice; no engine or UI changes beyond fonts).

## Why

The family is Nigerian first. Yoruba tunes join the course as first-class repertoire —
part of the curriculum the app teaches *with*, not a cultural appendix. They get
everything existing songs get: hear-it-first, wait-mode play-along, trouble spots,
warm-up rotation, "Play it with me", recital eligibility.

## The tunes

| Tune | Meaning / character | Unit | Treatment |
|---|---|---|---|
| L'ábẹ́ igi ọ́rọ́mbọ́ | "Under the orange tree" — gentle children's classic | 5 — More Notes, New Places | Wait-mode song; climbs the new octave (A, high C) |
| Bàtà mi a dún kòkòkà | "My shoes go ko-ko-ka" — school-days rhythm song | 4 — Rhythm Joins In | Timed piece, `tempo` ~72 BPM |
| Ìṣẹ́ Olúwa | "The work of the Lord (cannot be destroyed)" — flowing, patient | 5 — More Notes, New Places | Wait-mode song with harmony voicings |
| Tòlótòló | Turkey song — playful call-and-response | 6 — Both Hands Say Hello | Wait-mode song; phrases pass between positions |

Placement rule: each tune sits in the unit whose skill it exercises, appended after
the unit's existing lessons (no forced first position). If a drafted melody's range
disagrees with its slot (oral tunes vary), placement follows the melody.

## Content shape

Each tune is a `kind: 'song'` entry in `app/src/content/course.js` with the standard
fields: `id`, `title`, `card`, `notes` (finger numbers mandatory, SR-CRS-05), `harmony`
(sparse voicings so "Play it with me" unlocks after first completion), `done`, `recap`.
Bàtà mi adds `tempo`. Keys stay in beginner positions; each song uses only notes its
unit has taught by that point. No new fields, step kinds, or engine logic.

**Melody sourcing:** melodies are transcribed at implementation time from the
widely-sung versions, then **audition-gated**: the user plays "Hear it first" for each
tune and reports where the family's version differs; iterate until it sounds like home.
A tune is not done until its audition passes.

## Presentation

- Titles in full Yoruba orthography (e.g. "Bàtà mi a dún kòkòkà", "Ìṣẹ́ Olúwa").
- Card text carries the meaning and warmth ("the school-shoes song — ko ko ka!");
  `done` and `recap` lines in Arietta's usual voice. No othering — these are simply
  songs, like Ode to Joy.
- **Fonts:** the vendored Nunito Sans / Source Serif 4 files are latin-only subsets;
  ẹ ọ ṣ (and their tone-marked forms) would render in fallback glyphs. Vendor the
  latin-ext subsets of both families and verify with fontTools that every codepoint in
  the actual title/card strings is covered, plus a visual check in-app. Titles must
  render in Arietta's own typefaces.

## Recital and docs

- Add all four ids to the `from:` pools of both setlists (`putting-on-polish`,
  `recital-day`).
- Update REQUIREMENTS.md §3.2 course map with the four songs (source of truth).
- SYSTEM_REQUIREMENTS.md and PLAN.md need no changes (content-only feature); confirm
  during implementation that no SR references fixed lesson counts.

## Effect on existing progress

Adding a song to a completed unit flips it to "Continue — n of n+1 done" with the new
song immediately playable (existing `lessonStates` logic). This is the intended
experience: new music waiting in familiar places. No migration needed.
Edge: a song appended at the exact frontier of the student's furthest completion (e.g.
Tòlótòló for a player who finished exactly units 1–6) starts locked and becomes next as
the earlier insertions are played — the path self-heals in order.

## Testing

- Existing content-shape tests and the full-course tap E2E harness cover new lessons
  automatically (they walk every lesson).
- Add a content test asserting each new song's notes fall within the note set taught
  by its unit's position (range guard).
- Add a font-coverage test: every non-ASCII codepoint appearing in course titles/cards
  exists in the vendored font subsets (fontTools cmap check, runnable in CI or as a
  one-off script committed with the change).

## Out of scope (deliberately)

- Lyric display under the staff and Yoruba phrases in Arietta's running cheers
  (approach C) — possible follow-up.
- New step types (echo-by-ear drills built from Tòlótòló phrases) — the tune ships as
  a song; drill treatment can come later via practice packs.
- Course 2 / data-format externalization (REQUIREMENTS §3.6) — unchanged.

## Acceptance

1. Four songs playable in their units, correct fingerings, diacritics rendering in the
   app's fonts everywhere titles appear (home cards, play header, setlist, recital
   keepsake, recaps).
2. Bàtà mi plays as a timed piece with the pulse and steadiness timeline.
3. All four appear as recital/polish candidates.
4. Family audition sign-off per tune ("that's how we sing it").
5. Full test suite green; REQUIREMENTS.md updated.
