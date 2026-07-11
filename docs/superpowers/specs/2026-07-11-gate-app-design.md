# Gate app — guided hardware-validation harness (throwaway)

**Date**: 2026-07-11 · **Status**: approved (design accepted in conversation)

## Purpose

The Phase 0 and Phase 6 gate runbooks (`spike/GATE_RUNBOOK.md`,
`spike/POLY_GATE_RUNBOOK.md`) are open release blockers requiring a human at
a real piano. Doing them by hand (record files, name them, score offline,
tally) is tedious. The gate app is a **throwaway** guided browser harness,
deployed on Railway, that walks the operator through every take: prompt →
record → show what the detector heard → operator attests → WAV auto-downloads
with the runbook's filename → tallies → exportable gate record.

## Approach (chosen from three)

Standalone static page at `spike/gate/` importing `spike/lib/` ES modules
directly — no build step, no framework. Each recorded take is analyzed
**offline with the exact functions CI scoring uses** (`processBuffer` for
mono, `processBufferPoly` sieve for chords), so the verdict at the piano is
the same math that scores the corpus later. Rejected: bolting a tab onto the
existing spike harness (entangles two throwaways), and a Vite/Preact mini-app
(build step buys nothing).

## Screens and flow

1. **Setup** — piano label (acoustic / digital / custom) and distance
   (near / stand / far); both feed filenames. Then pick a session.
2. **Mono corpus** (Phase 0 G1): chromatic C3–C6, 37 prompts. Each take:
   record 2.5 s → verdict ("I heard: C4" vs expected) → attest
   **Yes** (take saved, WAV auto-downloads) / **Retake** / **I played
   something else** (human error; not counted against the detector).
   Auto-advance.
3. **Poly corpus** (P1): triads [C3,F3,G3,C4,F4]maj (G4maj excluded — its
   D5 fifth is above the detector's C3–C5 fundamental range), dyads C4+E4,
   E4+G4, C3+E3 (3 s each), held-bass C3 + C4/D4/E4/F4/G4 melody (8 s,
   sequence-matched), hands-together C3-E3-G3 held + D4-F4-A4-F4-D4 (10 s).
4. **Live check** (Phase 0 Session 3 / P3 live): continuous chunked analysis;
   each detection shown with right/wrong attest buttons → running detection
   tally.
5. **Noise soak** (G2/P3): 10-minute timer counting emitted note events while
   nobody plays; live counter; pass ≤ 1 per 10 min. No WAV kept (~55 MB).
6. **Results**: per-session tallies (detection rate, false events, retakes),
   **Download all WAVs (zip, stored)**, **Download gate record** (markdown
   rows ready to paste into both runbooks) and raw JSON. Attestation state in
   localStorage so a session survives reloads (WAV bytes are not persisted —
   each take already downloaded at attest time; the zip covers the current
   page session).

Out of scope, stated on the results screen: strike-to-pixel latency (G3)
still needs the slow-mo camera per GATE_RUNBOOK Session 4.

## Modules (all in `spike/gate/`, plain ES modules)

- `tasks.js` — pure task-script data/generators: `monoCorpusTasks(cfg)`,
  `polyCorpusTasks(cfg)`, filename builders per runbook conventions
  (`<instrument>-<note>-<distance>-<take>.wav`,
  `poly-<piano>-<chord>-<distance>-<take>.wav`).
- `analyze.js` — pure verdicts: run the pipeline over a recorded buffer,
  compare against the task expectation (single pitch, chord set, or onset
  sequence), return `{ heardText, match }`.
- `wav.js` — Float32 → 16-bit PCM mono WAV encoder.
- `zip.js` — stored-entry ZIP writer with CRC32 (WAVs don't compress).
- `capture.js` — getUserMedia (echoCancellation/autoGainControl off) +
  AudioWorklet → Float32 recording of N seconds; `window.__gateStream` seam
  for headless tests; plain-language mic-denied error.
- `gate.js` + `index.html` — wizard UI (template-string DOM, warm minimal
  CSS), state machine, localStorage persistence, download triggers (each
  tied to the attest click, a user gesture, for Safari).

## Testing

- `spike/test/gate.test.js` (node): WAV header/PCM round-trip, zip structure
  (local headers, CRC, central directory readable), task-script sanity
  (counts, ranges, filename conventions, chord pitch-classes distinct),
  analyze verdicts on `renderPerformance` buffers (correct note matches,
  wrong note doesn't, chord and sequence matching).
- Playwright: full wizard driven with a synthesized piano stream through the
  `__gateStream` seam; verify verdict text, attest flow, zip/record downloads
  exist, console clean.

## Deploy

Stage `spike/` outside the repo (known `railway up` quirk), new Railway
service **`gate`** in project `arietta`, Railpack static
(`RAILPACK_STATIC_FILE_ROOT` = staged root), generated HTTPS domain
(mic requires HTTPS on iPad). Throwaway: delete the service when both gate
records are complete.
