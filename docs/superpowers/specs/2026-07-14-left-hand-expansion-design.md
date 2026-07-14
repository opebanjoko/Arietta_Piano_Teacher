# Left-hand expansion — Units 8 & 9 (design)

Date: 2026-07-14

## Goal

Develop the left hand further with six new lessons, added in place to the two
units that already own it: Unit 8 ("The Left Hand Speaks", mono) and Unit 9
("Hands Together", poly). A "balanced mix" weighted toward hands-together
coordination (user choice: Approach 2 — 2 new in Unit 8, 4 new in Unit 9).

This is new content beyond the current v1 spec (REQUIREMENTS §9.4, which the
existing 43-lesson course matches exactly). Content only — no engine, detector,
schema, or step-kind changes.

## Placement & unlocking

Insert in place. The engine's high-water-mark unlock (course.js `lessonStates`)
keeps mid-course insertions playable for students who already completed Units
8–9 — they are never re-locked. Lesson order is derived from array position, so
the numbers in REQUIREMENTS §9.4 are cosmetic; only the docs get renumbered.

## The six lessons

All use the existing `n(note, finger, beats?)` and `c(notes, fingers, beats?)`
helpers and existing step kinds (`info`, `watch-me`, `play`, `reading-snippet`,
`ear-echo`). Fingering in bass C3 position: C3=5, D3=4, E3=3, F3=2, G3=1.

### Unit 8 (+2, mono — no poly-gate dependency)

**8N1 — "The left hand warms up"** (drill, `clef:'bass'`, `low:true`), inserted
after `the-bass-clef` (warm the fingers on the notes just met, before walking
melodies).
- info: the left hand gets its own warm-up before it plays under the right.
- watch-me: `{ keys:['C3','D3','E3','F3','G3'], fingers:[5,4,3,2,1], hand:'left' }`
- play (up): `[n('C3',5), n('D3',4), n('E3',3), n('F3',2), n('G3',1)]`
- play (down): `[n('G3',1), n('F3',2), n('E3',3), n('D3',4), n('C3',5)]`
- play (skips): `[n('C3',5), n('E3',3), n('D3',4), n('F3',2), n('E3',3), n('G3',1)]`
- Purpose: left-hand finger independence/strength before hands-together.

**8N2 — "Lightly Row — left hand"** (song, `clef:'bass'`), inserted after
`merrily-left-hand`.
- notes (Lightly Row transposed down an octave into C3 position):
  `[n('G3',1), n('E3',3), n('E3',3), n('F3',2), n('D3',4), n('D3',4), n('C3',5),
    n('D3',4), n('E3',3), n('F3',2), n('G3',1), n('G3',1), n('G3',1)]`
- card: the boat song, rowed by the left hand alone — deep and warm.
- Purpose: a second left-hand-alone song for reading/melody fluency; accurate
  public-domain notation.

### Unit 9 (+4, poly — hands together), woven into the existing ramp

**9N1 — "Two hands keep the beat"** (drill, `poly:true`, `low:true`), after
`both-thumbs`.
- info: both hands strike at the same instant, like two feet landing together.
- play: `[c(['C3','E4'],[5,3])]` (repeat feel) — deep C under E, one sound.
- play: `[c(['C3','E4'],[5,3]), c(['G3','D4'],[1,2])]` — two together-hits.
- play: `[c(['C3','E4'],[5,3]), c(['G3','D4'],[1,2]), c(['C3','E4'],[5,3])]`
- Purpose: gentlest simultaneity (struck together, no independent movement).

**9N2 — "A walking bass"** (drill, `poly:true`, `low:true`), after
`drone-and-melody`.
- info: the left hand steps between two notes while the right hand sings above.
- play: `[c(['C3','E4'],[5,3]), c(['G3','E4'],[1,3])]` — left steps C→G, right holds E.
- play: `[c(['C3','E4'],[5,3]), c(['G3','E4'],[1,3]), c(['C3','E4'],[5,3]), c(['G3','E4'],[1,3])]`
- Purpose: first independent left-hand movement under the right — the real
  coordination hurdle, isolated.

**9N3 — "Ode to Joy — together"** (song, `poly:true`, `low:true`), after
`au-clair-together`.
- notes (right-hand Ode melody; left hand anchors each phrase, held):
  `[c(['C3','E4'],[5,3]), n('E4',3), n('F4',4), n('G4',5), n('G4',5), n('F4',4), n('E4',3),
    c(['G3','D4'],[1,2]), n('C4',1), n('C4',1), n('D4',2), n('E4',3), n('E4',3), n('D4',2), n('D4',2)]`
