/**
 * Course engine (SR-CRS-02..04): pure state machines over NoteEvents.
 * No timers, no DOM, no source branching (SR-EVT-02) — events are consumed
 * by pitch alone. The UI owns pacing (delays between stepdone and advance).
 */
import { nameToMidi, pitchClass } from './notes.js'
import { hintText, chordHintText } from './hints.js'
import { eventPitches } from './events.js'
import { beatMs, judgeGap, timingSummary } from './timing.js'
import { VOICE } from '../content/voice.js'

// ---- chord gather (SR-AUD-10 / SR-EVT-03) ----
// A chord target may be rolled: pitches accumulate across events (taps, MIDI
// singles, mic sets alike) inside this window before the chord must be whole.
const CHORD_WINDOW_MS = 2500

const entryMidis = (entry) => (entry.notes ?? [entry.note]).map(nameToMidi)

/**
 * Advance one target entry (single note or chord) by one event.
 * Chord members always match exact midi - hands together needs the octave.
 * Returns { wrong } | { done } | { gather, stuck } (stuck: nothing new).
 */
function entryProgress(entry, gather, ev, pc) {
  const targets = entryMidis(entry)
  const byMidi = entry.notes ? true : !pc
  const hits = (p, t) => (byMidi ? t === p : pitchClass(t) === pitchClass(p))
  const open = gather && ev.timestamp - gather.startTs <= CHORD_WINDOW_MS ? gather.pitches : []
  const sat = new Set(open)
  let added = false
  for (const p of eventPitches(ev)) {
    const t = targets.find((t) => !sat.has(t) && hits(p, t)) ?? targets.find((t) => hits(p, t))
    if (t === undefined) return { wrong: p, haveMidis: [...sat], targetMidis: targets }
    if (!sat.has(t)) added = true
    sat.add(t)
  }
  if (sat.size === targets.length) return { done: true }
  return {
    gather: { pitches: [...sat], startTs: open.length ? gather.startTs : ev.timestamp },
    stuck: !added,
    haveMidis: [...sat],
    missingMidis: targets.filter((t) => !sat.has(t)),
    targetMidis: targets
  }
}

/** Practice tempos (SR-CRS-09): every timed piece playable slower, all equally celebrated. */
export const TEMPO_CHOICES = [
  { id: 'slow', mult: 0.6 },
  { id: 'medium', mult: 0.8 },
  { id: 'full', mult: 1 }
]

export function atTempo(lesson, choiceId) {
  const c = TEMPO_CHOICES.find(t => t.id === choiceId)
  if (!lesson.tempo || !c || c.mult === 1) return lesson
  return { ...lesson, tempo: Math.round(lesson.tempo * c.mult) }
}

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
    stepIndex: 0, seqPos: 0, misses: 0, gather: null,
    phase: 'working', feedback: null, encUsed: 0,
    lastOnset: null, verdicts: [], offsets: []
  }
}

/** Grid verdict + signed offset (in beats) for a correct onset, or null (SR-CRS-08). */
function judgeOnset(state, tempo, prevBeats, timestamp) {
  if (!tempo || state.lastOnset === null || timestamp == null) return null
  const expectedMs = (prevBeats ?? 1) * beatMs(tempo)
  const actualMs = timestamp - state.lastOnset
  return {
    verdict: judgeGap(actualMs, expectedMs, tempo),
    offBeats: (actualMs - expectedMs) / beatMs(tempo)
  }
}

const liveWord = (verdict, voice) =>
  verdict && verdict !== 'pause' ? { kind: 'pulse', text: voice.timing.live[verdict] } : null

