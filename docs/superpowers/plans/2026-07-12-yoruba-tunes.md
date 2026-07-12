# Yoruba Tunes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four Yoruba tunes (L'ábẹ́ igi ọ́rọ́mbọ́, Bàtà mi a dún kòkòkà, Ìṣẹ́ Olúwa, Tòlótòló) become first-class song lessons in Arietta's course, per `docs/superpowers/specs/2026-07-12-yoruba-tunes-design.md`.

**Architecture:** Content-only feature: four `kind: 'song'` entries in `app/src/content/course.js` (pure data, SR-CRS-01), appended to units 3/4/5/6, joined to both recital setlist pools. The only code-adjacent work is vendoring latin-ext + vietnamese font subsets so Yoruba orthography renders in Arietta's own typefaces. Engine, UI components, and detection are untouched.

**Tech Stack:** Vite + Preact app in `app/`; tests via `node --test`; fonts checked with python fontTools via `uvx`.

## Global Constraints

- All melodies are **drafts pending family audition** ("Hear it first" per tune); expect note-level corrections after Task 5.
- Every played note carries a finger number (SR-CRS-05). RH C position: C4=1 D4=2 E4=3 F4=4 G4=5, A4=5 (pinky stretch, as in `twinkle`). LH C3 position: C3=5 D3=4 E3=3 F3=2 G3=1 (as in `merrily-left-hand`).
- Song notes must stay within the notes the song's unit has taught (guard test in Task 2).
- Titles use full Yoruba orthography with combining marks exactly as written in this plan.
- Do NOT push to origin/main mid-plan: every push triggers the `web` service's broken GitHub auto-deploy (serves 404s). Push once at the end, then immediately re-deploy `web` from a staging dir (see memory `railway-deploy-quirks` / `app/README.md` Deploy).
- Working dir for all commands: `/Users/ope_d_coder/projects/VIBE CODING AGENTIC ENGINEER/Home_Piano_Teacher/app` unless stated.

---

### Task 1: Vendor latin-ext + vietnamese font subsets

Yoruba characters (ṣ U+1E63; ẹ U+1EB9/ọ U+1ECD; combining acute U+0301, grave U+0300, dot-below U+0323) are NOT in the vendored latin subsets. ṣ lives in Google's latin-ext subset; ẹ/ọ and the combining marks live in the vietnamese subset. Vendor both subsets for Nunito Sans, Source Serif 4, and Source Serif 4 Italic.

**Files:**
- Create: `app/scripts/vendor-font-subsets.py`
- Create: `app/scripts/check-font-coverage.py`
- Create (downloaded): `app/src/fonts/{nunito-sans,source-serif-4,source-serif-4-italic}-{latin-ext,vietnamese}.woff2` (6 files)
- Modify: `app/src/fonts/fonts.css` (append 6 `@font-face` blocks)

**Interfaces:**
- Produces: font files + CSS such that any string in course.js renders without fallback; `check-font-coverage.py` exits 0 iff every non-ASCII char in course.js is in the vendored cmaps (used again in Task 4).

- [ ] **Step 1: Write the coverage checker (the "failing test")**

```python
# app/scripts/check-font-coverage.py
"""Every non-ASCII character in course.js must exist in the vendored fonts.

Run: uvx --from fonttools --with brotli python3 scripts/check-font-coverage.py
"""
import sys
from pathlib import Path
from fontTools.ttLib import TTFont

APP = Path(__file__).resolve().parent.parent
FONTS = {
    'Nunito Sans': [
        'nunito-sans-400-latin.woff2',
        'nunito-sans-latin-ext.woff2',
        'nunito-sans-vietnamese.woff2',
    ],
    'Source Serif 4': [
        'source-serif-4-500-latin.woff2',
        'source-serif-4-latin-ext.woff2',
        'source-serif-4-vietnamese.woff2',
    ],
    'Source Serif 4 Italic': [
        'source-serif-4-italic-500-latin.woff2',
        'source-serif-4-italic-latin-ext.woff2',
        'source-serif-4-italic-vietnamese.woff2',
    ],
}

course = (APP / 'src/content/course.js').read_text()
chars = sorted({ch for ch in course if ord(ch) > 127})
failed = False
for family, files in FONTS.items():
    cmap = set()
    for f in files:
        p = APP / 'src/fonts' / f
        if not p.exists():
            print(f'MISSING FILE for {family}: {f}')
            failed = True
            continue
        cmap |= set(TTFont(p).getBestCmap())
    missing = [c for c in chars if ord(c) not in cmap]
    if missing:
        print(f'MISSING in {family}:', [f'{c} U+{ord(c):04X}' for c in missing])
        failed = True
print(f'checked {len(chars)} non-ASCII chars across {len(FONTS)} families')
sys.exit(1 if failed else 0)
```

