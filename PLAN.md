# Arietta — Implementation Plan

References: `REQUIREMENTS.md` (product/pedagogy), `SYSTEM_REQUIREMENTS.md` (SR-* IDs).
Roles: Dev (engineering), UX (design), QA (quality), BO (business owner / piano teacher),
PM (this plan). Durations are indicative working effort, not calendar promises.

## 1. Delivery strategy

Three findings from team consultation shape the entire sequence:

1. **Pitch detection is the only existential risk** (Dev, QA). Every other subsystem is
   deterministic UI and logic we know how to build. If the mic cannot meet SR-AUD-04/05/07
   on a real iPad in a real room, the product premise fails. Therefore it is proven
   *first*, in a disposable spike, before any production code earns investment.
2. **Content is on the critical path, not an afterthought** (BO). 20 lessons of prompts,
   steps, hints, and encouragement in a consistent voice take longer to write well than
   to render. Content authoring starts in Phase 1 and runs parallel to all build phases,
   with the BO owning voice review as a release gate.
3. **The tap keyboard makes everything testable before the mic exists** (QA). Because all
   input normalizes to `NoteEvent` (SR-EVT-01), the entire course, feedback engine, and
   UI ship and regression-test against `source:'tap'` — the mic slots in behind the same
   seam. Build order exploits this: engine and UI first, mic behind it.

Beta comes before breadth: a real family, on a real piano, playing Units 1–3, teaches us
more than two more units of content would.

## 2. Phases

### Phase 0 — Listening spike (de-risk) — ~2–3 wks
**Goal**: prove monophonic detection meets targets on iPad Safari, or fail fast.
- Scope: throwaway harness — `getUserMedia` capture (SR-AUD-01), candidate detectors
  (autocorrelation/YIN-family vs. lightweight ML) on-device, latency and accuracy
  measurement. Start the recorded test corpus (SR-VER-01): both team pianos, C3–C6,
  2–3 mic distances, speech/TV noise overlays.
- Team: Dev builds; QA owns corpus design from day one; BO records the piano samples.
- **Exit gate (Go/No-Go)**: ≥95% detection, ≤1 false event/10 min on corpus playback
  and live piano; strike-to-pixel ≤300 ms measured (SR-VER-05). Algorithm choice
  recorded. **No-Go path**: MIDI-first pivot (SR-MID) — decided with BO, not assumed.
- **Gate status (2026-07-09): PROVISIONAL GO — human validation deferred.** Both
  detectors pass every synthetic suite; the recorded-corpus and live-piano runs
  (`spike/GATE_RUNBOOK.md`) are deferred so the build can continue. The gate is a
  hard **release blocker**: CI's release-gate workflow fails any `v*` tag until the
  runbook's gate record is complete, and Phase 4's exit criteria (SR-VER-01..05)
  already require it. If the deferred validation lands No-Go, Phase 2 mic work is
  shelved and the MIDI-first pivot is re-planned with BO.

### Phase 1 — Foundation — ~3–4 wks
**Goal**: production skeleton with the whole course playable by tap.
- Scope: framework decision (SR-PLT-05) and PWA offline shell (SR-PLT-01); `NoteEvent`
  pipeline with tap source (SR-EVT-01/02, SR-UI-04); course engine + content schema
  (SR-CRS-01..05); progress store with versioned schema and profiles (SR-STO-01..03);
  Web Audio synth voice ported from prototype (SR-OUT-01).
- UX: translate the prototype's visual language into reusable tokens/components
  (it is the approved design direction, not a sketch); design first-run flow ahead of
  Phase 2 need. Fingering display added to staff rendering (SR-CRS-05) — new vs.
  prototype.
- BO: authors Units 1–3 content in the new schema; establishes the voice guide.
- QA: scripted full-course tap-driven E2E harness stood up now (SR-VER-03); engine
  unit tests (SR-VER-02).
- **Exit**: Units 1–3 playable end-to-end via tap keyboard, offline, progress persists
  across restart; E2E harness green in CI.

### Phase 2 — The teacher arrives (mic + feedback) — ~3–4 wks
**Goal**: the app hears a real piano and teaches like Arietta.
- Scope: productionize the spike detector behind the NoteEvent seam (SR-AUD-01..08,
  12, 13); first-run "Can you hear me?" calibration (SR-AUD-11); listening pill states;
  self-hearing gate (SR-OUT-02); hint ladder + encouragement pools (SR-FBK-01..03);
  free play (SR-UI-02); warm-up selector (SR-CRS-06); step-type engine support incl.
  ear moments and session recap (SR-CRS-10/12).
