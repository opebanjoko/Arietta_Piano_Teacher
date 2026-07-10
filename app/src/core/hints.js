/**
 * Directional hint text (the prototype's hintFor, driven by VOICE data).
 * Never negative: a softener, what was heard, and where the target lives.
 */
import { letter, letterIn, isBlack, pitchClass, whiteIndex } from './notes.js'

function fill(template, vals) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vals[k])
}

export function hintText({ heard, target, misses, inSong, voice, flats = false }) {
  const soft = voice.softeners[Math.max(0, misses - 1) % voice.softeners.length]
  const vals = { soft, heard: letterIn(heard, flats), target: letterIn(target, flats) }

  // black-key target (Unit 10): name the white key it leans on
  if (isBlack(target)) {
    vals.side = flats ? 'left' : 'right'
    vals.anchor = letter(flats ? target + 1 : target - 1)
    return fill(voice.hints.blackTarget, vals)
  }

  if (isBlack(heard)) return fill(voice.hints.blackKey, vals)

  if (pitchClass(heard) === pitchClass(target)) {
    vals.highlow = heard > target ? 'high' : 'low'
    vals.dir = heard > target ? 'left' : 'right'
    return fill(voice.hints.octaveSlip, vals)
  }

  const hi = whiteIndex(heard), ti = whiteIndex(target)
  vals.dir = ti > hi ? 'right' : 'left'
  const d = Math.abs(ti - hi)
  if (d >= voice.distances.length) return fill(voice.hints.far, vals)
  vals.distance = voice.distances[d]
  return fill(inSong ? voice.hints.directionalSong : voice.hints.directional, vals)
}

const listLetters = (midis) => {
  const ls = midis.map(letter)
  return ls.length <= 1 ? ls.join('') : `${ls.slice(0, -1).join(', ')} and ${ls.at(-1)}`
}

/**
 * Chord hints (SR-AUD-10 lessons): a stray note names itself and what the
 * chord wants; a re-strike with nothing new points at who is still hiding.
 */
export function chordHintText({ wrong, haveMidis, missingMidis, targetMidis, misses, voice }) {
  const soft = voice.softeners[Math.max(0, misses - 1) % voice.softeners.length]
  if (wrong !== undefined) {
    return fill(voice.hints.chordExtra, { soft, extra: letter(wrong), want: listLetters(targetMidis) })
  }
  return fill(voice.hints.chordMissing, { soft, have: listLetters(haveMidis), missing: listLetters(missingMidis) })
}
