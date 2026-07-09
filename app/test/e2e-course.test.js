/**
 * E2E harness (SR-VER-03): a scripted run of every lesson via source:'tap'
 * NoteEvents must complete the full course through the real engine,
 * respecting linear unlocking at every step.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allLessons } from '../src/content/course.js'
import { startDrill, drillNote, drillContinue, drillAdvance, startSong, songNote, lessonStates } from '../src/core/engine.js'
import { nameToMidi, midiToName } from '../src/core/notes.js'
import { noteEvent } from '../src/core/events.js'

const tap = name => noteEvent({ pitch: nameToMidi(name), source: 'tap', timestamp: 0 })

function playDrill(lesson, playTarget) {
  let s = startDrill(lesson)
  let guard = 0
  while (s.phase !== 'done') {
    assert.ok(++guard < 500, `${lesson.id}: drill did not converge`)
    const step = lesson.steps[s.stepIndex]
    if (step.kind === 'info') {
      s = drillContinue(s, lesson)
    } else if (s.phase === 'working') {
      s = playTarget(s, lesson, step.targets[s.seqPos])
    } else if (s.phase === 'stepdone') {
      s = drillAdvance(s, lesson)
    }
  }
  return s
}

function playSong(lesson, playTarget) {
  let s = startSong(lesson)
  let guard = 0
  while (!s.done) {
    assert.ok(++guard < 500, `${lesson.id}: song did not converge`)
    s = playTarget(s, lesson, lesson.notes[s.pos])
  }
  return s
}

function runCourse(playDrillTarget, playSongTarget) {
  const lessons = allLessons()
  const completed = new Set()
  for (const lesson of lessons) {
    const states = lessonStates(lessons, completed)
    assert.equal(states.get(lesson.id), 'next', `${lesson.id} should be unlocked in course order`)
    if (lesson.kind === 'drill') playDrill(lesson, playDrillTarget)
    else playSong(lesson, playSongTarget)
    completed.add(lesson.id)
  }
  const final = lessonStates(lessons, completed)
  for (const l of lessons) assert.equal(final.get(l.id), 'complete')
}

test('a perfect student completes all ten lessons of Units 1-3 by tap', () => {
  runCourse(
    (s, lesson, t) => drillNote(s, lesson, tap(t.note)),
    (s, lesson, t) => songNote(s, lesson, tap(t.note))
  )
})

test('a wobbly student (wrong note first, every time) still completes the course', () => {
  const wrong = t => {
    const midi = nameToMidi(t.note)
    return midiToName(midi === 60 ? 67 : 60) // G4 when the target is C4, else C4
  }
  runCourse(
    (s, lesson, t) => {
      const afterMiss = drillNote(s, lesson, tap(wrong(t)))
      assert.equal(afterMiss.feedback.kind, 'hint', `${lesson.id}: expected a hint`)
      return drillNote(afterMiss, lesson, tap(t.note))
    },
    (s, lesson, t) => {
      const afterMiss = songNote(s, lesson, tap(wrong(t)))
      assert.ok(afterMiss.hint, `${lesson.id}: expected a song hint`)
      return songNote(afterMiss, lesson, tap(t.note))
    }
  )
})

test('an octave-up student completes every song, and each earns the kind mention', () => {
  const lessons = allLessons().filter(l => l.kind === 'song')
  for (const lesson of lessons) {
    const s = playSong(lesson, (st, l, t) =>
      songNote(st, l, tap(t.note.replace('4', '5'))))
    assert.ok(s.mention, `${lesson.id}: 3+ octave slips deserve the gentle mention`)
  }
})
