# Arietta — System Requirements

Systems-level specification derived from `REQUIREMENTS.md` (the product/pedagogy source
of truth). Each requirement has an ID, a phase, and a traceability reference (§n) to
REQUIREMENTS.md. Phases: **P1** = v1, **P2** = Phase 2.

Requirement keywords: **must** = mandatory for its phase; **should** = strong default,
deviation needs a recorded reason.

---

## 1. System context

```
                    ┌────────────────────────────────────────────┐
                    │                iPad (client)               │
 piano sound ──────▶│ Audio Input ─▶ Pitch Detector ─┐           │
 screen taps ──────▶│ Tap Keyboard ──────────────────┼▶ NoteEvent│
 (P2) MIDI ────────▶│ MIDI Adapter ──────────────────┘     │     │
                    │                                      ▼     │
                    │  Course Engine ◀── Course Content (data)   │
                    │   │        │                               │
                    │   ▼        ▼                               │
                    │ Feedback  Progress Store (local-first)     │
                    │ Engine     │            ▲                  │
                    │   │        ▼            │ (P2) sync        │
                    │   ▼      UI Shell   Sync Client ───────────┼──▶ Railway API + DB
                    │ Audio Output (synth/accompaniment)         │
                    └────────────────────────────────────────────┘
```

The client is a self-contained web application. In P1 there is no server component at
all beyond static file hosting. All subsystems below are client-side unless marked P2.

## 2. Note event model — the system's spine

Every input source normalizes to one event shape; downstream subsystems (course engine,
feedback, UI) are source-agnostic (§9.3).

- **SR-EVT-01 (P1)** — All note input must be delivered as a `NoteEvent`:
  `{ pitch: <MIDI number 48–96>, source: 'mic' | 'tap' | 'midi', confidence: 0..1,
  timestamp: <ms, monotonic>, velocity?: 0..1 }`.
- **SR-EVT-02 (P1)** — The course engine must not branch on `source`; pedagogy is
  identical regardless of input path (§9.3).
- **SR-EVT-03 (P2)** — Polyphonic input extends the model with `NoteSetEvent`
  (simultaneous pitches within a detection frame); monophonic consumers are unaffected
  (§9.1).

## 3. Audio input & pitch detection (§4)

### Capture
- **SR-AUD-01 (P1)** — Capture mono audio via `getUserMedia` at 44.1 or 48 kHz with
  echo cancellation and auto-gain **disabled** (they distort pitch content); noise
  suppression configurable during calibration.
- **SR-AUD-02 (P1)** — Analysis runs off the UI thread (AudioWorklet + Worker or
  equivalent); the UI must never jank while listening.

### Detection
- **SR-AUD-03 (P1)** — Detect monophonic piano fundamentals across **C3–C6**
  (130.81–1046.5 Hz, MIDI 48–84), from acoustic pianos and digital pianos over
  speakers.
- **SR-AUD-04 (P1)** — End-to-end latency, key-strike → UI reflection, must be
  **≤ 300 ms**; detector budget ≤ 150 ms of that (§4).
- **SR-AUD-05 (P1)** — **Silence over guessing**: events below the confidence
  threshold are dropped, never emitted as low-confidence guesses. The threshold is the
  cardinal-rule enforcement point (§4) and is tunable per device via calibration.
- **SR-AUD-06 (P1)** — A sustained/ringing note must emit exactly one `NoteEvent`
  (onset detection + refractory window); repeated strikes of the same key must emit one
  event each.
- **SR-AUD-07 (P1)** — Accuracy targets in a quiet room (≤ ~40 dB ambient), iPad on the
  music stand: ≥ 95% of played notes detected with correct pitch; **false note events
  from non-piano sound (speech, TV) ≤ 1 per 10 minutes**. The false-positive bound is
  the harder, more important target.
- **SR-AUD-08 (P1)** — Detection state exposed to UI as: `listening | heard(pitch) |
  suspended(playback)` — drives the listening pill (§4, §6).
- **SR-AUD-09 (P2)** — C3-region (left hand) confidence thresholds tunable
  independently; low-note calibration step added to mic check before Unit 6 (§10 D4).
