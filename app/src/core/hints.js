/**
 * Directional hint text (the prototype's hintFor, driven by VOICE data).
 * Never negative: a softener, what was heard, and where the target lives.
 */
import { letter, isBlack, pitchClass, whiteIndex } from './notes.js'

function fill(template, vals) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vals[k])
}

export function hintText({ heard, target, misses, inSong, voice }) {
  const soft = voice.softeners[Math.max(0, misses - 1) % voice.softeners.length]
  const vals = { soft, heard: letter(heard), target: letter(target) }

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
