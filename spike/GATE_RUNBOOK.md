# Phase 0 gate runbook — closing the Go/No-Go

A step-by-step guide for one person to complete the listening-spike gate
(PLAN.md Phase 0). Four sessions, roughly an afternoon in total. Fill in the
result tables at the bottom as you go — they become the gate record.

**Pass criteria** (all three must hold):

| # | Target | Where it's measured |
|---|---|---|
| G1 | ≥ 95% of played notes detected with correct pitch | Corpus tab score + live session |
| G2 | ≤ 1 false note event per 10 minutes of non-piano sound | Corpus noise clips + live noise soak |
| G3 | Key strike → screen reflection ≤ 300 ms | High-frame-rate film of the flash square |

**No-Go path**: if G1–G3 can't be met after tuning the clarity threshold, the
pivot is MIDI-first (SR-MID) — a product decision you make deliberately, not a
failure of the process.

---

## Session 0 — Setup (10 min, once)

The mic only works in a **secure context**, so the iPad needs HTTPS (or a
localhost tunnel). Two easy options:

**Option A — self-signed HTTPS on your Mac:**

    cd spike
    # once: create a self-signed certificate (http-server does not make one for you)
    openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 \
      -nodes -subj "/CN=arietta-spike"
    npx http-server -S -C cert.pem -K key.pem -p 8321

Find your Mac's LAN address (`ipconfig getifaddr en0`, e.g.
`192.168.1.20`), then on the iPad open `https://192.168.1.20:8321/`.
Safari will warn about the certificate — tap "Show Details" → "visit this
website". You only need to accept it once.

**Option B — Tailscale** (if both devices are on your tailnet): serve with
`python3 -m http.server 8321` and use the Mac's tailnet HTTPS address.

Checks before you start:

- [ ] iPad on the music stand of the real piano, landscape, where a student
      would actually put it.
- [ ] Room at normal quiet — no need for silence; a normal home is the test.
- [ ] Harness loads and the **Live** tab's "Start listening" asks for the mic.
- [ ] iPad screen auto-lock off (Settings → Display & Brightness → Auto-Lock
      → Never) so recording sessions aren't interrupted.

---

## Session 1 — Record the corpus (BO hat, 60–90 min)

Open the **Record** tab on the iPad. Each clip is one strike of one key that
rings into silence (the default seconds per clip is fine). Clips download as
WAV files — on iPad they land in Files → Downloads; AirDrop the batch to your
Mac afterwards.

For each clip:

1. Type the fields: **Instrument** (short name, e.g. `yamaha` or `digital`),
   **Note** (e.g. `C3`, `F#4` — this exact spelling is parsed by the scorer),
   **Distance** (`stand`, `1m`, or `far`).
2. Tap **Record**, strike the key once, let it ring, wait for the clip to save.
3. Change the Note field and repeat.

### Pass 1 — music-stand distance, chromatic C3–C6 (the core corpus)

All 37 notes, Distance = `stand`:

    C3 C#3 D3 D#3 E3 F3 F#3 G3 G#3 A3 A#3 B3
    C4 C#4 D4 D#4 E4 F4 F#4 G4 G#4 A4 A#4 B4
    C5 C#5 D5 D#5 E5 F5 F#5 G5 G#5 A5 A#5 B5
    C6

Tick each row of the table at the bottom as you go. This pass matters most —
it is where the iPad will actually sit.

### Pass 2 — same notes, Distance = `1m` (iPad moved ~1 m back)

### Pass 3 (optional but recommended) — white keys only, Distance = `far`
(across the room): `C3 D3 E3 F3 G3 A3 B3 C4 ... C6`.

### Noise takes (feeds G2 — the harder, more important target)

Type `noise` in the **Note** field and describe the source in **Instrument**
(the file becomes `noise-<what>-<take>.wav`). Set **Seconds** long — 60–120s
per take. Record, then make the noise *without touching the piano*:

- [ ] `noise-speech` — two people talking right next to the piano, 2 min
- [ ] `noise-tv` — TV audible from the next room, 2 min
- [ ] `noise-household` — kitchen clatter, footsteps, a door, 2 min
- [ ] `noise-singing` — someone humming/singing near the iPad, 1 min
      (pitched non-piano sound is the hardest case — worth having)

