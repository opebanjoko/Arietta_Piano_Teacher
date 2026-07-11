/**
 * E2E harness (SR-VER-03): a scripted run of every lesson via source:'tap'
 * NoteEvents must complete the full course through the real engine,
 * respecting linear unlocking at every step. Timed material is played on
 * the metronome grid; clap steps are clapped; reading snippets are resolved
 * the same way the app resolves them.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allLessons } from '../src/content/course.js'
import {
  startDrill, drillNote, drillContinue, drillChoice, drillClap, drillAdvance,
  startSong, songNote, lessonStates, setlistCandidates
} from '../src/core/engine.js'
import { resolveReading } from '../src/core/reading.js'
import { beatMs } from '../src/core/timing.js'
import { nameToMidi, midiToName } from '../src/core/notes.js'
import { noteEvent, noteSetEvent } from '../src/core/events.js'

const tap = (name, timestamp = 0) => noteEvent({ pitch: nameToMidi(name), source: 'tap', timestamp })
const entryNames = (t) => t.notes ?? [t.note]

/** Play one target entry — a single note, or a chord rolled as quick taps. */
const playEntry = (dispatch) => (s, lesson, t, clock) => {
  for (const [i, name] of entryNames(t).entries()) s = dispatch(s, lesson, tap(name, clock + i * 40))
  return s
}

/** A wrong note for this entry: not a member (by pitch class) of what it wants. */
const wrongFor = (t) => {
  const pcs = new Set(entryNames(t).map(n => nameToMidi(n) % 12))
  return midiToName([67, 60, 62].find(m => !pcs.has(m % 12)))
}

function playDrill(lesson, playTarget) {
  let s = startDrill(lesson)
  let guard = 0
  let clock = 0
  while (s.phase !== 'done') {
    assert.ok(++guard < 500, `${lesson.id}: drill did not converge`)
    const step = lesson.steps[s.stepIndex]
    if (s.phase === 'stepdone') {
      s = drillAdvance(s, lesson)
      clock += 10000 // a breath between steps
    } else if (step.kind === 'info' || step.kind === 'watch-me') {
      s = drillContinue(s, lesson)
    } else if (step.kind === 'ear-choice') {
      s = drillChoice(s, lesson, step.choices.findIndex(c => c.correct))
    } else if (step.kind === 'rhythm-clap') {
      s = drillClap(s, lesson, { kind: 'onset', source: 'tap', timestamp: clock })
      const gap = step.pattern[s.seqPos - 1]
      clock += (gap ?? 1) * beatMs(lesson.tempo)
    } else {
      clock += (step.targets[s.seqPos - 1]?.beats ?? 1) * beatMs(lesson.tempo ?? 60)
      s = playTarget(s, lesson, step.targets[s.seqPos], clock)
    }
  }
  return s
}

function playSong(lesson, playTarget) {
  let s = startSong(lesson)
  let guard = 0
  let clock = 0
  while (!s.done) {
    assert.ok(++guard < 500, `${lesson.id}: song did not converge`)
    clock += (lesson.notes[s.pos - 1]?.beats ?? 1) * beatMs(lesson.tempo ?? 60)
    s = playTarget(s, lesson, lesson.notes[s.pos], clock)
  }
  return s
}

function runCourse(playDrillTarget, playSongTarget) {
  const lessons = allLessons()
  const completed = new Set()
  for (const lesson of lessons) {
    const states = lessonStates(lessons, completed)
    if (lesson.comingSoon) {
      assert.equal(states.get(lesson.id), 'coming-soon', `${lesson.id} must stay gated`)
      continue
    }
    assert.equal(states.get(lesson.id), 'next', `${lesson.id} should be unlocked in course order`)
    if (lesson.kind === 'setlist') {
      // pick and replay N completed songs, as the setlist screen does
      const picks = setlistCandidates(lesson, lessons, completed).slice(0, lesson.pick)
      assert.equal(picks.length, lesson.pick, `${lesson.id}: not enough completed songs to pick from`)
      for (const piece of picks) playSong(piece, playSongTarget)
      completed.add(lesson.id)
      continue
    }
    const resolved = resolveReading(lesson, completed.size) // as the app does at open
    if (resolved.kind === 'drill') playDrill(resolved, playDrillTarget)
    else playSong(resolved, playSongTarget)
    completed.add(lesson.id)
  }
  const final = lessonStates(lessons, completed)
  for (const l of lessons) {
    assert.equal(final.get(l.id), l.comingSoon ? 'coming-soon' : 'complete')
  }
}

test('a perfect student completes the whole course by tap, on the grid', () => {
  runCourse(playEntry(drillNote), playEntry(songNote))
})

test('a wobbly student (wrong note first, every time) still completes the course', () => {
  runCourse(
    (s, lesson, t, clock) => {
      const afterMiss = drillNote(s, lesson, tap(wrongFor(t), clock - 200))
      assert.equal(afterMiss.feedback.kind, 'hint', `${lesson.id}: expected a hint`)
      return playEntry(drillNote)(afterMiss, lesson, t, clock)
    },
    (s, lesson, t, clock) => {
      const afterMiss = songNote(s, lesson, tap(wrongFor(t), clock - 200))
      assert.ok(afterMiss.hint, `${lesson.id}: expected a song hint`)
      return playEntry(songNote)(afterMiss, lesson, t, clock)
    }
  )
})

test('chord entries also land as one mic NoteSetEvent (SR-EVT-03)', () => {
  const asSets = (dispatch) => (s, lesson, t, clock) => {
    const names = entryNames(t)
    if (names.length === 1) return dispatch(s, lesson, tap(names[0], clock))
    return dispatch(s, lesson, noteSetEvent({ pitches: names.map(nameToMidi), source: 'mic', timestamp: clock }))
  }
  runCourse(asSets(drillNote), asSets(songNote))
})

test('an octave-up student completes every C4-octave song, and each earns the kind mention', () => {
  const lessons = allLessons().filter(l =>
    l.kind === 'song' && l.notes.every(t => /4$/.test(t.note)))
  assert.ok(lessons.length >= 3)
  for (const lesson of lessons) {
    const s = playSong(lesson, (st, l, t, clock) =>
      songNote(st, l, tap(t.note.replace('4', '5'), clock)))
    assert.ok(s.mention, `${lesson.id}: 3+ octave slips deserve the gentle mention`)
  }
})

test('a steady tap student earns kind words about the pulse, never numbers', () => {
  const timed = allLessons().filter(l => l.kind === 'song' && l.tempo)
  assert.ok(timed.length >= 2)
  for (const lesson of timed) {
    const s = playSong(lesson, (st, l, t, clock) => songNote(st, l, tap(t.note, clock)))
    assert.ok(s.timingMention, `${lesson.id}: a timed piece deserves a timing word`)
    assert.ok(!/\d/.test(s.timingMention), `${lesson.id}: no numbers in feedback`)
  }
})