- UX: calibration flow usability with a child; hint/encouragement presentation timing.
- BO: reviews every student-facing string; validates hint wording at the piano.
- QA: corpus tests automated in CI; live-piano acceptance of Units 1–3 (SR-VER-04).
- **Exit**: a beginner completes Unit 2 on a real piano with no keyboard taps; false
  positives within bound during a 10-minute family-noise session.
- **Build status (2026-07-09): complete; live-piano exit deferred.** All Phase 2
  scope is built and verified with a synthesized-stream mic (full pipeline, no
  hardware). The real-piano exit runs alongside the Phase 0 gate validation
  (`spike/GATE_RUNBOOK.md`) — same pre-release blocker.

### Phase 3 — Full v1 course + family features — ~3–4 wks
**Goal**: everything REQUIREMENTS.md §3–§7 promises for v1.
- Scope: metronome + basic timing grid for Unit 4 (SR-OUT-04, SR-CRS-08); clap/tap
  onset detection for clap-then-play (SR-AUD-14); trouble-spot mini-loops (SR-CRS-07);
  "Play with me" follow-mode accompaniment (SR-OUT-03); reading-snippet generator
  (SR-CRS-11); watch-me hand-demo component + assets (SR-UI-05); parent's glimpse
  (SR-UI-03); settings complete; Units 4–6 content (lesson 21 visible, gated
  "coming soon").
- BO: authors Units 4–6; defines timing-feedback phrasing ("a little early…") and
  accompaniment voicings per song.
- UX: steadiness of the play-along at tempo; glimpse tone and placement.
- QA: timing-grid unit tests; extends E2E to full course.
- **Exit**: all 20 v1 lessons complete via mic on a real piano; qualitative timing
  feedback verified against deliberately rushed/dragged playing.
- **Build status (2026-07-09): complete; live-piano exit deferred.** All Phase 3
  scope is built and browser-verified by tap: metronome + timing grid (words only,
  rushed/dragged covered by tests), clap onset detection, trouble-spot mini-loops,
  follow-mode accompaniment (harmony pitch-classes gated instead of full mic
  suspend), reading-snippet generator, animated watch-me hand demos (code-drawn,
  no video assets), settings + parent's glimpse, Units 4–6 content with lesson 21
  visible and gated "coming soon". Full 20-lesson tap E2E green. The
  "via mic on a real piano" exit joins the deferred hardware validation
  (`spike/GATE_RUNBOOK.md`); flag for that session: onset-detector thresholds vs.
  metronome click bleed through the iPad speaker/mic loop.

### Phase 4 — Hardening, beta, v1 release — ~2–3 wks
**Goal**: ship something a family actually keeps using.
- Scope: device matrix (older iPads — SR-PLT-03 thermal/perf), interruption handling
  (SR-PLT-02), accessibility pass (touch targets, contrast), content voice-consistency
  final review (BO gate), **family beta**: ≥2 households, ≥1 child ≤8, two weeks,
  real pianos.
- QA owns beta protocol and triage; PM owns cut list — beta findings that are pedagogy
  problems (BO judgment) block release; polish items do not.
- **Exit / v1 release criteria**: SR-VER-01..05 all satisfied; beta families completed
  Unit 2+ unassisted; zero data-loss incidents; offline verified cold.
- **Build status (2026-07-09): software scope complete; human/hardware items open.**
  Interruption handling (self-healing mic with interrupted/lost states), the
  accessibility pass (44px targets, AA-tiered contrast enforced by test,
  reduced motion, focus rings), detector timing instrumentation with a budget
  tripwire, and the on-device diagnostics export in Settings are built and
  test-covered. Beta protocol documented (docs/BETA_PROTOCOL.md). Open: the
  device-matrix runs, the two-week family beta, BO voice review, and
  SR-VER-01/04/05 — tracked in spike/GATE_RUNBOOK.md as release blockers.

### Phase 5 — Account & sync + tempo depth (product Phase 2, wave 1) — ~3–4 wks
- Scope: Railway backend + auth (SR-BCK-01..03), sync client + conflict rules
  (SR-STO-04/05); steadiness view + practice tempos (SR-CRS-09, SR-OUT-05); C3
  calibration prep for Unit 6 (SR-AUD-09).