### Second piano

Repeat Pass 1 (at minimum) on the second piano with a different Instrument
name. If you only have one piano, record the digital piano through its
speakers as the second instrument, and note it in the gate record.

---

## Session 2 — Score the corpus (QA hat, 15 min, on the Mac)

1. Open the harness on the Mac (`python3 -m http.server 8321` →
   `http://localhost:8321/`), **Corpus** tab.
2. Click the file picker and multi-select **all** recorded WAVs (note clips
   and noise clips together — total duration feeds the false-positive rate).
3. Detector = **YIN** → **Score corpus files** → note the numbers →
   **Download JSON report**.
4. Switch Detector to **MPM** and repeat.
5. Fill in the Results table below. The scorer applies the gate rule itself:
   pass = detection ≥ 95% AND false events ≤ 1 per 10 min.

If one detector passes and the other doesn't, the passing one wins. If both
pass, prefer the one with fewer false events (G2 beats G1 on a tie).

If a detector *almost* passes: re-run the **Live** tab with a higher clarity
threshold and re-check the failing clips — the threshold is meant to be tuned
per device (SR-AUD-05). Record the threshold you settle on.

---

## Session 3 — Live piano + noise soak (30 min, on the iPad)

**Live** tab, iPad on the music stand, winning detector selected.

### 3a. Unit-2 material (G1, live confirmation)

Tap **Start listening**, then play slowly, as a beginner would:

- [ ] Repeated middle C, ×5 — one event per strike, no double counts
- [ ] C-D-E up and back, ×3
- [ ] Five-finger walk C-D-E-F-G and back, ×3
- [ ] Same-key fast repeats (C C C C) — each strike its own event (SR-AUD-06)
- [ ] One long held note — exactly one event while it rings

Count any wrong-pitch or missed detections in the event log. More than 1 miss
in ~50 notes means G1 is in doubt live even if the corpus passed — investigate
before calling it.

### 3b. Ten-minute noise soak (G2, live confirmation)

- [ ] Tick the **noise soak** checkbox (every event now counts as false).
- [ ] Nobody touches the piano for 10 minutes. Let the household be normal:
      talk near it, run the TV, walk around.
- [ ] Record the false-event count. Gate: ≤ 1.

---

## Session 4 — Strike-to-pixel latency (G3, 15 min)

The Live tab flashes a **white square (top-right)** on each detection.

1. Set a phone to slo-mo video (120 or 240 fps).
2. Frame the shot so your hand on the keys AND the iPad screen are both visible.
3. Record ~10 single strikes with a clear finger lift before each.
4. Scrub the footage: count frames from **finger-key contact** to **square
   flash**, for at least 5 strikes.
5. Convert: ms = frames × (1000 / fps). At 240 fps, 300 ms = 72 frames;
   at 120 fps, 36 frames.

Take the **median**, note the worst. Gate: median ≤ 300 ms.

(The **Latency** tab's loopback test is a quick indicative cross-check only —
the camera number is the authoritative one, per SR-VER-05.)

---

## Gate record — fill in and commit

### Corpus scores (Session 2)

| Detector | Note clips | Detected | Detection rate | False events | False / 10 min | Pass |
|---|---|---|---|---|---|---|
| YIN |  |  |  |  |  |  |
| MPM |  |  |  |  |  |  |

Clarity threshold used: ______ · Instruments recorded: ______ · Distances: ______

### Live session (Session 3)

| Check | Result |
|---|---|
| Unit-2 material: misses / total notes |  |
| Sustained note: single event? |  |
| Fast repeats: one event per strike? |  |
| Noise soak: false events in 10 min |  |

### Latency (Session 4)

| Strike | Frames | ms |
|---|---|---|
| 1 |  |  |
| 2 |  |  |
| 3 |  |  |
| 4 |  |  |
| 5 |  |  |
| **Median** |  |  |

### Decision

- Detector chosen: ______
- Clarity threshold: ______
- **Go / No-Go**: ______ · Date: ______ · Decided by: ______ (BO has final say)

When done: check off the boxes in `README.md`, update the Go/No-Go row in
`PLAN.md` §5 (same style as the framework decision), and commit this file
with the numbers filled in. That commit *is* the Phase 0 exit gate record.
