/**
 * Letter weaning (§3.5): letters are training wheels. Units 1-6 show them
 * everywhere; from Unit 7 ("Reading the Map") a letter appears only where a
 * (clef, pitch) pair is genuinely new — in the lesson that introduces it.
 * Derived from course order so it can never drift back to letters-everywhere.
 */
import { allLessons } from '../content/course.js'
import { nameToMidi } from './notes.js'

const WEAN_FROM_UNIT = 7
const clefOf = (lesson) => lesson.clef ?? 'treble'

/** Note names a lesson puts on the staff: song notes, play/dynamics targets, reading pools. */
function staffNames(lesson) {
  const out = []
  const push = (t) => { for (const nm of t.notes ?? [t.note]) out.push(nm) }
  if (lesson.kind === 'song') lesson.notes.forEach(push)
  for (const s of lesson.steps ?? []) {
    if (s.kind === 'play' || s.kind === 'dynamics') s.targets.forEach(push)
    if (s.kind === 'reading-snippet') s.pool.forEach(push)
  }
  return out
}

let cache = null
/** "clef:midi" -> id of the lesson (course order) that first shows it. */
function firstSeen() {
  if (cache) return cache
  cache = new Map()
  for (const l of allLessons()) {
    for (const nm of staffNames(l)) {
      const k = `${clefOf(l)}:${nameToMidi(nm)}`
      if (!cache.has(k)) cache.set(k, l.id)
    }
  }
  return cache
}

const unitIndex = (lesson) => Number(/^u(\d+)$/.exec(lesson?.unitId ?? '')?.[1] ?? NaN)

/** 'all' (letters everywhere) or 'novel-only' (letters only on new notes). */
export function letterPolicy(lesson) {
  if (lesson.readCold) return 'novel-only' // fresh reading is read cold by design
  const u = unitIndex(lesson)
  return Number.isNaN(u) || u < WEAN_FROM_UNIT ? 'all' : 'novel-only'
}

/** Midis whose letters this lesson may still show under 'novel-only'. */
export function noveltyFor(lesson) {
  const fs = firstSeen()
  const set = new Set()
  for (const nm of staffNames(lesson)) {
    const midi = nameToMidi(nm)
    if (fs.get(`${clefOf(lesson)}:${midi}`) === lesson.id) set.add(midi)
  }
  return set
}

/**
 * What the UI shows for a per-player labels setting + lesson:
 * 'all' | 'none' | Set of midis. lesson null (free play) reads as 'all'.
 */
export function letterMidis(labelsSetting, lesson) {
  if (labelsSetting === false) return 'none'
  if (labelsSetting === true || !lesson) return 'all'
  return letterPolicy(lesson) === 'all' ? 'all' : noveltyFor(lesson)
}
