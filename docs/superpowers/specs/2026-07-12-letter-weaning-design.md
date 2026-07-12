# Letter weaning — design

2026-07-12. Approved approach: **A — derived novelty**. Letters are training wheels:
fully on while keys are being learned, then, from Unit 7 ("Reading the Map") onward,
a note's letter appears only where it is genuinely new — everywhere else the student
reads notation.

## Why

Today letters are binary: three Unit 7 lessons set `plain: true`, and every other
lesson — including bass clef, black keys, chords, and recital pieces in Units 8–12 —
shows full letter labels on the staff and the tap keyboard. Advanced students read
letters, not music. Hand-tagged flags drifted once; a derived rule cannot.

## The rule

1. **Units 1–6: letters everywhere** (unchanged). This is the introduction phase —
   letter names and key geography are the point.
2. **Unit 7 onward: letters only on novel notes.** A (pitch, clef) pair is *novel* in
   the first lesson (course order) where it appears on the staff. The lesson that
   introduces it labels those notes — and only those; already-known notes in the same
   lesson are plain. A new clef makes known pitches novel again (first bass-clef
   lessons label their notes; the same pitches back on treble do not).
3. **Struggle rescue:** after 2 misses on the current target (same threshold as the
   existing key-glow hint), the current note's letter appears on the staff and the
   glowing key keeps its letter (already the case). The reveal disappears once the
   note is played. Voice hints keep naming letters as today.
4. **Keyboard follows the staff:** from Unit 7 on, key labels show only for the
   lesson's novel notes (plus the glow-hint key). Units 1–6 keep full key labels.
5. **Ephemeral lessons:** practice-pack and warm-up replays inherit the policy of the
   unit they draw from. Reading warm-ups (SR-CRS-11 "read cold") are always
   novel-only — today they show letters, which contradicts their own pedagogy; this
   fixes that.
6. **Free play:** letters on (exploration, not reading practice), subject to the
   override below.

## Parent override

The per-player Settings toggle becomes three-way, stored in the existing `labels`
setting:

| Stored value | Meaning |
|---|---|
| `'auto'` / unset | The progression above (new default) |
| `true` | Letters always on, everywhere (today's "on") |
| `false` | Letters always off, everywhere (today's "off") |

Existing saved values keep their meaning; players who never touched the toggle get
Auto.

## Implementation shape

- **`core/wean.js` (new, pure):** scans `allLessons()` once; exposes
  `noveltyFor(lesson)` → `Set<midi>` of staff-rendered pitches first seen in that
  lesson (keyed by pitch+clef), and `letterPolicy(lesson)` → `'all' | 'novel-only'`
  (unit index < 7 → `'all'`; ephemeral lessons resolve via their source unit;
  reading warm-ups → `'novel-only'`). Staff-rendered pitches = drill `play`/`dynamics`
  step targets, `reading-snippet` pools, and song `notes`.
- **`Staff.jsx`:** the `plain` boolean becomes a per-note `letter` decision passed in
  the note entries (`showLetter` per entry); adds the struggle reveal on the current
  entry when the screen says so.
- **`Keyboard.jsx`:** `showLabels` boolean becomes `labelMidis: Set | 'all' | 'none'`.
- **`Lesson.jsx` / `Song.jsx` / `app.jsx`:** compute per-note letter visibility from
  `letterPolicy` + `noveltyFor` + miss count + the three-way setting; pass through.
- **`course.js`:** remove the three now-redundant `plain: true` flags. The `plain`
  field disappears entirely (derived policy replaces it).
- **`Settings.jsx`:** three-way control (Auto / Always on / Always off) in the
  existing "look" card, with a one-line explanation of Auto in Arietta's voice.
- **REQUIREMENTS.md §3.5:** add the weaning ladder as a pedagogy rule; update the
  lesson-22 line ("letter labels fade on known notes") to reference the derived rule.

## Not changing

- Voice hints (spoken letters) — rescue language stays.
- Finger numbers — always shown (SR-CRS-05), unrelated to reading letters.
- Units 1–6 visuals.
- The glow-hint key showing its letter while glowing.

## Testing

- `wean.test.js`: first bass-clef lesson's novelty = its note set; "Meet F♯" novelty =
  {F♯4…}; London Bridge novelty = ∅; unit 3 lesson policy = `'all'`; notes-cold =
  `'novel-only'`; reading warm-up = `'novel-only'`.
- Settings mapping: `'auto'`/`true`/`false` behaviors; legacy values unchanged.
- Struggle reveal: staff entry gains its letter at 2 misses, loses it on success
  (component-level state derivation test if practical, else covered in E2E).
- Existing E2E course harness must stay green (letters are visual-only — no grading
  changes).

## Acceptance

1. A Unit 3 student sees exactly today's experience.
2. In "The bass clef" (Unit 8), bass notes are labeled; in "Merrily — left hand",
   nothing is.
3. "Meet F♯" labels only F♯; "London Bridge in G" is pure notation.
4. Missing the same note twice in a plain song reveals that note's letter until played.
5. Settings Auto/Always on/Always off behave as specified; profiles that explicitly
   chose on (`true`) or off (`false`) keep that choice; everyone else moves to Auto —
   the weaning is the new default experience.
6. Full suite green; REQUIREMENTS.md updated.
