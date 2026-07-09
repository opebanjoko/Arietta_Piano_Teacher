# Arietta — Requirements

A gentle at-home piano teacher for beginners. An iPad sits on the music stand of a real
piano; the app listens through the microphone, hears which keys the student plays, and
walks them through a beginner course of units, songs, and drills. Progress is
local-first on the iPad, with a lightweight family account for backup and sync in
Phase 2 (§9.5).

This document is the source of truth for product and pedagogy decisions. The current
`Arietta Piano Teacher.dc.html` is a design prototype of these requirements with the
microphone simulated by a tap keyboard.

---

## 1. Vision and principles

Arietta behaves like a really good first piano teacher: patient, warm, specific, and
never in a hurry. Everything below follows from a few principles.

- **The piano is the instrument; the iPad is the teacher.** The student's hands stay on
  the real keys. The screen shows what to play and confirms what it heard. The app never
  becomes the thing being played.
- **Ten gentle minutes is a good session.** Lessons are sized so a child or tired adult
  finishes something meaningful in one short sitting and leaves wanting to come back.
- **Mistakes get hints, never buzzers.** A wrong note is information, not failure. The
  response is a warm, *directional* correction ("So close — E is one key to the right"),
  escalating only to showing the key, never to red X's, error sounds, lives, or streaks.
- **Patience is structural, not just tonal.** In wait-mode the app waits as long as it
  takes for the next correct note. Silence is always safe.
- **Quietly encouraging, never gamified-noisy.** Celebration is a floated music note and
  a kind sentence, not confetti cannons, XP, or leaderboards.
- **Private by design.** No ads, no analytics, no social features. Audio is analyzed
  on-device and never recorded or transmitted — the backend (§9.5) syncs progress only.
  The app never requires an account or connectivity to teach.

## 2. Users and profiles

- Target: a household iPad shared by a family — adults and children roughly age 6 and up.
- One shared course; the language is age-neutral, concrete, and unpatronizing (a good
  teacher speaks to a 6-year-old and a 40-year-old with the same warmth and respect).
- **Profiles**: up to ~5 local profiles, each with a name, an initial-avatar, and
  independent progress. Switching profiles is one tap from the home screen (as
  prototyped: "PLAYING AS" avatars in the header).
- Creating a profile asks only for a name. No email, no password, no birthday.
- **Family account (Phase 2)**: one optional household account backs up all profiles and
  syncs them across devices (§9.5). Children never sign in individually.

## 3. Pedagogy and course structure

### 3.1 Teaching approach

- **Sound before symbol, symbol soon after.** Students play notes by location first
  ("just to the right of D"), and each note appears on the treble staff with its letter
  label from the first time it's played. Labels fade in later units so staff reading
  develops naturally.
- **C-position first.** The course lives in C position (C4–G4, extending to C5) before
  any hand shifts. Middle C is physically marked on the on-screen keyboard mirror.