- **SR-AUD-10 (P2)** — Polyphonic detection in three stages (dyads → triads → hands
  together), chords within C3–C5, same latency budget, **higher** confidence bar than
  monophonic (§9.1).

### Calibration & fallback
- **SR-AUD-11 (P1)** — First-run "Can you hear me?" flow: permission request with
  plain-language rationale → play-any-note check → confirm heard pitch → optional
  sensitivity adjustment. Re-runnable from settings (§4, §6).
- **SR-AUD-12 (P1)** — On mic permission denial or hardware absence, the system must
  degrade to tap-keyboard input with full functionality (§4, §8).
- **SR-AUD-13 (P1)** — Raw audio must never be persisted or transmitted; buffers exist
  only in memory for the analysis window (§1, §4).
- **SR-AUD-14 (P1)** — Percussive onset detection (claps/taps, no pitch) for Unit 4's
  clap-then-play rhythm steps: onset timestamps with the same silence-over-guessing
  rule and the SR-AUD-04 latency budget (§3.2 Unit 4).

## 4. Audio output (§5, §8)

- **SR-OUT-01 (P1)** — Note/demo synthesis via Web Audio (the prototype's
  triangle+sine+lowpass voice is the reference sound).
- **SR-OUT-02 (P1)** — **Self-hearing prevention**: while app audio is sounding
  (demos, accompaniment, tap feedback), mic detection is suspended or gated so the app
  never grades its own output (§8). Detection state shows `suspended(playback)`.
- **SR-OUT-03 (P1)** — "Play with me" follow-mode accompaniment: on each correct melody
  `NoteEvent`, sound a pre-authored harmony voicing beneath it, at lower gain than a
  typical student note (§5). No tempo tracking required.
- **SR-OUT-04 (P1)** — Metronome: audible, gentle click at authored tempos (Unit 4
  onward), synchronized with the timing grid (SR-CRS-08).
- **SR-OUT-05 (P2)** — In-time backing tracks synchronized to the timing grid (§9.2);
  accompaniment remains optional and quieter than the student.

## 5. Course engine & content format (§3, §9.4)

- **SR-CRS-01 (P1)** — Lessons, drills, songs, and warm-ups are **pure data** consumed
  by one engine — adding content means adding data, not code (§9.4). Content schema
  covers: unit/lesson metadata, step prompts and sub-prompts, target sequences (pitch +
  finger number), staff layout hints, encouragement pools, song note lists,
  accompaniment voicings.
- **SR-CRS-02 (P1)** — Engine is a state machine per activity:
  `intro → step[n] (awaiting target ▸ advance | hint) → stepdone → complete` for
  drills; `awaiting note[i] ▸ advance | hint` for songs (matches the prototype's
  `evalLesson` / `evalSong` shape).
- **SR-CRS-03 (P1)** — Matching rules, data-driven per activity type: drills match
  exact pitch with octave-slip → hint; songs match **pitch class** (any octave counts),
  logging slips for the post-song mention (§4, §10 D2).
- **SR-CRS-04 (P1)** — Linear unlocking (lesson n complete → n+1 visible), completed
  content always replayable, sneak-peek songs whitelisted per unit (§3.2).
- **SR-CRS-05 (P1)** — Every displayed target note carries its finger number; the
  schema must make fingering mandatory, not optional (§3.1).
- **SR-CRS-06 (P1)** — Warm-up selector: on a new session (Unit 2+), pick one completed
  item by oldest `lastPlayedAt`; offered, skippable, skip not recorded against the
  student (§3.4).
- **SR-CRS-07 (P1)** — Trouble-spot detection in songs: ≥ 3 misses within a sliding
  2–3 note window triggers the mini-loop offer; the loop fragment starts 1–2 notes
  before the spot on rejoin (§5).
- **SR-CRS-08 (P1)** — Timing grid (basic, for Unit 4): per-note onset timestamps
  compared to metronome grid with tempo-scaled tolerance windows (generous at 60 BPM,
  narrowing with tempo); output is qualitative descriptors only — the engine must not
  expose numeric scores to the UI layer (§3.2 Unit 4, §9.2).