- card: the tune that started it all — now both hands, a deep note under the melody.
- Purpose: signature-tune payoff; left hand struck once per phrase and held
  (proven "drone" shape).

**9N4 — "Lightly Row — together"** (song, `poly:true`, `low:true`), after
`twinkle-together`.
- notes (right-hand Lightly Row; left hand anchors two phrases):
  `[c(['C3','G4'],[5,5]), n('E4',3), n('E4',3), n('F4',4), n('D4',2), n('D4',2),
    c(['F3','C4'],[2,1]), n('D4',2), n('E4',3), n('F4',4), n('G4',5), n('G4',5), n('G4',5)]`
- card: the boat song, both hands aboard now.
- Purpose: consolidates coordination; closes the loop with 8N2's left-hand-alone
  version.

### Final unit order after insertion

- Unit 8: the-bass-clef → **8N1 warm-up** → walking-down-the-bass →
  merrily-left-hand → **8N2 Lightly Row LH** → echo-games.
- Unit 9: both-thumbs → **9N1 keep the beat** → drone-and-melody →
  **9N2 walking bass** → au-clair-together → **9N3 Ode together** →
  twinkle-together → **9N4 Lightly Row together**.

### Recap continuity (narrative chain)

Each lesson's `recap.seed` teases the next lesson by name ("Next time you'll walk
down it…"). Inserting lessons breaks that chain, so at every insertion point the
**preceding lesson's `recap.seed` must be rewritten** to point at the new lesson,
and each new lesson needs its own `seed` pointing at what now follows it. Seeds to
update: `the-bass-clef`, `merrily-left-hand`, `both-thumbs`, `drone-and-melody`,
`au-clair-together`, `twinkle-together` (this last currently bridges into Unit 10
— repoint it to 9N4, and give 9N4 the Unit-10 bridge). Plus a `seed` for each of
the six new lessons.

## Poly / detection constraints (accepted risk)

The four Unit 9 lessons run through `PolyTracker`, which is not hardware-validated
(deferred poly gate, `spike/POLY_GATE_RUNBOOK.md`) and is under active debugging.
Every simultaneous pairing above obeys the gate's recorded constraints:
- Two notes at a time; within C3–C5; smallest simultaneous interval a major third.
- **No simultaneous unison or octave between the hands.** Verified per chord:
  - 9N1: C3+E4 (maj10), G3+D4 (P5). OK.
  - 9N2: C3+E4 (maj10), G3+E4 (maj6). OK.
  - 9N3: C3+E4 (maj10) then held under E4/F4/G4 (no octave); G3+D4 (P5) held under
    C4/D4/E4 (C4 over G3 = P4, not an octave). OK.
  - 9N4: C3+G4 (octave+P5, not a unison/octave) held under E4/F4/D4; F3+C4 (P5)
    held under D4/E4/F4/G4 (G4 over F3 = octave+maj2, not an octave). OK.
- Left-hand support is struck once per phrase and held — the same shape already
  shipping in `au-clair-together` — not moving under every melody note, for
  robustness against detection flutter.

If the poly gate lands No-Go, these four ride the same gating as all existing
Unit 9 content; no exposure beyond that.

## Letter-weaning

The two mono lessons stay in bass C3–G3, first introduced by `the-bass-clef`, so
they add no new `(clef, pitch)` pairs; the poly lessons reuse known notes. Net:
no new novelty, so `wean.js` behavior and the wean tests are unaffected. Verify
by running the wean suite.

## Tests impacted (all data-level, no logic changes)

- Pinned course-shape test: 47 → 53 lessons; Unit 8 → 6, Unit 9 → 8.
- `content.test.js` structural checks (required fields, fingering present,
  reading-pool sizes) must pass for the six new entries.
- Full-course tap E2E now drives 53 lessons — data-driven, should extend
  automatically; run to confirm.
- **New assertion**: every hands-together chord in the new lessons obeys the
  no-octave/unison-between-hands rule (encode the poly-safety check as a test,
  not just a hand-check).
- Wean suite stays green (see above); run to confirm.

## Docs & voice

- Update `REQUIREMENTS.md` §9.4 Unit 8/9 lesson lists and numbering, and the
  course map.
- All new student-facing copy (prompts, done/recap, cards) written in Arietta's
  gentle voice, but **requires BO voice review before release** — same content
  gate as all lessons (PLAN.md). Flag in PLAN.

## Out of scope (YAGNI)

- No bass-clef range expansion to new notes (A3/B3/C4) this round.
- No new step kinds, no engine or detector changes.