- [ ] **Step 2: Run it — expect failure (files absent, and once Task 3 lands, chars uncovered)**

Run: `cd app && uvx --from fonttools --with brotli python3 scripts/check-font-coverage.py`
Expected now: `MISSING FILE` lines for the 6 not-yet-downloaded files, exit 1.

- [ ] **Step 3: Write the vendoring script**

```python
# app/scripts/vendor-font-subsets.py
"""Download latin-ext + vietnamese subsets from Google Fonts and print @font-face CSS.

Run: python3 scripts/vendor-font-subsets.py
One-time tool; kept for reproducibility.
"""
import re
import urllib.request
from pathlib import Path

UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
FAMILIES = [
    ('nunito-sans', 'normal', 'font-weight: 200 1000;\n  font-stretch: 100%;',
     'https://fonts.googleapis.com/css2?family=Nunito+Sans:opsz,wght@6..12,200..1000&display=swap',
     'Nunito Sans'),
    ('source-serif-4', 'normal', 'font-weight: 200 900;',
     'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,200..900&display=swap',
     'Source Serif 4'),
    ('source-serif-4-italic', 'italic', 'font-weight: 200 900;',
     'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@1,8..60,200..900&display=swap',
     'Source Serif 4'),
]
WANTED = ('latin-ext', 'vietnamese')
out_dir = Path(__file__).resolve().parent.parent / 'src/fonts'

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    return urllib.request.urlopen(req).read()

css_out = []
for slug, style, weight_css, api, family in FAMILIES:
    css = fetch(api).decode()
    # blocks look like: /* latin-ext */ @font-face { ... src: url(...woff2) ...; unicode-range: ...; }
    for subset, block in re.findall(r'/\* (\w[\w-]*) \*/\s*@font-face\s*\{(.*?)\}', css, re.S):
        if subset not in WANTED:
            continue
        url = re.search(r'url\((\S+?\.woff2)\)', block).group(1)
        urange = re.search(r'unicode-range:\s*([^;]+);', block).group(1).strip()
        fname = f'{slug}-{subset}.woff2'
        (out_dir / fname).write_bytes(fetch(url))
        css_out.append(
            f"/* {subset} — Yoruba orthography (ṣ ẹ ọ + tone marks) */\n"
            f"@font-face {{\n  font-family: '{family}';\n  font-style: {style};\n"
            f"  {weight_css}\n  font-display: swap;\n"
            f"  src: url(./{fname}) format('woff2');\n  unicode-range: {urange};\n}}")
        print('vendored', fname)
print('\n---- append to src/fonts/fonts.css ----\n')
print('\n'.join(css_out))
```

- [ ] **Step 4: Run it and append its CSS output to `app/src/fonts/fonts.css`**

Run: `cd app && python3 scripts/vendor-font-subsets.py`
Expected: six `vendored <name>.woff2` lines, then six `@font-face` blocks printed. Append those blocks verbatim to the end of `src/fonts/fonts.css`. Confirm `ls src/fonts/*.woff2 | wc -l` prints `12` (6 existing + 6 new).

Note: the italic latin subset stays declared at `font-weight: 500` (static file); the new italic subsets are variable and declare `200 900` — both resolve correctly per unicode-range.

- [ ] **Step 5: Re-run the coverage checker**

