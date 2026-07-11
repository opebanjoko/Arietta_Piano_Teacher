# Gate day — the whole afternoon, start here

One guided afternoon at the real piano closes both open release blockers:
the Phase 0 mono gate (`GATE_RUNBOOK.md`) and the Phase 6 polyphony gate
(`POLY_GATE_RUNBOOK.md`). Those two files stay the authority for pass
criteria and hold the record tables you fill in at the end; this page is the
checklist you follow on the day.

**The tool**: the gate app at
**https://gate-production-3bd2.up.railway.app/gate/** — open it in Safari on
the iPad. It prompts each take, records, tells you what the detector heard
(the exact same code CI scoring runs), you attest with one tap, and the WAV
downloads itself already named for the scorers. Progress survives reloads.

Budget roughly 2.5–3 hours for one piano; add ~45 min per extra piano or
distance pass.

---

## 0. Prep (10 min)

- [ ] iPad on the music stand, landscape, where a student would put it.
- [ ] Auto-lock off (Settings → Display & Brightness → Auto-Lock → Never).
- [ ] Room at normal home quiet — silence is not the test.
- [ ] Open the gate app; on the setup screen type the **piano** name
      (e.g. `yamaha` or `digital`) and pick **distance** `stand`.
- [ ] Tap **Mono corpus** → **Record** once — Safari asks for the mic;
      allow it. Retake that first note if the permission prompt ate it.

## 1. Mono corpus — Phase 0 G1 (45–60 min)

- [ ] **Mono corpus** session: 37 chromatic takes, C3 to C6. For each: play
      the prompted note once, cleanly, let it ring; attest.
      - "Yes" even when the verdict says it does not match — a real miss
        must count against the detector. "I played something else" is only
        for your own slips (wrong key, double strike).
- [ ] Each WAV lands in Files → Downloads as it saves
      (e.g. `yamaha-Cs4-stand-1.wav`).

## 2. Noise takes — feeds G2 (about 8 min of clips)

- [ ] **Noise takes** session, 4 clips, nobody touching the piano:
      speech beside the piano (2 min), TV from the next room (2 min),
      household clatter (2 min), someone humming near the iPad (1 min).
- [ ] "Quiet, as it should be" is the good verdict. If it heard notes,
      save the clip anyway — catching false positives is the point.

## 3. Chord corpus — polyphony P1 (15 min)

- [ ] **Chord corpus** session: 5 triads, 3 dyads, the held-bass melody and
      the hands-together pattern, exactly as prompted. Rolled chords are
      fine for your hands but land the corpus takes *together* — that is
      what the gate measures.

## 4. Live checks (20 min)

- [ ] **Live check**, chord mode OFF. Play the Unit-2 material slowly, as a
      beginner would: repeated middle C ×5, C-D-E up and back ×3, the
      five-finger walk ×3, fast same-key repeats, one long held note.
      Attest every detection Right/Wrong. More than 1 wrong in ~50 notes
      puts G1 in doubt live — note it.
- [ ] **Live check**, chord mode ON. Play lesson-21 and Unit-9 material:
      C chord ×3, C–G7–C switching, a held C3 under a slow melody.

## 5. Noise soaks — G2 (2 × 10 min, unattended)

- [ ] **Noise soak**, mono mode: start it, let the household be normal
      (talk, TV, walking) for 10 minutes, nobody plays. Pass: ≤ 1 event.
- [ ] Repeat with chord mode ON.
- [ ] These are a good time to prepare the camera for step 7.

## 6. More passes (optional but recommended)

- [ ] Change **distance** to `1m` on the setup screen and re-run the Mono
      corpus (the app restarts the count per config — attest fresh takes).
- [ ] Second piano: change the **piano** name and repeat at least the Mono
      corpus `stand` pass and the Chord corpus.

## 7. Strike-to-pixel latency — G3, camera, still manual (15 min)

The one thing a browser cannot measure honestly. Follow
`GATE_RUNBOOK.md` **Session 4** exactly: slow-mo phone video of hand +
screen using the spike harness Live tab's flash square, count frames on
5+ strikes, median ≤ 300 ms.

## 8. Back at the Mac — scoring and the record (20 min)

- [ ] In the gate app: **Results** → download the **zip**, the
      **gate record (markdown)** and the **raw JSON**.
- [ ] AirDrop everything (or the individual WAVs from Files → Downloads)
      to the Mac and drop all WAVs into `spike/corpus/` (gitignored —
      home audio never leaves your machines).
- [ ] `cd app && npm test` — two suites stop skipping and score for real:
      `recorded corpus meets the gate` (mono, both detectors) and
      `recorded poly corpus meets the gate`. These numbers are the formal
      G1/G2 results; the app's attested percentages should agree.
- [ ] Fill in the record tables: `GATE_RUNBOOK.md` (corpus scores, live
      session, latency, Decision) and `POLY_GATE_RUNBOOK.md` (P2/P3 rows,
      Decision). The downloaded gate-record markdown has the rows ready.
- [ ] Update the Go/No-Go rows in `PLAN.md` §5, commit both runbooks with
      the numbers filled in — those commits are the gate records.
- [ ] While the hardware is set up: run the Phase 4 additions
      (`GATE_RUNBOOK.md` bottom section) — interruption drill, thermal run,
      metronome-bleed check.

## Afterwards

- [ ] If both gates pass: delete the throwaway Railway service `gate`.
- [ ] If either fails: the No-Go paths are in the runbooks — mono pivots
      to MIDI-first (SR-MID), poly re-gates lesson 21 and Units 9/11
      behind `comingSoon` with MIDI as the chord path.
