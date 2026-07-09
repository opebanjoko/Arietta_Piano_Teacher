/** NoteEvent factory (SR-EVT-01). Every input source normalizes to this shape. */

export function noteEvent({ pitch, source, timestamp, confidence = 1, velocity }) {
  if (!(pitch >= 48 && pitch <= 96)) throw new RangeError(`pitch ${pitch} outside MIDI 48-96`)
  const e = { pitch, source, confidence, timestamp }
  if (velocity !== undefined) e.velocity = velocity
  return e
}