export function drillNote(state, lesson, ev, voice = VOICE) {
  if (state.phase !== 'working') return state
  const step = lesson.steps[state.stepIndex]
  if (step.kind !== 'play' && step.kind !== 'ear-echo') return state

  const entry = step.targets[state.seqPos]
  const r = entryProgress(entry, state.gather, ev, step.match === 'pitch-class')

  if (r.wrong !== undefined) {
    const misses = state.misses + 1
    const text = entry.notes
      ? chordHintText({ wrong: r.wrong, targetMidis: r.targetMidis, misses, voice })
      : hintText({ heard: r.wrong, target: r.targetMidis[0], misses, inSong: false, voice })
    return { ...state, misses, gather: null, feedback: { kind: 'hint', text } }
  }
  if (!r.done) {
    const feedback = r.stuck
      ? { kind: 'hint', text: chordHintText({ haveMidis: r.haveMidis, missingMidis: r.missingMidis, misses: state.misses, voice }) }
      : null
    return { ...state, gather: r.gather, feedback }
  }

  const tempo = step.timed ? lesson.tempo : null
  const judged = judgeOnset(state, tempo, step.targets[state.seqPos - 1]?.beats, ev.timestamp)
  const verdict = judged?.verdict ?? null
  const verdicts = verdict ? [...state.verdicts] : state.verdicts
  if (verdict) verdicts[state.seqPos] = verdict
  const timed = { lastOnset: tempo ? ev.timestamp : null, verdicts }

  const seqPos = state.seqPos + 1
  if (seqPos < step.targets.length) {
    return { ...state, ...timed, seqPos, misses: 0, gather: null, feedback: liveWord(verdict, voice) }
  }
  return {
    ...state, ...timed, seqPos, misses: 0, gather: null, phase: 'stepdone',
    feedback: {
      kind: 'good',
      text: (tempo && timingSummary(verdicts, voice)) || encouragement(lesson, state.encUsed, voice)
    },
    encUsed: state.encUsed + 1
  }
}

const fill = (t, vals) => t.replace(/\{(\w+)\}/g, (_, k) => vals[k])

/**
 * A clap — mic onset or key tap — during a 'rhythm-clap' step (SR-AUD-14,
 * SR-CRS-10). The first clap anchors the grid; step.pattern lists the beats
 * between consecutive claps. A long pause restarts quietly, off-grid claps
 * get one kind retry line naming the clap and the direction.
 */
export function drillClap(state, lesson, ev, voice = VOICE) {
  if (state.phase !== 'working') return state
  const step = lesson.steps[state.stepIndex]
  if (step.kind !== 'rhythm-clap') return state

  if (state.seqPos === 0) {
    return { ...state, seqPos: 1, lastOnset: ev.timestamp, verdicts: [], offsets: [], feedback: null }
  }

  const expected = step.pattern[state.seqPos - 1] * beatMs(lesson.tempo)
  const verdict = judgeGap(ev.timestamp - state.lastOnset, expected, lesson.tempo)
  if (verdict === 'pause') {
    // the student stopped to think and began again — start the pattern fresh, silently
    return { ...state, seqPos: 1, lastOnset: ev.timestamp, verdicts: [], offsets: [], feedback: null }
  }

  const verdicts = [...state.verdicts]
  verdicts[state.seqPos] = verdict
  const seqPos = state.seqPos + 1
  if (seqPos <= step.pattern.length) {
    return { ...state, seqPos, lastOnset: ev.timestamp, verdicts, feedback: null }
  }

  const off = verdicts.map((v, i) => ({ v, i })).find(({ v }) => v === 'early' || v === 'late')
  if (off) {
    return {
      ...state, seqPos: 0, lastOnset: null, verdicts: [], offsets: [], misses: state.misses + 1,
      feedback: {
        kind: 'hint',
        text: fill(voice.rhythm.retry, {
          ordinal: voice.timing.ordinals[off.i] ?? voice.timing.ordinals.at(-1),
          word: voice.timing.words[off.v]
        })
      }
    }
  }
  return {
    ...state, seqPos, lastOnset: null, misses: 0, phase: 'stepdone',
    feedback: { kind: 'good', text: voice.rhythm.done }
  }
}

/** Advance past an 'info' or 'watch-me' step (the student tapped continue). */
export function drillContinue(state, lesson) {
  if (state.phase !== 'working') return state
  const kind = lesson.steps[state.stepIndex].kind
  if (kind !== 'info' && kind !== 'watch-me') return state
  return advance(state, lesson)
}