Run: `cd app && uvx --from fonttools --with brotli python3 scripts/check-font-coverage.py`
Expected: no `MISSING FILE`; chars currently in course.js (’ — é etc.) covered; exit 0. (The Yoruba chars arrive in Task 3; the checker runs again in Task 4.)

- [ ] **Step 6: Build to confirm the CSS parses and assets bundle**

Run: `cd app && npm run build 2>&1 | tail -3`
Expected: `files generated ... dist/sw.js` with no errors.

- [ ] **Step 7: Commit**

```bash
git add app/scripts app/src/fonts
git commit -m "Fonts: vendor latin-ext + vietnamese subsets for Yoruba orthography"
```

---

### Task 2: Update content-test pins and add the range guard (failing first)

`test/content.test.js` pins lesson count (43) and exact id order. The four new ids shift those pins; write the new expectations first so Task 3 turns them green.

**Files:**
- Modify: `app/test/content.test.js`

**Interfaces:**
- Consumes: `allLessons()`, `findLesson()`, `nameToMidi` (already imported in the file).
- Produces: pins expecting ids `labe-igi-orombo`, `bata-mi`, `ise-oluwa`, `tolotolo` appended to u3/u4/u5/u6; a range-guard test Task 3 must satisfy.

- [ ] **Step 1: Update the two pin tests**

In `app/test/content.test.js`, replace the test `'Course 2 completes the 43-lesson year (§9.4)'` with:

```js
test('the course completes the 47-lesson year (§9.4 + Yoruba tunes)', () => {
  assert.equal(lessons.length, 47)
  assert.equal(new Set(lessons.map(l => l.unitId)).size, 12)
  assert.deepEqual(lessons.map(l => l.id).slice(25), [
    'notes-cold', 'steps-and-skips', 'meet-g-position', 'ode-whole-theme',
    'the-bass-clef', 'walking-down-the-bass', 'merrily-left-hand', 'echo-games',
    'both-thumbs', 'drone-and-melody', 'au-clair-together', 'twinkle-together',
    'meet-f-sharp', 'meet-b-flat', 'london-bridge-in-g',
    'building-the-c-chord', 'c-and-g7', 'f-joins', 'saints-with-chords',
    'louds-and-softs', 'putting-on-polish', 'recital-day'
  ])
  // units that need polyphony declare it (SR-AUD-10 stages a-c)
  for (const l of lessons.filter(l => ['u9', 'u11'].includes(l.unitId))) {
    assert.ok(l.poly, `${l.id}: Units 9/11 require polyphonic listening`)
  }
})
```

Replace the expected array in the test `'Units 1-6 cover the 21-lesson v1 map in course order (§3.2)'` (keep its assertions style, rename to `'Units 1-6 cover the v1 map plus Yoruba tunes in course order (§3.2)'`) so the first-25 ids are:

```js
  assert.deepEqual(lessons.map(l => l.id).slice(0, 25), [
    'meet-the-keyboard', 'finding-middle-c', 'hands-say-hello',
    'middle-c-again', 'meet-d', 'meet-e', 'meet-f-and-g',
    'ode-to-joy', 'lightly-row', 'au-clair-de-la-lune', 'labe-igi-orombo',
    'long-and-short', 'playing-with-the-pulse', 'ode-in-time', 'hot-cross-buns', 'bata-mi',
    'meet-a-and-b', 'up-to-high-c', 'when-the-saints', 'twinkle', 'ise-oluwa',
    'left-hand-home', 'taking-turns', 'your-first-chord', 'tolotolo'
  ])
```

- [ ] **Step 2: Add the range-guard test at the end of the file**

