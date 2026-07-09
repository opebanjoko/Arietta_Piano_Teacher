/**
 * Course engine (SR-CRS-02..04): pure state machines over NoteEvents.
 * No timers, no DOM, no source branching (SR-EVT-02) — events are consumed
 * by pitch alone. The UI owns pacing (delays between stepdone and advance).
 */
import { nameToMidi, pitchClass } from './notes.js'
import { hintText } from './hints.js'
import { VOICE } from '../content/voice.js'

// deterministic per-lesson offset so encouragements vary between lessons
function hash(s) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

function encouragement(lesson, used, voice) {
  const pool = voice.encouragements
  return pool[(hash(lesson.id) + used) % pool.length]
}

// ---- drills ----

export function startDrill(lesson) {
  return {
    kind: 'drill', lessonId: lesson.id,
    stepIndex: 0, seqPos: 0, misses: 0,
    phase: 'working', feedback: null, encUsed: 0
  }
}

export function drillNote(state, lesson, ev, voice = VOICE) {
  if (state.phase !== 'working') return state
  const step = lesson.steps[state.stepIndex]
  if (step.kind !== 'play') return state

  const target = nameToMidi(step.targets[state.seqPos].note)
  const matched = step.match === 'pitch-class'
    ? pitchClass(ev.pitch) === pitchClass(target)
    : ev.pitch === target

  if (!matched) {
    const misses = state.misses + 1
    const text = hintText({ heard: ev.pitch, target, misses, inSong: false, voice })
    return { ...state, misses, feedback: { kind: 'hint', text } }
  }

  const seqPos = state.seqPos + 1
  if (seqPos < step.targets.length) {
    return { ...state, seqPos, misses: 0, feedback: null }
  }
  return {
    ...state, seqPos, misses: 0, phase: 'stepdone',
    feedback: { kind: 'good', text: encouragement(lesson, state.encUsed, voice) },
    encUsed: state.encUsed + 1
  }
}

/** Advance past an 'info' step (the student tapped continue). */
export function drillContinue(state, lesson) {
  if (state.phase !== 'working' || lesson.steps[state.stepIndex].kind !== 'info') return state
  return advance(state, lesson)
}

/** Advance after 'stepdone' (the UI paced the encouragement moment). */
export function drillAdvance(state, lesson) {
  if (state.phase !== 'stepdone') return state
  return advance(state, lesson)
}

function advance(state, lesson) {
  const stepIndex = state.stepIndex + 1
  if (stepIndex >= lesson.steps.length) {
    return { ...state, phase: 'done', feedback: null }
  }
  return { ...state, stepIndex, seqPos: 0, misses: 0, phase: 'working', feedback: null }
}

// ---- songs ----

export function startSong(lesson) {
  return {
    kind: 'song', lessonId: lesson.id,
    pos: 0, misses: 0, slips: 0, cleanCount: 0, done: false, hint: null, mention: null
  }
}

export function songNote(state, lesson, ev, voice = VOICE) {
  if (state.done) return state
  const target = nameToMidi(lesson.notes[state.pos].note)

  // pitch class in any octave counts, so the music keeps flowing (SR-CRS-03)
  if (pitchClass(ev.pitch) !== pitchClass(target)) {
    const misses = state.misses + 1
    const hint = hintText({ heard: ev.pitch, target, misses, inSong: true, voice })
    return { ...state, misses, hint }
  }

  const slips = state.slips + (ev.pitch !== target ? 1 : 0)
  const cleanCount = state.cleanCount + (state.misses === 0 ? 1 : 0)
  const pos = state.pos + 1
  if (pos < lesson.notes.length) {
    return { ...state, pos, slips, cleanCount, misses: 0, hint: null }
  }
  return {
    ...state, pos, slips, cleanCount, misses: 0, hint: null, done: true,
    mention: slips >= 3 ? voice.song.octaveMention : null
  }
}

// ---- linear unlocking (SR-CRS-04) ----

/** Map of lesson id -> 'complete' | 'next' | 'locked' | 'peek' in course order. */
export function lessonStates(lessons, completedIds) {
  const states = new Map()
  let nextFound = false
  for (const l of lessons) {
    if (completedIds.has(l.id)) {
      states.set(l.id, 'complete')
    } else if (!nextFound) {
      states.set(l.id, 'next')
      nextFound = true
    } else {
      states.set(l.id, l.sneakPeek ? 'peek' : 'locked')
    }
  }
  return states
}