/** Answer an 'ear-choice' step by tapped choice (SR-CRS-10). */
export function drillChoice(state, lesson, choiceIndex, voice = VOICE) {
  if (state.phase !== 'working') return state
  const step = lesson.steps[state.stepIndex]
  if (step.kind !== 'ear-choice') return state

  if (!step.choices[choiceIndex].correct) {
    return {
      ...state, misses: state.misses + 1,
      feedback: { kind: 'hint', text: voice.ear.retry }
    }
  }
  return {
    ...state, misses: 0, phase: 'stepdone',
    feedback: { kind: 'good', text: encouragement(lesson, state.encUsed, voice) },
    encUsed: state.encUsed + 1
  }
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
  return {
    ...state, stepIndex, seqPos: 0, misses: 0, gather: null, phase: 'working', feedback: null,
    lastOnset: null, verdicts: [], offsets: []
  }
}

// ---- songs ----

export function startSong(lesson) {
  return {
    kind: 'song', lessonId: lesson.id,
    pos: 0, misses: 0, slips: 0, cleanCount: 0, done: false, hint: null, mention: null, gather: null,
    lastOnset: null, verdicts: [], offsets: [], pulse: null, timingMention: null,
    missLog: [], trouble: null, offered: [], loop: null, say: null
  }
}

/** The staff/keyboard target right now: the loop cursor when practicing a corner. */
export function songTargetIndex(state) {
  return state.loop ? state.loop.pos : state.pos
}

// ---- trouble spots (SR-CRS-07): practice the tricky bit, not the whole song ----

const TROUBLE_MISSES = 3
const TROUBLE_SPAN = 2 // misses this close together are one corner
const LOOP_ROUNDS = 2

function troubleAt(missLog, offered, pos) {
  const near = missLog.filter(p => Math.abs(p - pos) <= TROUBLE_SPAN).length
  if (near < TROUBLE_MISSES) return null
  if (offered.some(o => Math.abs(o - pos) <= TROUBLE_SPAN)) return null
  return pos
}

/** Accept the mini-loop offer: just the corner, twice, then rejoin before it. */
export function acceptLoop(state, lesson, voice = VOICE) {
  if (!state.trouble) return state
  const at = state.trouble.at
  const from = Math.max(0, at - 1)
  const to = Math.min(lesson.notes.length - 1, at + 1)
  return {
    ...state, trouble: null, offered: [...state.offered, at],
    loop: { at, from, to, round: 0, pos: from },
    misses: 0, hint: null, say: null, lastOnset: null, pulse: null
  }
}

/** Decline is always allowed and never mentioned again for this corner. */
export function declineLoop(state) {
  if (!state.trouble) return state
  return { ...state, trouble: null, offered: [...state.offered, state.trouble.at] }
}

function loopNote(state, lesson, ev, voice) {
  const loop = state.loop
  const entry = lesson.notes[loop.pos]
  const r = entryProgress(entry, state.gather, ev, true)
  if (r.wrong !== undefined) {
    const misses = state.misses + 1
    const hint = entry.notes
      ? chordHintText({ wrong: r.wrong, targetMidis: r.targetMidis, misses, voice })
      : hintText({ heard: r.wrong, target: r.targetMidis[0], misses, inSong: true, voice })
    return { ...state, misses, gather: null, hint }
  }
  if (!r.done) return { ...state, gather: r.gather }
  const cleared = { gather: null }
  if (loop.pos < loop.to) {
    return { ...state, ...cleared, loop: { ...loop, pos: loop.pos + 1 }, misses: 0, hint: null, say: null }
  }
  const round = loop.round + 1
  if (round < LOOP_ROUNDS) {
    return {
      ...state, ...cleared, loop: { ...loop, round, pos: loop.from },
      misses: 0, hint: null, say: voice.trouble.again
    }
  }
  // rejoin the song a note before the corner, so the join is practiced too
  return {
    ...state, ...cleared, loop: null, pos: loop.from,
    misses: 0, hint: null, say: voice.trouble.rejoin, lastOnset: null
  }
}

