# Phase 6 polyphony gate runbook (SR-AUD-10)

The Phase 0 discipline, applied to chords. The synthetic gate
(`test/poly-gate.test.js`) is a **provisional Go**; this runbook is the human
half. Like the Phase 0 runbook, it is a **release blocker**: no `v*` release
ships polyphonic lessons (lesson 21, Units 9 and 11) until the gate record
below is complete.

## Synthetic gate record (2026-07-10)

| Suite | Detector | Detection | False/10min | Latency mean |
|---|---|---|---|---|
| Stage a dyads (intervals 3-10, roots C3-B3) | sieve | 0.95 | 0.0 | 109 ms |
| Stage a melody over held bass (incl. octave-masked C4 over C3) | sieve | 1.00 | 0.0 | 117 ms |
| Stage b C/F/G triads across C3-C5 | sieve | 1.00 | 0.0 | 117 ms |
| Stage c held triad + melody | sieve | 1.00 | 0.0 | 120 ms |
| 60 s noise floor | sieve | - | 0.0 | - |

- **Winner: `sieve`** (iterative harmonic subtraction over FFT peaks).
  `salience` passes the suites only because the tracker's flush validation
  rescues its set composition; the sieve is correct at the frame level.
- Final tuning: frame 4096, hop 1024, deltaHops 4, minClarity 0.5,
  onsetRatio 0.12, stableFrames 2, gatherMs 60, refractoryMs 300, maxNotes 4,
  harmonic tolerance 3% (sweep 4%), candidates ≥ 2 partials with root or 2nd
  harmonic present.
- The one dyad miss is C3+Eb3 (minor third at the very bottom: fundamentals
  2 FFT bins apart, merged by the window; the partial event scores as a miss,
  not a false positive). Course content never voices a minor third at C3.

## Recorded constraints (bind content authoring)

1. **No simultaneous unison/octave doubles between hands.** One magnitude
   spectrum cannot separate them. Sequential octaves over a ringing note are
   fine (delta-spectrum analysis covers them - held-bass suite).
2. Chords stay within C3-C5; at most 4 simultaneous pitches.
3. Smallest simultaneous interval at the bottom of the range is a major
   third (C3+E3, covered by the triad suite).

## Human validation sessions (deferred, release blocker)

> **When you are ready to run this: start with `GATE_DAY.md`** — one
> checklist covering this gate AND the Phase 0 gate in a single guided
> afternoon, driven by the gate app
> (https://gate-production-3bd2.up.railway.app/gate/). The app walks every
> take below (prompt, record, verdict via the CI scoring math, attest, WAV
> auto-named and downloaded) and exports the record rows for the table
> here. This file stays the authority for the gate rules and the record.

Prereqs: the gate app (or the harness corpus tab, `GATE_RUNBOOK.md`
Session 0), both team pianos, iPad on the music stand.

### Session P1 - record the chord corpus
Record at up to 3 distances (stand/1m/far — stand matters most), both
pianos, quiet room:
- C, F, G major root-position triads at C3, C4 roots (left and right hand).
- Dyads: C4+E4, E4+G4, C3+E3, C3 held + C4/D4/E4/F4/G4 melody.
- Stage c: C3-E3-G3 held under D4-F4-A4-F4-D4 melody.
Name files `poly-<piano>-<chord>-<distance>-<take>.wav`.

### Session P2 - offline scoring
Drop the recorded `poly-*.wav` files into `spike/corpus/` (gitignored) and
run `cd app && npm test` — the `recorded poly corpus meets the gate` suite
scores them through the production PolyTracker and prints detection rate
and false events per 10 minutes. Record the numbers in the gate record
table below.

### Session P3 - live chords + noise soak
- Live: play lesson 21 and one Unit 9 song on the real piano; every chord
  reflected correctly, no phantom notes.
- Soak: 10 minutes of speech/TV near the piano with poly mode active;
  false note-set events must be <= 1.

### Gate rules
- **G1** >= 95% of chords detected with the exact pitch set.
- **G2** <= 1 false note-set event per 10 minutes of non-piano sound.
- **G3** strike-to-pixel <= 300 ms feel on chord steps.

### Gate record (fill after sessions)

| Check | Result | Date | Notes |
|---|---|---|---|
| P2 corpus detection (G1) | 3/3 (100%) | 2026-07-14 | Partial corpus: C3/F3/G3 maj triads, stand, 1 take. Exact pitch set each. |
| P2 corpus false rate (G2) | 0.0 / 10 min | 2026-07-14 | Zero phantom sets on the 3 clips (no noise clips scored under poly yet). |
| P3 live chords (G1/G3) | | | |
| P3 noise soak (G2) | | | |
| Decision (Go / No-Go) | | | |

> P2 note (2026-07-14): the first 3 recorded chords score perfectly through the
> production PolyTracker, but this is only 3 of the P1 chord set (C4/F4 triads,
> the dyads, and the held-bass sequences are not yet recorded). Full P1 corpus
> plus the P3 live soak still needed before a poly Go/No-Go.

**No-Go path**: polyphonic lessons stay gated (lesson 21 reverts to
`comingSoon`, Units 9/11 hidden behind it); MIDI input (SR-MID-01) becomes
the supported path for chords; re-plan with BO.
