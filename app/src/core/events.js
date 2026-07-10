/** NoteEvent factory (SR-EVT-01). Every input source normalizes to this shape. */

export function noteEvent({ pitch, source, timestamp, confidence = 1, velocity }) {
  if (!(pitch >= 48 && pitch <= 96)) throw new RangeError(`pitch ${pitch} outside MIDI 48-96`)
  const e = { pitch, source, confidence, timestamp }
  if (velocity !== undefined) e.velocity = velocity
  return e
}

/** NoteSetEvent factory (SR-EVT-03): simultaneous pitches within a detection frame. */
export function noteSetEvent({ pitches, source, timestamp, confidence = 1 }) {
  const set = [...new Set(pitches)].sort((a, b) => a - b)
  if (set.length < 2) throw new RangeError('a NoteSetEvent carries at least two pitches')
  for (const p of set) if (!(p >= 48 && p <= 96)) throw new RangeError(`pitch ${p} outside MIDI 48-96`)
  return { pitches: set, source, confidence, timestamp }
}

/** Uniform pitch access so consumers need not branch on the event shape. */
export function eventPitches(ev) {
  return ev.pitches ?? [ev.pitch]
}