export function songNote(state, lesson, ev, voice = VOICE) {
  if (state.done) return state
  if (state.loop) return loopNote(state, lesson, ev, voice)
  const entry = lesson.notes[state.pos]

  // pitch class in any octave counts for single notes, so the music keeps
  // flowing (SR-CRS-03); chord entries are exact - hands together needs the octave
  const r = entryProgress(entry, state.gather, ev, true)
  if (r.wrong !== undefined) {
    const misses = state.misses + 1
    const hint = entry.notes
      ? chordHintText({ wrong: r.wrong, targetMidis: r.targetMidis, misses, voice })
      : hintText({ heard: r.wrong, target: r.targetMidis[0], misses, inSong: true, voice })
    const missLog = [...state.missLog, state.pos]
    const at = troubleAt(missLog, state.offered, state.pos)
    return {
      ...state, misses, hint, gather: null, pulse: null, missLog,
      trouble: at !== null ? { at } : state.trouble
    }
  }
  if (!r.done) return { ...state, gather: r.gather }

  // a hint moment breaks the pulse; the grid picks back up from this onset
  const judged = state.misses === 0
    ? judgeOnset(state, lesson.tempo, lesson.notes[state.pos - 1]?.beats, ev.timestamp)
    : null
  const verdict = judged?.verdict ?? null
  const verdicts = verdict ? [...state.verdicts] : state.verdicts
  const offsets = verdict ? [...state.offsets] : state.offsets
  if (verdict) { verdicts[state.pos] = verdict; offsets[state.pos] = judged.offBeats }
  const timed = {
    lastOnset: lesson.tempo ? ev.timestamp : null,
    verdicts,
    offsets,
    pulse: verdict && verdict !== 'pause' ? voice.timing.live[verdict] : null
  }

  const octaveSlip = !entry.notes && !eventPitches(ev).includes(r.targetMidis?.[0] ?? entryMidis(entry)[0])
  const slips = state.slips + (octaveSlip ? 1 : 0)
  const cleanCount = state.cleanCount + (state.misses === 0 ? 1 : 0)
  const pos = state.pos + 1
  if (pos < lesson.notes.length) {
    return { ...state, ...timed, pos, slips, cleanCount, misses: 0, gather: null, hint: null, say: null }
  }
  return {
    ...state, ...timed, pos, slips, cleanCount, misses: 0, gather: null, hint: null, say: null, done: true,
    mention: slips >= 3 ? voice.song.octaveMention : null,
    timingMention: lesson.tempo ? timingSummary(verdicts, voice) : null
  }
}

// ---- warm-up selector (SR-CRS-06) ----

/**
 * On a new session from Unit 2 onward, offer one previously completed item,
 * chosen by simple spaced repetition: oldest lastPlayedAt first. Null when
 * the student hasn't finished Unit 1 yet or nothing is completed.
 */
export function pickWarmup(lessons, progress) {
  const unit1 = lessons.filter(l => l.unitId === 'u1')
  if (!unit1.every(l => progress.get(l.id)?.completed)) return null

  const completed = lessons.filter(l => progress.get(l.id)?.completed)
  if (!completed.length) return null
  return completed.reduce((oldest, l) =>
    (progress.get(l.id).lastPlayedAt ?? 0) < (progress.get(oldest.id).lastPlayedAt ?? 0) ? l : oldest)
}

// ---- linear unlocking (SR-CRS-04) ----

/**
 * Map of lesson id -> 'complete' | 'next' | 'locked' | 'peek' | 'coming-soon'
 * in course order. Coming-soon lessons (SR-AUD-10 gated, e.g. lesson 21) are
 * visible on the map but never unlock and never block the path.
 */
export function lessonStates(lessons, completedIds) {
  const states = new Map()
  let nextFound = false
  for (const l of lessons) {
    if (l.comingSoon) {
      states.set(l.id, 'coming-soon')
    } else if (completedIds.has(l.id)) {
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

// ---- backing tracks (SR-OUT-05) ----

/**
 * Backing track schedule (SR-OUT-05): harmony voicings mapped from note
 * index to the beat where that note starts, so playback can follow the
 * metronome grid instead of reacting to the student.
 */
export function harmonyByBeat(lesson) {
  const map = new Map()
  if (!lesson.harmony) return map
  let beat = 0
  lesson.notes.forEach((n, i) => {
    if (lesson.harmony[i]) map.set(Math.round(beat), lesson.harmony[i])
    beat += n.beats ?? 1
  })
  return map
}