- **Fingers have numbers from day one.** Thumb is 1, pinky is 5 — taught in Unit 1 and
  used everywhere after: every drill step and song note displays its finger number
  beside the note on the staff. The mic cannot hear which finger played, so Arietta
  teaches fingering by always showing it and occasionally, warmly, asking ("thumb on C
  to start — finger 1"). Unfixed fingering is the fastest bad habit a beginner can
  build; the app must never present a note without its finger.
- **Tiny steps, immediately verified.** Every drill step is a single note or a 3–5 note
  sequence the mic can confirm. The student never wonders whether they did it right.
- **Songs are the payoff.** Every unit's drills feed a real piece of music the student
  can play for someone by the end of the unit.

### 3.2 Course map (v1: 6 units, 21 lessons)

Linear unlocking: completing a lesson unlocks the next; completing a unit unlocks the
next unit. Completed lessons are always replayable. Each unit also exposes one
**sneak-peek song** playable early (as prototyped with Ode to Joy) so curiosity is
rewarded, not gated.

**Unit 1 — Sitting at the Piano** *(mostly guided watch-and-do; light mic use)*
1. *Meet the keyboard* — black-key groups of 2 and 3; find any C. Mic verifies: play any C.
2. *Finding middle C* — orientation to middle C; sit tall, relaxed shoulders, curved
   fingers (short illustrated posture moments, no verification).
3. *Hands say hello* — right-hand thumb on middle C; play C with fingers 1, 2, 3.
   Mic verifies: repeated C4.

**Unit 2 — First Notes** *(the prototype's "Meet E" is the canonical lesson shape)*
4. *Middle C, again* — C4 with a steady, singing tone; play it soft and loud.
5. *Meet D* — D4; C–D steps up and back.
6. *Meet E* — E4; C–D–E up the little hill and back down (exactly as prototyped).
7. *Meet F and G* — F4, G4; five-finger walk C through G and back.

**Unit 3 — First Songs** *(wait-mode play-along; mic verifies each note in sequence)*
8. *Ode to Joy — first phrase* (E E F G G F E D C C D E E D D) — already prototyped.
9. *Lightly Row* — G E E, F D D pattern; introduces starting on a note other than C.
10. *Au clair de la lune* — C C C D E D, C E D D C; long notes held with patience.

**Unit 4 — Rhythm Joins In** *(introduces the metronome and gentle tempo feedback)*
11. *Long notes and short notes* — quarter, half, whole; clap-then-play with the
    metronome at a slow, kind tempo (~60 BPM).
12. *Playing with the pulse* — five-finger patterns in time; feedback is "with the
    pulse / a little early / a little late," never a score.
13. *Ode to Joy — in time* — the Unit 3 phrase again, now with the metronome.
14. *Hot Cross Buns, steady* — E D C rhythm piece played fully in time.

**Unit 5 — More Notes, New Places**
15. *Meet A and B* — A4, B4; the right hand stretches beyond five fingers.
16. *Up to high C* — C5; the full C-to-C octave walk.
17. *When the Saints Go Marching In* — first phrase; uses the new upper notes.
18. *Twinkle, Twinkle* — full song in C position with octave-aware playing.

**Unit 6 — Both Hands Say Hello** *(left hand alone is v1; hands-together is gated —
see §4 non-goals)*
19. *The left hand's home* — left hand in C position (C3–G3); mirror drills, left hand alone.
20. *Taking turns* — melody fragments passed between hands, one hand sounding at a time
    (still monophonic — v1 mic can verify this).
21. *Your first chord* — C major chord, left hand. **Phase 2**: requires chord detection
    (§9.1); lesson is designed and visible on the map, marked "coming soon," and unit
    completion for v1 is lessons 19–20.

### 3.3 Lesson anatomy

Every drill lesson follows the prototyped shape:

1. **Intro prompt** — one warm sentence of what and why ("This is E — it lives just to
   the right of D").
2. **Guided steps** (3–5 per lesson) — each step names a target note or short sequence;
   the staff shows the notes; the app listens and advances on success. Step progress is
   shown as dots.
3. **Encouragement between steps** — varied, specific, musical ("Steady as a clock ♪").
   Lines must not repeat within a lesson.
4. **Completion** — a quiet celebration and a bridge to application ("Try it in a song →").

Song lessons are play-along: all notes on the staff, current note highlighted, played
notes turn green, progress counter ("6 of 15 notes"), a "Hear it first" demo that plays
and highlights the whole phrase, and a gentle running cheer at milestones.

### 3.4 The warm-up — every session starts with hello

Real lessons never open with new material; they open with something the student can
already do. Skills that are only fed forward stay fragile.

- When a student returns (new session, from Unit 2 onward), Arietta offers a **1–2
  minute warm-up** drawn from *previously completed* material — one short drill or song
  phrase, chosen by simple spaced repetition (oldest-least-replayed first).
- Framed as a greeting, not a test: "Shall we say hello to the keys first? Play me the
  little hill — C, D, E." One tap to accept, one tap to skip. Skipping is never
  penalized or remembered out loud.
- Warm-ups reuse the existing drill/play-along machinery — they are references to
  learned steps, not new content.
- Success flows straight into the day's lesson ("Warm and ready. Now — something new.").
- **Sessions end with a recap.** When a lesson completes (or the student heads home),
  Arietta closes the way a teacher does: one warm summary of what was done today
  ("Today you met F and G — the hill got bigger") and one seed for next time ("Next
  time, a song is waiting for those notes"). Consolidation, not ceremony: one line
  each, then done.

### 3.5 More ways to learn — step types

Drills are not only "play this note." Three more step types are sprinkled *inside*
existing lessons (the 21-lesson map is unchanged):

- **Watch me** — a short, looping close-up of a real hand doing the new physical thing:
  the first middle C, the five-finger hand shape, landing a chord. The mic cannot hear
  technique and a diagram cannot show motion; modeled hands can. A few per unit, only
  where a new physical skill appears.
- **Ear moments** — the teacher trains ears from day one. Two forms: *listening choice*
  ("Close your eyes. I'll play two notes — was the second one higher or lower?" —
  answered by tap) and *echo by ear* ("Copy me: I'll play three notes, you play them
  back" — verified by the mic, no staff shown). Echoes use only learned notes.
- **Fresh reading** — reading fluency needs music you have *never seen*. From Unit 3
  onward, short reading snippets (3–5 notes assembled from learned material) appear in
  warm-ups and occasional steps: "Here's a little tune nobody has ever played before."
  Always sight-read cold, always short, always celebrated like a discovery.

## 4. Listening (the microphone) — v1

This is the product's heart. A teacher who mishears destroys trust faster than one who
says nothing, so the cardinal rule is:

> **When unsure, stay silent.** Never mark a note wrong on low-confidence audio. A missed
> detection costs a moment; a false accusation costs the student's trust.

Requirements:

- **Scope**: monophonic pitch detection — one note at a time — from a real acoustic
  piano or a digital piano through its speakers, via the iPad microphone.
- **Range**: C3–C6 minimum (course content lives in C3–C5).
- **Latency**: detected note reflected in the UI fast enough to feel immediate —
  target under ~300 ms from key strike.
- **Robustness**: tolerate normal home noise (talking nearby, TV in another room). Ignore
  non-piano sounds rather than guessing. Sustained/ringing notes must not double-count.
- **Octave policy**: in drills, correct pitch class in the wrong octave is treated as a
  gentle, specific hint case ("That's E — one octave lower, a little to the left"), not
  as a wrong note. In song play-along, the correct pitch class in **any** octave counts
  as correct so the music keeps flowing; recurring slips get a kind mention after the
  song (§10, D2).
- **First-run mic check**: a friendly "Can you hear me?" flow — request permission with a
  plain-language explanation, ask the student to play any note, confirm what was heard,
  and offer a sensitivity adjustment. Re-runnable from settings.
- **Heard-note indicator**: the persistent listening pill (as prototyped) always shows
  state — "Listening…", "Heard E", or "Playing it…" during demos — so the student always
  knows the teacher's ears are on.
- **Fallback**: the on-screen tap keyboard remains available as an input fallback if the
  mic is unavailable or denied (it is also the dev/test simulator).
- **v1 non-goals**: chord detection, two simultaneous hands, dynamics assessment — all
  specified as Phase 2 requirements in §9. Recording or storing audio: never.

## 5. Feedback and teaching behavior

The hint ladder (as prototyped in `hintFor`), applied per target note:

1. **First miss** — warm directional hint naming what was heard and where the target is:
   "Almost — I heard G. E is two keys to the left."
2. **Second miss and beyond** — the hint continues *and* the target key glows softly on
   the on-screen keyboard mirror (glowPulse), so the student can look down and find it.
3. **Never** — negative sounds, red flashes, streak loss, or "wrong!" language. Softener
   prefixes rotate ("Almost —", "So close —", "Nearly —").
4. **Black-key case** — if a black key was heard when a white key is the target, say so
   plainly ("that was one of the black keys — E is a white key").

Positive feedback: specific and musical, tied to what was just done ("Up the hill you
went ♪"), with variety enforced. Completions get the quiet celebration treatment
(floating notes, a kind sentence, two forward paths: replay or continue).

**Trouble spots — practice the tricky bit, not the whole song.** When the same passage
in a song draws repeated misses (e.g. 3+ misses within a 2–3 note window), Arietta does
what a teacher does: isolates it. She offers — never forces — a mini-loop: "That corner
is the tricky part for everyone. Let's do just these three notes, twice." The student
plays only that fragment (with fingering shown), and on success rejoins the song a note
or two *before* the trouble spot so the join is practiced too. Restarting a whole song
because of one hard bar must never be the only path.

**Play with me — accompaniment.** A one-finger melody becomes music when someone plays
along. Once a song has been completed once, its play-along gains a "Play it with me"
option: as the student plays each correct melody note, Arietta sounds a soft, warm
harmony beneath it (synthesized, following the student — wait-mode friendly, so it
works in v1 with no tempo tracking). From Unit 4 onward, in-time pieces gain a steady
backing that moves with the metronome. Accompaniment is always optional and always
quieter than the student.

## 6. Screens and flows

Grounded in the prototype's three screens, plus what a real product needs:

- **Home / course map** — greeting by time of day and profile name; hero card with the
  single next best action; unit cards with per-lesson status dots; songs row with
  sneak-peek and locked songs; profile switcher; mic-status indicator.
- **Lesson** — header (back, unit/lesson title, listening pill), step counter and dots,
  prompt + sub-prompt, staff with target notes and finger numbers (§3.1), feedback line,
  keyboard mirror.
- **Song play-along** — header as above; "Hear it first" demo button, "Play it with me"
  accompaniment toggle (§5), progress bar and note counter, full-phrase staff with
  finger numbers, next-note lead and cheer line, trouble-spot mini-loop (§5),
  completion overlay.
- **Free play** — always one tap from home, never locked: the student just plays, and
  Arietta listens without judging — naming what she hears ("that was G!"), lighting the
  keys on the mirror, and occasionally offering a spark ("play it again but one key
  higher?"). No goals, no completion state. This is where curiosity lives, where kids
  can safely bang around, and where trust in the mic is built for free.
- **Parent's glimpse** — reachable from settings: a per-profile summary in Arietta's own
  voice ("Ava has met C, D and E, and played Ode to Joy twice this week — she's finding
  D easily now"). Words, not charts; never comparative between profiles; visible only
  behind the settings screen so it never gamifies the child's own view.
- **First-run** — mic permission + "Can you hear me?" check, then profile creation.
- **Settings** (small, calm) — accent color (prototyped prop), key labels on/off
  (prototyped prop), mic sensitivity / re-run mic check, parent's glimpse, per-profile
  reset progress.

All screens: iPad landscape, one glance-parseable layout, no scrolling during play.

## 7. Progress and persistence

- Stored per profile: lessons completed, current lesson and step, songs completed and
  best note-count, settings overrides, and per-item last-played timestamps (feeds the
  warm-up's spaced repetition, §3.4, and the parent's glimpse, §6).
- **Local-first**: stored on the device, survives app/browser restarts, and the app is
  fully functional with local data alone — offline, forever, no account required.
- **Phase 2 sync**: when a family account exists (§9.5), per-profile progress syncs to
  the backend and across devices. Sync is additive; local always works.
- Deleting a profile deletes its data (locally and, when synced, on the backend).
  "Reset progress" per profile in settings.

## 8. Platform and technical constraints

- **Device**: iPad, landscape, propped on a piano's music stand. Touch targets sized for
  6-year-old fingers (≥ 44 pt).
- **Offline**: after first load, the app must work fully offline. *(The current
  prototype loads React and fonts from CDNs — this requirement is not yet met.)*
- **Audio out**: Web Audio API synthesis for demo playback and key taps (as prototyped);
  audio out must duck/pause while actively listening for the student, so the app never
  hears itself.
- **Audio in**: on-device analysis only (see §4). Handle mic permission denial gracefully
  with the tap-keyboard fallback.
- **Backend**: v1 ships as static files with nothing transmitted anywhere. Phase 2 adds
  a small sync API and database deployed on **Railway** (§9.5); the app must remain fully
  functional when the backend is unreachable.

## 9. Phase 2 requirements

Everything in this section is real, planned product — sequenced after v1 because each
item builds on v1 foundations (reliable monophonic listening, the course engine, local
progress). These are requirements to plan against, not aspirations.

### 9.1 Polyphonic listening — chords and hands together

- Staged capability, shipped in order:
  - **(a) Two simultaneous notes** — intervals; a melody note over one held bass note.
  - **(b) Three-note chords in one hand** — C, F, G major triads in root position.
  - **(c) Hands together** — melody plus slow accompaniment.
- The §4 cardinal rule holds: **when unsure, stay silent.** Polyphonic guesses are
  harder, so the confidence bar rises — it never drops.
- Detection reports the *set* of sounding pitches; lesson logic decides correctness
  (all expected tones present, no unexpected neighbors).
- Range: chords within C3–C5. Latency budget unchanged (< ~300 ms feel).
- Unlocks: Unit 6 lesson 21 (*Your first chord*) and Course 2 Units 9 and 11.

### 9.2 Tempo, deepened

Precise underneath, wordy on the surface — never numeric.

- Per-note onset timing is measured against the metronome grid, with tolerance windows
  tuned per tempo (generous at 60 BPM, narrower as tempo rises).
- Feedback is always in words and always specific: "a little early on the third note,"
  "the long notes didn't get their full breath." Never percentages, stars, grades,
  or streaks — at any level, ever.
- A **steadiness view** after a timed piece: the played notes drawn on a gentle
  timeline against the pulse, so the student can *see* rushing or dragging. Unlabeled
  by numbers.
- Practice tempos: every timed piece is playable at slow / medium / full tempo, chosen
  by the student, all equally celebrated.

### 9.3 MIDI input

- When a digital piano is connected over MIDI (USB or Bluetooth LE), Arietta prefers
  MIDI over the microphone automatically — perfect accuracy, immune to room noise, and
  it works with headphones. This is the definitive answer for silent practice (§10, D1).
- The input source is invisible to the lesson engine: a note event is a note event,
  whether it arrived by mic or MIDI. All pedagogy, hints, and screens are unchanged.
- MIDI velocity may feed Course 2's dynamics lessons (§9.4, Unit 12).
- Platform note: iPad Safari does not ship Web MIDI; this requirement may force a thin
  native shell (e.g. Capacitor). Decide at Phase 2 planning, not before.

### 9.4 Course 2 — Year One continues (Units 7–12, lessons 22–43)

Picks up after lesson 21. Same lesson anatomy (§3.3), same voice, linear unlocking
continues. Where a unit needs §9.1 or §9.3 capability, it says so.

**Unit 7 — Reading the Map** *(staff reading stands on its own)*
22. *Notes without training wheels* — letter labels fade on known notes; read C–G cold.
23. *Steps and skips* — reading by interval: neighbors move by step, gaps skip a line.
24. *Meet G position* — the hand moves: G4–D5; familiar shapes in a new place.
25. *Ode to Joy — the whole theme* — both phrases, read from a cleaner score.

**Unit 8 — The Left Hand Speaks** *(bass clef; hands alternate — v1 listening suffices)*
26. *The bass clef* — the left hand gets its own map; bass-clef C3 position.
27. *Walking down the bass* — C3–G3 melodies read from the bass clef.
28. *Merrily We Roll Along — left hand* — the full melody, left hand alone.
29. *Echo games* — the right hand plays a phrase, the left answers; one hand at a time.

**Unit 9 — Hands Together** *(requires §9.1 stages a–b)*
30. *Both thumbs share middle C* — one held left-hand note under a right-hand melody.
31. *Drone and melody* — the left sustains C while the right walks the five-finger hill.
32. *Au clair de la lune — together* — long left-hand notes under the melody.
33. *Twinkle — together* — the left hand changes notes beneath the tune.

**Unit 10 — Black Keys Join In**
34. *Meet F sharp* — G position earns its sharp; five-finger patterns in G.
35. *Meet B flat* — F position; the same tune starting somewhere new (first transposing).
36. *London Bridge in G* — a full song in the new position, sharp and all.

**Unit 11 — First Chords** *(requires §9.1 stage b)*
37. *Building the C chord* — C–E–G together; roll it gently, then land it as one.
38. *C and G7 take turns* — two-chord switching, slow and smooth.
39. *F joins the family* — three chords; the I–IV–V neighborhood.
40. *When the Saints — with chords* — melody in the right, block chords in the left.

**Unit 12 — Your First Recital**
41. *Louds and softs* — dynamics: play it like a mouse, play it like a lion. Assessed
    via MIDI velocity (§9.3) or coarse mic loudness; feedback in words, as always.
42. *Putting on polish* — the student picks three favorite pieces; each gets a
    "make it beautiful" pass — dynamics, steadiness, confidence.
43. *Recital day* — recital mode: Arietta introduces each piece, then goes quiet and
    simply listens — no hints, no interruptions. Afterward, the warmest celebration in
    the app, and the set is saved to the profile as "My first recital."

**Content format requirement**: by Course 2, lessons and songs must be pure data
(prompts, steps, target sequences, staff layout) consumed by a course engine — adding
a lesson means adding data, not code.

### 9.5 Family account and sync

Progress becomes portable without compromising the teaching experience.

- One **household account** (email magic-link or Sign in with Apple). Children never
  sign in individually; switching profiles stays one tap, as today (§2).
- Syncs progress and settings only — per-profile lesson/step/song state. Audio never
  leaves the device; that principle survives the backend.
- **Local-first, always**: the app teaches fully offline and without an account. Sync
  is additive. Conflicts resolve per lesson by most-progress-wins.
- Backend: a small API and database deployed on **Railway**. No third-party analytics.

## 10. Decisions (formerly open questions)

- **D1 — Digital pianos through headphones**: MIDI input (§9.3) is the real answer.
  Until it ships: speakers on, or the tap keyboard.
- **D2 — Octave strictness in songs**: in song play-along the correct pitch class in any
  octave counts, so the music keeps flowing; if slips recur (3+ in one song), Arietta
  mentions it kindly after the song. Drills stay octave-aware with gentle hints (§4).
- **D3 — Progress portability**: solved by the family account and sync (§9.5). No local
  file export needed; until sync ships, progress simply lives on the iPad.
- **D4 — Left-hand (C3-region) detection**: the first-run mic check gains a low-note
  calibration step before Unit 6, and confidence thresholds may be tuned separately for
  the C3 region. If a particular piano/room can't reach reliable detection down there,
  the lesson says so honestly and offers the tap keyboard for those steps.
