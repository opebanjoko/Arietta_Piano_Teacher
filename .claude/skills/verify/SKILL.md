---
name: verify
description: How to build, run, and drive Arietta (app/) to verify changes end-to-end in a browser.
---

# Verifying Arietta

## Build & unit/E2E suite
```bash
cd app && npm test          # node:test — engine, content, timing, full-course tap E2E
cd app && npx vite build    # PWA build; check "precache N entries" line
```

## Run & drive in a browser
```bash
cd app && npx vite --port 5199 --strictPort   # dev server (background)
```
Open http://localhost:5199 with Playwright. No mic in automation: choose
"Not now" at the mic check — the tap keyboard drives everything.

- Tap-keyboard keys are the divs with `style.touchAction === 'none'` and a
  `flex` style; dispatch `new PointerEvent('pointerdown', {bubbles: true})`.
  The key's letter is its trimmed textContent (C4 also contains "middle C").
- To unlock later units, seed IndexedDB db `arietta` (v1): store `progress`,
  keyPath `[profileId, lessonId]`, rows `{profileId, lessonId, completed: true,
  lastPlayedAt}`. Get profileId from the `profiles` store. Reload after seeding.
- Timed material (Unit 4+) judges gaps between taps: space them on the beat
  (60 BPM → 1000 ms) using `performance.now()` waits, not fixed sleeps.
- Drive ONE evaluate at a time and re-query elements inside each evaluate —
  Preact re-renders invalidate old references, and interleaved dispatches
  make note counts lie.
- Trouble-spot test: play 1-2 notes, then miss the same target 3x → offer
  overlay ("tricky part for everyone") → accept → corner twice → rejoin.

## Gotchas
- sessionStorage flags (`arietta:warmupOffered`, `arietta:recapShown`) make
  the warm-up/recap fire once per tab session; reload keeps them.
- The listening pill says "Listening…" even in tap-key mode.