```js
test('Yoruba tunes stay within the notes their unit has taught', () => {
  const TAUGHT = {
    'labe-igi-orombo': ['C4', 'D4', 'E4', 'F4', 'G4'],
    'bata-mi': ['C4', 'D4', 'E4', 'F4', 'G4'],
    'ise-oluwa': ['C4', 'D4', 'E4', 'F4', 'G4', 'A4'],
    'tolotolo': ['C3', 'D3', 'E3', 'F3', 'G3', 'C4', 'D4', 'E4', 'F4', 'G4']
  }
  for (const [id, allowed] of Object.entries(TAUGHT)) {
    const song = findLesson(id)
    assert.ok(song?.kind === 'song', `${id} exists as a song`)
    const midis = new Set(allowed.map(nameToMidi))
    for (const t of song.notes) {
      for (const name of (t.notes ?? [t.note])) {
        assert.ok(midis.has(nameToMidi(name)), `${id}: ${name} not taught by its unit`)
      }
    }
  }
})
```

- [ ] **Step 3: Run and verify the new expectations fail**

Run: `cd app && node --test test/content.test.js 2>&1 | grep -E "✔|✖" | head -20`
Expected: the two renamed pin tests and the range guard FAIL (`labe-igi-orombo` not found / length 43 ≠ 47); other tests pass.

- [ ] **Step 4: Commit the red tests**

```bash
git add app/test/content.test.js
git commit -m "Tests: pin 47-lesson course with Yoruba tunes (red until content lands)"
```

---

### Task 3: Add the four songs and recap-seed handoffs

**Files:**
- Modify: `app/src/content/course.js` (four insertions + four one-line `seed` edits)

**Interfaces:**
- Consumes: helpers `n(note, finger, beats?)` and existing unit arrays.
- Produces: song ids `labe-igi-orombo`, `bata-mi`, `ise-oluwa`, `tolotolo` used by Task 4's setlists and Task 2's tests.

All melodies are **drafts for family audition** — musically coherent settings of the widely-sung versions, constrained to each unit's taught notes.

- [ ] **Step 1: Unit 3 — append L'ábẹ́ igi ọ́rọ́mbọ́ after `au-clair-de-la-lune`**

