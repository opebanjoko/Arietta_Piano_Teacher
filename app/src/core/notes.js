/** Note math over MIDI numbers (SR-EVT-01: the app's pitch range is MIDI 48-96). */

const LETTERS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_LETTERS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const BLACK_PCS = new Set([1, 3, 6, 8, 10])
// white-key ordinal within an octave, by pitch class (C D E F G A B -> 0..6)
const WHITE_ORD = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 }

export function nameToMidi(name) {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(name)
  const semis = m[1].endsWith('b') ? FLAT_LETTERS.indexOf(m[1]) : LETTERS.indexOf(m[1])
  return (Number(m[2]) + 1) * 12 + semis
}

export function midiToName(midi) {
  return letter(midi) + (Math.floor(midi / 12) - 1)
}

/** Student-facing label without octave: 'C', 'C#', ... */
export function letter(midi) {
  return LETTERS[midi % 12]
}

/** Label honouring the lesson's accidental preference ('Bb' in F position). */
export function letterIn(midi, flats = false) {
  return (flats ? FLAT_LETTERS : LETTERS)[midi % 12]
}

/**
 * Staff placement: black keys sit on their natural letter's line with an
 * accidental glyph (sharps anchor below, flats anchor above).
 */
export function staffPos(midi, flats = false) {
  const wi = whiteIndex(midi)
  if (wi !== null) return { line: wi, accidental: null }
  return flats
    ? { line: whiteIndex(midi + 1), accidental: 'b' }
    : { line: whiteIndex(midi - 1), accidental: '#' }
}

export function pitchClass(midi) {
  return midi % 12
}

export function isBlack(midi) {
  return BLACK_PCS.has(midi % 12)
}

export function freq(midi) {
  return 440 * 2 ** ((midi - 69) / 12)
}

/** Absolute white-key index (for "two keys to the left" hints); null for black keys. */
export function whiteIndex(midi) {
  const ord = WHITE_ORD[midi % 12]
  return ord === undefined ? null : Math.floor(midi / 12) * 7 + ord
}
