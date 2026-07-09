# Phase 4 — Hardening & beta readiness: design

Date: 2026-07-09
References: PLAN.md Phase 4, SYSTEM_REQUIREMENTS.md (SR-PLT-02/03/04, SR-AUD-12,
SR-STO-01), REQUIREMENTS.md §1 (privacy, tone).

## Scope

The buildable (software) portion of PLAN.md Phase 4, plus beta-support tooling:

1. Mic interruption handling (SR-PLT-02) — self-healing mic controller.
2. Accessibility pass — touch targets, contrast, motion.
3. Performance instrumentation (SR-PLT-03) — detector timing, regression tripwire.
4. Beta diagnostics export — on-device rolling log + parent-shared export.
5. Beta protocol doc + PLAN.md/runbook updates.

**Out of scope** (human/hardware, deferred to `spike/GATE_RUNBOOK.md` and the beta
itself): device-matrix runs on real iPads, the two-week family beta, BO
voice-consistency review, SR-VER-01/04/05 hardware gates.

## 1. Interruption handling (SR-PLT-02)

Problem: iPad Safari suspends the AudioContext and/or ends the mic MediaStream
track on backgrounding, Siri, calls, or another app claiming the mic. Today
`app/src/audio/mic.js` never notices — the app shows "Listening…" while deaf
(risk R3). Lesson state is already safe (Preact state + IndexedDB); recovery is
purely about the audio graph.

Decision: **recovery lives inside the mic controller** (self-healing mic), behind
the existing `onState` seam. `app.jsx` only renders states.

- New states: `interrupted` (recovering) and `lost` (gave up). Full machine:
  `idle → listening ↔ suspended`, any live state `→ interrupted → listening`
  (recovered) or `→ lost` (retries exhausted).
- Detection, attached after `wire()`:
  - mic track `ended` event;
  - `AudioContext.onstatechange` entering `interrupted` or an unexpected
    `suspended`;
  - `document.visibilitychange` — going hidden marks a pending recovery, coming
    back visible triggers it.
- Recovery: tear down worker/context, then re-run the start path with the same
  config. The real-mic path re-acquires `getUserMedia`; injected streams
  (`window.__ariettaMicStream`, `startFromStream`) re-wire the same stream.
  Retries spaced ~1 s and ~3 s; on failure state becomes `lost` and the tap
  keyboard silently carries the lesson (existing SR-AUD-12 fallback).
- `app.jsx`: map `interrupted` to pill copy "Waking up my ears…" (string via
  `content/voice.js`, BO review applies); `lost` renders like mic-disabled.
- The synth output AudioContext also gets a foreground `resume()` so demos and
  encouragement sound after backgrounding.
- Tests: unit-drive the state machine with fake stream/context objects
  (track-ended, statechange, visibility sequences). Real-device drill goes on
  the hardware runbook checklist.

## 2. Accessibility pass

Audit first, then targeted fixes; no redesign.

- Touch targets: every interactive element ≥ 44×44 CSS px (Apple HIG). Likely
  offenders: piano keys, small header/settings buttons.
- Contrast: every ink-token/background pair used for meaningful text meets WCAG
  AA (4.5:1 normal, 3:1 large). `--ink-faint` (#A79878 on cream) is expected to
  fail — darken it or restrict it to decorative text. A unit test computes the
  ratios for the token pairs so they cannot regress.
- Motion: `prefers-reduced-motion` disables the pulse/glow animations; visible
  focus states for external-keyboard users.

## 3. Performance (SR-PLT-03)

- The detect worker measures per-block processing time (rolling average) and
  reports it; the value appears in the diagnostics export so beta devices
  report real numbers.
- A test asserts the detector stays under a generous per-block budget on the
  test machine — a regression tripwire, not a thermal proof.
- True sustained-session thermal validation on an older iPad cannot be done in
  software; it is flagged in the hardware runbook.

## 4. Beta diagnostics export

Constraint: SR-PLT-04 — no analytics, no network. Everything stays on-device
until a parent explicitly copies/shares it.

- New `diag` object store, added as schema **migration v2** in
  `app/src/store/db.js` (append to `MIGRATIONS`, never edit v1).
- New module `app/src/store/diag.js`: `log(kind, detail)`, `list()`, `clear()`.
  Rolling log capped at ~200 entries (oldest dropped). Logged kinds only:
  unhandled errors (`window.onerror`, `unhandledrejection`), mic
  interruption/recovery/loss, app boot. No usage or progress tracking.
- Settings (parent's area) gains a **Diagnostics** block: app version (injected
  at build via Vite define), device info (userAgent, screen), mic settings,
  detector timing, and the event log — with Copy (clipboard, share sheet where
  available) and Clear. Strings are parent-facing; BO review still applies.

## 5. Beta protocol + plan updates

- `docs/BETA_PROTOCOL.md`: household setup checklist, two-week cadence, what to
  report and how (diagnostics export), triage rules per PLAN.md — pedagogy
  problems block release, polish does not.
- PLAN.md Phase 4 build-status note; hardware runbook gains new flags: thermal
  run and on-device interruption drill.

## Testing summary

- Unit: mic recovery state machine (fake stream/ctx), diag store (fake db),
  contrast ratios, detector per-block budget.
- Regression: full-course tap E2E stays green.
- Deferred to hardware: interruption drill on a real iPad, thermal session,
  SR-VER-01/04/05.