- Gate: local-first regression — every v1 flow re-verified with backend unreachable.
- **Build status (2026-07-10): complete; piano-hardware checks open.**
  The sync server (node:http + better-sqlite3: household create/link with PIN,
  rate limiting, push/pull with server-side merge, tombstoned profile deletion),
  the shared most-progress-wins merge core (byte-identical app/server copies,
  guarded by test), and the additive sync client (inert unless linked, silent
  failures with backoff, server-arbitrated tombstones, reentrancy- and
  leave-race-safe) are built and test-covered (server 18, app suite 178).
  Practice tempos (Gently/Easy pace/Full speed with live metronome retempo),
  the number-free steadiness view, in-time backing on the metronome grid, and
  the C3 low-clarity band with optional mic-check calibration are in. The
  local-first gate passed: full flows driven in a browser against an
  unreachable backend with a clean console. SR-BCK-02 deviation: interim
  family-code+PIN auth; email/Apple sign-in deferred. Deployed: Railway
  service `api` (volume persistence verified across a container replacement);
  two-device sync smoke passed in-browser (join, progress carry, settings
  both ways, delete-everywhere with quiet 401 auto-unlink); `web` redeployed
  with the api URL baked in and a live create/delete verified from the
  production origin. Open: low-note calibration on the beta pianos;
  backing-track behavior during trouble-spot loops (known desync, verify at
  the piano); reset-while-linked semantics (a linked reset is re-merged back
  on the next pull — product decision deferred).

### Phase 6 — Polyphony, MIDI, Course 2 (wave 2) — sized at Phase 5 exit
- Scope: polyphonic detection stages a→c (SR-AUD-10, SR-EVT-03) unlocking lesson 21 and
  Units 9/11; native-shell decision + MIDI adapter (SR-MID-01/02); Course 2 content
  (Units 7–12, lessons 22–43) authored by BO across the whole phase.
- Polyphony gets its own mini-spike gate, like Phase 0 — same fail-fast discipline.

## 3. Workstream ownership

| Workstream | Owner | Runs through |
|---|---|---|
| Audio pipeline (capture→detector→events) | Dev | P0, P2, P5, P6 |
| Course/feedback engine + content schema | Dev | P1–P3 |
| Content authoring + voice | BO | P1–P4, P6 |
| Design system, flows, child usability | UX | P1–P4 |
| Test corpus, E2E harness, beta protocol | QA | P0–P4 (gatekeeper every phase) |
| Backend/sync | Dev | P5 |

## 4. Risk register

| # | Risk | L | I | Mitigation |
|---|---|---|---|---|
| R1 | Pitch detection misses accuracy/latency targets on iPad | M | Critical | Phase 0 spike + explicit No-Go pivot to MIDI-first |
| R2 | False positives in noisy homes erode trust | M | High | Corpus noise overlays from day 1; confidence threshold tunable; "silence over guessing" enforced at SR-AUD-05 |
| R3 | iPad Safari audio quirks (suspended AudioContext, mic loss on backgrounding) | H | Med | Interruption handling required at P4 gate (SR-PLT-02); known-issue playbook from spike |
| R4 | Content authoring lags build (20 then 22 more lessons, plus hand-demo filming) | M | High | BO authoring starts P1; schema frozen early; voice guide + review gates; watch-me demos few per unit with illustration fallback if filming slips |
| R5 | Framework/PWA choice fights offline or audio-thread needs | L | Med | Decision forced at P1 start with SR-PLT-01..04 as acceptance test |
| R6 | Scope creep from Phase-2 items into v1 | M | Med | Phase gates track SR IDs; PM cut list; P2-tagged SRs need a plan change to move |
| R7 | Beta reveals pedagogy misses (hints confuse kids) | M | Med | BO in every string review from P2; child usability in P2, not P4 |

## 5. Decisions due

| Decision | Owner | Due |
|---|---|---|
| Pitch detection algorithm | Dev (QA verifies) | Phase 0 exit |
| Production framework / PWA stack (SR-PLT-05) | Dev + PM | ✅ Decided 2026-07-08: Vite + Preact (rationale in `app/README.md`) |
| Go/No-Go on mic-first premise | All, BO has final say | ⏳ Provisional Go 2026-07-09; human validation deferred — release blocker (see Phase 0 gate status) |
| Native shell (Capacitor) for MIDI (SR-MID-02) | Dev + PM | ✅ Decided 2026-07-10: Capacitor when needed, not built yet; Web MIDI adapter ships now (`docs/decisions/2026-07-10-native-shell.md`) |
| Beta household recruitment | BO + PM | During Phase 3 |

## 6. Governance

- **Cadence**: weekly working demo (on-device, real piano whenever audio changed);
  phase-gate review at each exit with all roles present.
- **Definition of done** (any feature): SR acceptance criteria met, unit/E2E coverage
  per SR-VER-02/03, BO sign-off on any student-facing text, no numeric scores or
  gamification leaked into UI (standing check from REQUIREMENTS.md §1).
- **Change control**: moving any SR between phases updates this file and
  SYSTEM_REQUIREMENTS.md phase tags in the same change.
