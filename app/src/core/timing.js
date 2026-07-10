/**
 * Timing grid (SR-CRS-08): note onsets judged against the metronome grid,
 * with tempo-scaled tolerance. Output is qualitative words only — internal
 * math may count, but no number ever reaches the UI layer.
 */

export const beatMs = (bpm) => 60000 / bpm

// Tolerance scales with the beat: generous at 60 BPM (a quarter of a second
// each way), narrowing as the tempo rises.
const TOLERANCE = 0.25
// A gap this many beats past due is a taken breath, not lateness — judged as
// a pause and never held against the student (patience is structural).
const PAUSE_BEATS = 1.5

/**
 * Judge one inter-onset gap against the grid.
 * expectedMs = authored beats since the previous note * beatMs(bpm).
 * Returns 'on' | 'early' | 'late' | 'pause'.
 */
export function judgeGap(actualMs, expectedMs, bpm) {
  if (actualMs > expectedMs + PAUSE_BEATS * beatMs(bpm)) return 'pause'
  const off = actualMs - expectedMs
  if (Math.abs(off) <= TOLERANCE * beatMs(bpm)) return 'on'
  return off < 0 ? 'early' : 'late'
}

const fill = (t, vals) => t.replace(/\{(\w+)\}/g, (_, k) => vals[k])

/**
 * One warm sentence for the completion moment. verdicts is aligned to note
 * indices ('on' | 'early' | 'late'; null/'pause' where nothing was judged).
 * Null when nothing was judged at all.
 */
export function timingSummary(verdicts, voice) {
  const judged = verdicts
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v === 'on' || v === 'early' || v === 'late')
  if (!judged.length) return null

  const off = judged.filter(({ v }) => v !== 'on')
  if (!off.length) return voice.timing.steady
  if (off.length === 1) {
    const { v, i } = off[0]
    return fill(voice.timing.oneOff, {
      word: voice.timing.words[v],
      ordinal: voice.timing.ordinals[i] ?? voice.timing.ordinals.at(-1)
    })
  }
  const early = off.filter(({ v }) => v === 'early').length
  const late = off.length - early
  if (early > late * 2) return voice.timing.early
  if (late > early * 2) return voice.timing.late
  return voice.timing.mixed
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x))

/**
 * Points for the steadiness view (SR-CRS-09): judged notes only, offset in
 * beats clamped to a gentle band. Rendering stays number-free — these values
 * become positions, never labels.
 */
export function steadinessPoints(verdicts, offsets) {
  return verdicts
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v === 'on' || v === 'early' || v === 'late')
    .map(({ v, i }) => ({ i, off: clamp(offsets[i] ?? 0, -0.6, 0.6), verdict: v }))
}
