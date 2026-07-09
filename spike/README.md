# Phase 0 — Listening spike

Throwaway harness (PLAN.md Phase 0) to prove monophonic piano pitch detection on
iPad Safari before any production code. Exit gate (Go/No-Go): >= 95% detection,
<= 1 false event / 10 min on corpus playback and live piano, strike-to-pixel
<= 300 ms (SR-AUD-04/05/07, SR-VER-05). No-Go path: MIDI-first pivot (SR-MID).

## Run

Harness (any local server; the harness is dependency-free):

    cd spike && python3 -m http.server 8321
    open http://localhost:8321/

On the iPad, mic capture needs a secure context: serve over HTTPS or a
localhost tunnel (e.g. `npx http-server -S`, Tailscale, ngrok).

Logic tests (detectors, tracker, scorer, offline pipeline — 42 tests):

    cd spike && node --test

## What's here

- `lib/pitch.js` — candidate detectors: YIN and MPM, pure functions over a
  2048-sample frame; search range 90–1200 Hz covering C3–C6 (SR-AUD-03).
- `lib/tracker.js` — per-frame detections -> `NoteEvent` (SR-EVT-01): clarity
  threshold (silence over guessing, SR-AUD-05), one event per sustained note,
  re-strike via RMS re-attack (SR-AUD-06).
- `lib/pipeline.js` — offline detector->tracker run over a buffer; also renders
  scripted synthetic performances with ground truth.
- `lib/score.js`, `lib/corpus.js` — gate math for timestamped truth (synthetic)
  and one-note-per-clip recordings (SR-VER-01).
- `worklet.js` + `main.js` + `index.html` — the browser harness.

Harness tabs:

- **Live** — mic capture per SR-AUD-01 (echo cancellation and auto-gain off),
  detector choice, tunable clarity threshold, listening pill, NoteEvent log,
  per-frame detector cost. Noise-soak mode counts every event as false for the
  10-minute family-noise test. The white square flashes on each event: film key
  strike and square at 120/240 fps for the authoritative strike-to-pixel number.
- **Corpus** — synthetic suite (both detectors, in-browser), plus scoring of
  recorded clips with a JSON report download.
- **Record** — builds the SR-VER-01 corpus: one strike per clip,
  `<instrument>-<note>-<distance>-<take>.wav`; `noise-<what>-<take>.wav` for
  speech/TV false-positive material. Clips download as 16-bit mono WAV.
- **Latency** — in-app loopback estimate (speaker -> mic -> detection, audio
  clock both ends). Indicative only; the camera measurement is authoritative.

## Results so far (synthetic, desktop)

Both detectors pass every synthetic suite: 10/10 detection on a C3–C6 walk
(clean, quiet, and over a noise bed), 5/5 repeated same-key strikes, zero false
events over 60 s of noise. Detector-path latency ~56 ms against the 150 ms
detector budget; throughput 17–30x realtime on a laptop (CPU headroom for the
fanless-iPad requirement, SR-PLT-03). Synthetic tones are not pianos — the gate
is decided on the recorded corpus and live instruments only.

## Go/No-Go checklist (human tasks)

- [ ] BO records the corpus on both team pianos: every course note C3–C6,
      2–3 mic distances, plus long speech/TV noise takes (Record tab).
- [ ] QA scores the corpus with both detectors (Corpus tab) — gate numbers.
- [ ] Live piano session on iPad, on the music stand: unit-2 material plus a
      10-minute noise soak (Live tab, noise-soak mode).
- [ ] Strike-to-pixel filmed at high frame rate (Live tab flash square).
- [ ] Algorithm choice recorded; decide Go / No-Go with BO.

## Notes for productionization (Phase 2)

This code is disposable, but two things carry: the `NoteEvent` seam matches
SR-EVT-01, and detection must move off the main thread (worklet -> Worker) per
SR-AUD-02 — the harness runs detection on the main thread to keep the spike
inspectable, and measures its cost per frame so the budget is known.