- **SR-CRS-09 (P2)** — Tempo deepened: steadiness view (number-free timeline
  visualization) and student-chosen practice tempos (slow / medium / full) (§9.2).
- **SR-CRS-10 (P1)** — Step-type taxonomy in the content schema (§3.5): `play-target`
  (existing), `watch-me` (looping hand-demo media), `ear-choice` (app plays, student
  answers by tap), `ear-echo` (app plays a learned-notes sequence, mic verifies the
  copy — no staff shown), `reading-snippet` (short generated phrase), `rhythm-clap`
  (SR-AUD-14). Ear and rhythm steps sequence playback-then-listen via the SR-OUT-02
  gate.
- **SR-CRS-11 (P1)** — Reading-snippet generator: 3–5 note phrases constrained to the
  profile's learned notes and steps/skips taught so far, seeded to avoid repeats;
  used in warm-ups and steps from Unit 3 (§3.5).
- **SR-CRS-12 (P1)** — Session recap: on lesson completion or navigation home after
  meaningful activity, emit a recap (today's summary + next-time seed) rendered from
  templated content strings (§3.4). At most one per session.

## 6. Feedback engine (§5)

- **SR-FBK-01 (P1)** — Hint ladder per target: miss 1 → directional text hint (heard
  vs. target, distance and direction, black-key case); miss ≥ 2 → hint + target key
  glow on the keyboard mirror. No negative sounds, no red-flash affordances anywhere in
  the system.
- **SR-FBK-02 (P1)** — Encouragement and softener lines drawn from pools with
  no-repeat-within-lesson enforcement (§3.3, §5).
- **SR-FBK-03 (P1)** — All student-facing strings live in content data (SR-CRS-01), not
  in engine code — the teacher's voice is editable without code changes.

## 7. Progress store & sync (§7, §9.5)

- **SR-STO-01 (P1)** — Local-first persistence (IndexedDB or equivalent durable
  storage) keyed by profile: completed lessons, current lesson/step, song best
  note-counts, per-item `lastPlayedAt`, settings overrides.
- **SR-STO-02 (P1)** — Schema is versioned with forward migrations; progress survives
  app/browser restarts and app updates.
- **SR-STO-03 (P1)** — Up to ~5 local profiles; create with name only; delete removes
  all profile data; per-profile reset (§2, §7).
- **SR-STO-04 (P2)** — Sync client: pushes/pulls per-profile progress documents to the
  backend when a household account exists; fully additive — every feature works with
  sync off or backend unreachable (§7, §9.5).
- **SR-STO-05 (P2)** — Conflict resolution: per lesson, most-progress-wins (completed >
  in-progress > untouched; higher step/note-count wins within a state) (§9.5).

## 8. Backend (P2 only) (§9.5)

- **SR-BCK-01 (P2)** — Small HTTP API + database deployed on **Railway**. Stores:
  household accounts, profiles, progress documents, settings. Nothing else — no audio,
  no event streams, no analytics.
- **SR-BCK-02 (P2)** — Auth: email magic-link or Sign in with Apple, one account per
  household; child profiles have no credentials (§9.5). Sessions via short-lived tokens.
- **SR-BCK-03 (P2)** — Account deletion removes all server-side data. No third-party
  analytics or tracking anywhere in the stack (§1).

## 9. MIDI adapter (P2) (§9.3)

- **SR-MID-01 (P2)** — When a MIDI device (USB or BLE) is present, its input is
  normalized to `NoteEvent` (`source:'midi'`, velocity mapped 0..1) and **preferred
  over mic** automatically, with mic detection idle.
- **SR-MID-02 (P2)** — Platform constraint: iPad Safari has no Web MIDI. Decision
  recorded here for Phase 2 planning: MIDI support implies a thin native shell (e.g.
  Capacitor) or equivalent; the web app must be structured so wrapping it is additive.

## 10. UI shell (§6)

- **SR-UI-01 (P1)** — Screens: Home/course map, Lesson, Song play-along, Free play,
  First-run (mic check + profile), Settings (incl. Parent's glimpse). Landscape iPad,
  no scrolling during play, touch targets ≥ 44 pt (§6, §8).
- **SR-UI-02 (P1)** — Free play: consumes `NoteEvent`s with no matching logic — names
  heard notes, lights the keyboard mirror, no completion state, never locked (§6).
- **SR-UI-03 (P1)** — Parent's glimpse renders from progress-store data as
  templated natural-language text; no charts, no cross-profile comparison (§6).
- **SR-UI-04 (P1)** — The tap keyboard is a permanent component: input fallback and
  dev/test simulator (§4); in production builds it emits `source:'tap'` events through
  the same pipeline.
- **SR-UI-05 (P1)** — Watch-me playback component: short looping hand-demo videos or
  animations embedded in steps (§3.5). Assets ship with content data and are precached
  offline (SR-PLT-01); size-budgeted so the full course stays installable.

## 11. Platform & non-functional

- **SR-PLT-01 (P1)** — Distribution: static files; **fully offline after first load**
  (installable PWA with all assets — JS, fonts, content data — self-hosted and
  precached). *Gap note: the current prototype loads React and fonts from CDNs and does
  not meet this (§8).*
- **SR-PLT-02 (P1)** — Target platform: iPad Safari (current major iPadOS), landscape.
  Must tolerate backgrounding/interruption (mic re-acquired, state intact).
- **SR-PLT-03 (P1)** — Steady-state performance: 60 fps UI while listening; audio
  analysis CPU low enough for fanless sustained sessions (~10 min) without thermal
  throttling on a several-year-old iPad.
- **SR-PLT-04 (P1)** — Privacy posture (whole system): no ads, no analytics, no
  third-party requests at runtime; P1 makes zero network calls after load (§1).
- **SR-PLT-05 (P1)** — Production app framework is an open engineering decision (the
  DC runtime is the prototype vehicle, not necessarily the product's). Whatever is
  chosen must satisfy SR-PLT-01..04.

## 12. Verification & acceptance

- **SR-VER-01** — Pitch detection is validated against a recorded test corpus: real
  acoustic and digital pianos, each course note C3–C6, at 2–3 mic distances, plus
  noise overlays (speech, TV) for the false-positive bound. SR-AUD-04/05/06/07 are
  acceptance-tested against this corpus, automated.
- **SR-VER-02** — Course engine, matching rules, hint ladder, warm-up selector,
  trouble-spot detection, and conflict resolution are pure logic with unit tests; no
  audio needed.
- **SR-VER-03** — End-to-end: a scripted run of every lesson via `source:'tap'` events
  must complete the full course; the same harness drives regression tests.
- **SR-VER-04** — Manual acceptance on hardware: real piano, real room, one full unit
  played by a child and an adult, before any release that touches audio.
- **SR-VER-05** — Latency measured strike-to-pixel with a high-speed camera or
  audio-loopback rig at least once per audio-pipeline change (SR-AUD-04).

## 13. Traceability index

| REQUIREMENTS.md | System requirements |
|---|---|
| §1 principles | SR-AUD-05/13, SR-FBK-01, SR-PLT-04, SR-BCK-03 |
| §2 profiles | SR-STO-03, SR-BCK-02 |
| §3 pedagogy/course | SR-CRS-01..08, SR-CRS-10..12, SR-AUD-14, SR-UI-05, SR-FBK-02/03 |
| §4 listening | SR-AUD-01..13, SR-EVT-01, SR-UI-04 |
| §5 feedback/teaching | SR-FBK-01..03, SR-CRS-07, SR-OUT-03 |
| §6 screens | SR-UI-01..04, SR-AUD-08/11 |
| §7 persistence | SR-STO-01..05 |
| §8 platform | SR-PLT-01..05, SR-OUT-02 |
| §9.1 polyphony | SR-AUD-10, SR-EVT-03 |
| §9.2 tempo | SR-CRS-08/09, SR-OUT-04/05 |
| §9.3 MIDI | SR-MID-01/02, SR-EVT-02 |
| §9.4 course 2 / content | SR-CRS-01 |
| §9.5 account/sync | SR-STO-04/05, SR-BCK-01..03 |
| §10 decisions | SR-CRS-03 (D2), SR-AUD-09 (D4), SR-MID-01 (D1), SR-STO-04 (D3) |