Insert as the last lesson of unit `u3` (immediately before u3's closing `]`):

```js
        {
          id: 'labe-igi-orombo',
          title: 'L’ábẹ́ igi ọ́rọ́mbọ́',
          kind: 'song',
          card: 'Under the orange tree — a song from home, played where everyone gathers. Gentle steps, C up to G.',
          notes: [
            // L'á-bẹ́ i-gi ọ́-rọ́m-bọ́
            n('C4', 1), n('E4', 3), n('E4', 3), n('D4', 2), n('E4', 3), n('G4', 5), n('G4', 5),
            // ní-bẹ̀ la gbé ń ṣe-ré wa
            n('G4', 5), n('F4', 4), n('F4', 4), n('E4', 3), n('E4', 3), n('D4', 2), n('D4', 2),
            // i-nú wa dùn a-ra wa yá
            n('C4', 1), n('E4', 3), n('E4', 3), n('D4', 2), n('E4', 3), n('F4', 4), n('E4', 3), n('D4', 2),
            // l'á-bẹ́ i-gi ọ́-rọ́m-bọ́
            n('E4', 3), n('D4', 2), n('D4', 2), n('C4', 1), n('D4', 2), n('C4', 1), n('C4', 1)
          ],
          harmony: { 0: ['C3', 'G3'], 7: ['G3', 'B3'], 14: ['F3', 'A3'], 22: ['C3', 'G3'] },
          done: {
            title: 'You played L’ábẹ́ igi ọ́rọ́mbọ́.',
            line: 'Under the orange tree, start to finish — a song from home under your own fingers.'
          },
          recap: {
            summary: 'Today you played L’ábẹ́ igi ọ́rọ́mbọ́ — the orange-tree song, note by note.',
            seed: 'MOVED_FROM_AU_CLAIR' // see Step 5
          }
        }
```

- [ ] **Step 2: Unit 4 — append Bàtà mi a dún kòkòkà after `hot-cross-buns` (timed piece)**

```js
        {
          id: 'bata-mi',
          title: 'Bàtà mi a dún kòkòkà',
          kind: 'song',
          tempo: 72,
          card: 'The school-shoes song — ko ko ka! Every step lands right on the pulse.',
          notes: [
            // Bà-tà mi a dún kò-kò-kà
            n('E4', 3, 1), n('E4', 3, 1), n('E4', 3, 1), n('D4', 2, 1),
            n('C4', 1, 0.5), n('C4', 1, 0.5), n('E4', 3, 2),
            // Bà-tà mi a dún kò-kò-kà
            n('E4', 3, 1), n('E4', 3, 1), n('E4', 3, 1), n('D4', 2, 1),
            n('C4', 1, 0.5), n('C4', 1, 0.5), n('E4', 3, 2),
            // tí m bá kà-wé mi
            n('G4', 5, 1), n('G4', 5, 1), n('F4', 4, 1), n('F4', 4, 1), n('E4', 3, 1), n('E4', 3, 1),
            // bà-tà mi a dún kò-kò-kà
            n('E4', 3, 1), n('E4', 3, 1), n('E4', 3, 1), n('D4', 2, 1),
            n('C4', 1, 0.5), n('C4', 1, 0.5), n('C4', 1, 2)
          ],
          harmony: { 0: ['C3', 'G3'], 7: ['C3', 'G3'], 14: ['G3', 'B3'], 20: ['C3', 'G3'] },
          done: {
            title: 'You played Bàtà mi a dún kòkòkà.',
            line: 'Ko ko ka, right in time — those shoes have never sounded smarter.'
          },
          recap: {
            summary: 'Today your shoes made music — Bàtà mi, steady with the pulse.',
            seed: 'MOVED_FROM_HOT_CROSS_BUNS' // see Step 5
          }
        }
```

- [ ] **Step 3: Unit 5 — append Ìṣẹ́ Olúwa after `twinkle`**

```js
        {
          id: 'ise-oluwa',
          title: 'Ìṣẹ́ Olúwa',
          kind: 'song',
          card: 'The work of the Lord cannot be destroyed — a flowing song from home, patient and sure, reaching up to your new note A.',
          notes: [
            // Ì-ṣẹ́ O-lú-wa
            n('E4', 3), n('G4', 5), n('G4', 5), n('A4', 5), n('G4', 5),
            // kò lè bà-jẹ́ o
            n('G4', 5), n('E4', 3), n('D4', 2), n('E4', 3), n('C4', 1),
            // Ì-ṣẹ́ O-lú-wa
            n('E4', 3), n('G4', 5), n('G4', 5), n('A4', 5), n('G4', 5),
            // kò lè bà-jẹ́ o
            n('G4', 5), n('E4', 3), n('D4', 2), n('E4', 3), n('C4', 1),
            // kò lè bà-jẹ́ o
            n('G4', 5), n('G4', 5), n('E4', 3), n('D4', 2), n('C4', 1),
            // kò lè bà-jẹ́ o
            n('D4', 2), n('E4', 3), n('D4', 2), n('C4', 1), n('C4', 1)
          ],
          harmony: { 0: ['C3', 'G3'], 5: ['F3', 'A3'], 10: ['C3', 'G3'], 15: ['F3', 'A3'], 20: ['G3', 'B3'], 25: ['C3', 'G3'] },
          done: {
            title: 'You played Ìṣẹ́ Olúwa.',
            line: 'Kò lè bàjẹ́ — sung by your hands now, patient and true.'
          },
          recap: {
            summary: 'Today you played Ìṣẹ́ Olúwa — flowing, patient, unbreakable.',
            seed: 'MOVED_FROM_TWINKLE' // see Step 5
          }
        }
```

- [ ] **Step 4: Unit 6 — append Tòlótòló after `your-first-chord` (call and response, hands take turns)**

Single notes only (no `poly` — one hand sounds at a time, v1-mic friendly):

```js
        {
          id: 'tolotolo',
          title: 'Tòlótòló',
          kind: 'song',
          low: true,
          card: 'The turkey song — the right hand calls, the left hand answers, just like taking turns.',
          notes: [
            // call (right hand): Tò-ló-tò-ló ì-wo ló j'ẹ-ran
            n('G4', 5), n('E4', 3), n('G4', 5), n('E4', 3), n('D4', 2), n('E4', 3), n('D4', 2), n('C4', 1),
            // answer (left hand, an octave below)
            n('G3', 1), n('E3', 3), n('G3', 1), n('E3', 3), n('D3', 4), n('E3', 3), n('D3', 4), n('C3', 5),
            // short call
            n('E4', 3), n('E4', 3), n('D4', 2), n('C4', 1),
            // short answer
            n('E3', 3), n('E3', 3), n('D3', 4), n('C3', 5)
          ],
          harmony: { 0: ['C3', 'G3'], 8: ['C3', 'G3'], 16: ['G3', 'B3'], 20: ['C3', 'G3'] },
          done: {
            title: 'You played Tòlótòló.',
            line: 'Call and answer, both hands in the conversation — the turkey has nothing on you.'
          },
          recap: {
            summary: 'Today Tòlótòló strutted in — one hand calling, the other answering.',
            seed: 'MOVED_FROM_YOUR_FIRST_CHORD' // see Step 5
          }
        }
```

- [ ] **Step 5: Recap-seed handoffs (keep the "next time…" chain honest)**

For each predecessor lesson, MOVE its current `recap.seed` string verbatim into the new song's `recap.seed` (replacing the `MOVED_FROM_*` placeholder), then set the predecessor's `recap.seed` to the new line below:

| Predecessor | New predecessor `seed` |
|---|---|
| `au-clair-de-la-lune` | `'Next time: a song from home — under the orange tree.'` |
| `hot-cross-buns` | `'Next time your shoes make music: bàtà mi a dún kò kò kà.'` |
| `twinkle` | `'Next time: Ìṣẹ́ Olúwa — a song from home that flows like water.'` |
| `your-first-chord` | `'Next time the hands hold a little conversation: Tòlótòló.'` |

Verify no `MOVED_FROM_` remains: `grep -c MOVED_FROM_ src/content/course.js` prints `0`.

- [ ] **Step 6: Run the content tests — the Task 2 pins go green**

Run: `cd app && node --test test/content.test.js 2>&1 | grep -E "✔|✖"`
Expected: ALL pass, including the 47-lesson pin and the range guard.

- [ ] **Step 7: Run the full suite (E2E course harness walks the new songs automatically)**

Run: `cd app && npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: `fail 0`. If the E2E harness fails on `bata-mi`, check its beat values — timed songs need every note to carry a beats argument.

- [ ] **Step 8: Commit**

```bash
git add app/src/content/course.js app/test/content.test.js
git commit -m "Course: four Yoruba tunes as first-class songs in units 3-6 (audition-gated drafts)"
```

---

### Task 4: Recital pools, REQUIREMENTS.md, font re-check

**Files:**
- Modify: `app/src/content/course.js` (both setlist `from:` arrays)
- Modify: `REQUIREMENTS.md` (§3.2)

**Interfaces:**
- Consumes: song ids from Task 3.
- Produces: recital eligibility; updated source-of-truth doc.

- [ ] **Step 1: Add the four ids to both setlist pools**

In the `putting-on-polish` and `recital-day` lessons, extend each `from:` array (after `'saints-with-chords'`):

```js
            'labe-igi-orombo', 'bata-mi', 'ise-oluwa', 'tolotolo'
```

- [ ] **Step 2: Run the setlist resolvability test**

Run: `cd app && node --test test/content.test.js 2>&1 | grep -E "setlist|✖"`
Expected: `✔ setlist lessons pick from real, resolvable songs`, no failures.

- [ ] **Step 3: Update REQUIREMENTS.md §3.2**

Add one line under each unit's list using letter-suffixed numbers (existing cross-references like "lessons 19–20" stay valid):

- Unit 3, after item 10: `10a. *L'ábẹ́ igi ọ́rọ́mbọ́* — "under the orange tree"; a song from home, stepwise in C position.`
- Unit 4, after item 14: `14a. *Bàtà mi a dún kòkòkà* — the school-shoes rhythm song, played fully in time (~72 BPM).`
- Unit 5, after item 18: `18a. *Ìṣẹ́ Olúwa* — a flowing song from home reaching the new note A; gains soft voicings.`
- Unit 6, after item 21: `21a. *Tòlótòló* — call-and-response between the hands, one hand sounding at a time.`

And add this sentence at the end of the §3.2 intro paragraph: `Yoruba songs from home are first-class repertoire throughout — the family is Nigerian first.`

- [ ] **Step 3b: Confirm no SR pins fixed lesson counts**

Run: `cd "/Users/ope_d_coder/projects/VIBE CODING AGENTIC ENGINEER/Home_Piano_Teacher" && grep -n "21-lesson\|43-lesson\|43 lessons\|21 lessons" SYSTEM_REQUIREMENTS.md PLAN.md`
Expected: no hits that mandate an exact count as a requirement. If a hit is a requirement (not narrative), update it to 47 in the same commit; narrative mentions may stay.

- [ ] **Step 4: Re-run the font coverage check (now that Yoruba strings exist in course.js)**

Run: `cd app && uvx --from fonttools --with brotli python3 scripts/check-font-coverage.py`
Expected: `all covered` / exit 0. If a char is missing, it will be named with its codepoint — vendor the subset that contains it (re-run Task 1 Step 4).

- [ ] **Step 5: Full suite + build**

Run: `cd app && npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)" && npm run build 2>&1 | tail -2`
Expected: `fail 0`; build completes.

- [ ] **Step 6: Commit**

```bash
git add app/src/content/course.js REQUIREMENTS.md
git commit -m "Yoruba tunes join recital pools; REQUIREMENTS course map updated"
```

---

### Task 5: In-app verification + family audition (USER GATE)

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `cd app && npx vite --port 5199 --strictPort` (background)

- [ ] **Step 2: Automated visual pass (Playwright on http://localhost:5199)**

For each of the four songs (via its home song-card; skip warm-up/practice offers):
- Title renders in the serif face with correct diacritics on the home card, play header, and (for any completed profile) recital setlist picker. Screenshot each; look for fallback-font glyph mismatches (different stroke weight mid-word = fallback).
- Tap through the full melody with the tap keyboard (dispatch `pointerdown` per key, using each song's note letters); completion overlay appears.
- `bata-mi` only: confirm the pulse dot ticks, tempo buttons show, and the completion card shows the steadiness timeline.

- [ ] **Step 3: Family audition (the gate)**

Ask the user to open each tune and tap "♪ Hear it first", and answer per tune: *"Is this how your family sings it?"* Collect corrections as note-level edits (e.g. "line 2 goes down not up", "the kò-kò-kà is on one note"). Apply corrections to `course.js`, re-run `npm test`, and repeat until all four pass audition. **Do not proceed to Task 6 without explicit sign-off on all four tunes.**

- [ ] **Step 4: Commit any audition corrections**

```bash
git add app/src/content/course.js
git commit -m "Yoruba tunes: melody corrections from family audition"
```

---

### Task 6: Push and deploy (USER GATE for the production deploy)

- [ ] **Step 1: Push once**

```bash
cd "/Users/ope_d_coder/projects/VIBE CODING AGENTIC ENGINEER/Home_Piano_Teacher" && git push origin main
```

- [ ] **Step 2: Immediately re-deploy `web` from a staging dir (ask the user to confirm the production deploy first)**

```bash
STAGE=$(mktemp -d)/web-deploy && mkdir -p "$STAGE"
rsync -a --exclude node_modules --exclude dist --exclude dev-dist \
  "/Users/ope_d_coder/projects/VIBE CODING AGENTIC ENGINEER/Home_Piano_Teacher/app/" "$STAGE/"
cd "$STAGE" && railway link --project arietta && railway up --service web --ci
```

Expected: `Deploy complete`.

- [ ] **Step 3: Verify production**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://web-production-415a7.up.railway.app/
```
Expected: `200`. Then fetch the site's hashed JS bundle and `grep -c "labe-igi-orombo"` → `1` or more.
