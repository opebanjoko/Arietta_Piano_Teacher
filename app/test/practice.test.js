import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allLessons } from '../src/content/course.js'
import { PRACTICE_PACKS } from '../src/content/practice.js'
import { planPracticeSession, practiceLesson } from '../src/core/practice.js'
import {
  startDrill, drillNote, drillContinue, drillChoice, drillClap, drillAdvance,
  startSong, songNote
} from '../src/core/engine.js'
import { beatMs } from '../src/core/timing.js'
import { nameToMidi } from '../src/core/notes.js'
import { noteEvent } from '../src/core/events.js'

const lessons = allLessons()
const byId = new Map(lessons.map(l => [l.id, l]))
const rec = (completed, lastPlayedAt = 0) => ({ completed, lastPlayedAt })
const prac = (lastPracticedAt, completedCount = 1) => ({ lastPracticedAt, completedCount })
const tap = (name, timestamp = 0) => noteEvent({ pitch: nameToMidi(name), source: 'tap', timestamp })

function complete(ids) {
  return new Map(ids.map((id, i) => [id, rec(true, i + 1)]))
}

function playDrill(lesson) {
  let s = startDrill(lesson)
  let guard = 0
  let clock = 0
  while (s.phase !== 'done') {
    assert.ok(++guard < 200, `${lesson.id}: drill practice did not converge`)
    const step = lesson.steps[s.stepIndex]
    if (s.phase === 'stepdone') {
      s = drillAdvance(s, lesson)
      clock += 10000
    } else if (step.kind === 'info' || step.kind === 'watch-me') {
      s = drillContinue(s, lesson)
    } else if (step.kind === 'ear-choice') {
      s = drillChoice(s, lesson, step.choices.findIndex(c => c.correct))
    } else if (step.kind === 'rhythm-clap') {
      s = drillClap(s, lesson, { kind: 'onset', source: 'tap', timestamp: clock })
      clock += (step.pattern[s.seqPos - 1] ?? 1) * beatMs(lesson.tempo)
    } else {
      clock += (step.targets[s.seqPos - 1]?.beats ?? 1) * beatMs(lesson.tempo ?? 60)
      s = drillNote(s, lesson, tap(step.targets[s.seqPos].note, clock))
    }
  }
}

function playSong(lesson) {
  let s = startSong(lesson)
  let guard = 0
  let clock = 0
  while (!s.done) {
    assert.ok(++guard < 200, `${lesson.id}: song practice did not converge`)
    clock += (lesson.notes[s.pos - 1]?.beats ?? 1) * beatMs(lesson.tempo ?? 60)
    s = songNote(s, lesson, tap(lesson.notes[s.pos].note, clock))
  }
}

function checkTarget(t, where) {
  assert.ok(t.note, `${where}: note required`)
  assert.ok(Number.isInteger(t.finger) && t.finger >= 1 && t.finger <= 5, `${where}: finger required`)
}

test('practice packs are valid, unique, and tied to real completed lessons', () => {
  assert.ok(PRACTICE_PACKS.length >= 10, 'first pass should cover Units 1-3 and Unit 4 rhythm')
  assert.equal(new Set(PRACTICE_PACKS.map(p => p.id)).size, PRACTICE_PACKS.length)
  for (const pack of PRACTICE_PACKS) {
    assert.ok(pack.title && pack.afterLessonId && pack.unitId, pack.id)
    assert.ok(byId.has(pack.afterLessonId), `${pack.id}: afterLessonId missing`)
    assert.ok(pack.unlocksAfter.length >= 1, `${pack.id}: unlock gate required`)
    for (const id of pack.unlocksAfter) {
      assert.ok(byId.has(id), `${pack.id}: unknown unlock ${id}`)
      assert.equal(byId.get(id).comingSoon, undefined, `${pack.id}: coming-soon content cannot unlock practice`)
    }
    assert.ok(pack.tags.length >= 1, `${pack.id}: tags required`)
    const lesson = practiceLesson(pack)
    assert.equal(lesson.id, pack.id)
    assert.equal(lesson.ephemeral, true)
    assert.equal(lesson.practicePackId, pack.id)
    assert.ok(['drill', 'song'].includes(lesson.kind), pack.id)
    assert.ok(lesson.done?.title && lesson.done?.line, `${pack.id}: completion copy required`)
  }
})

test('all practice targets carry finger numbers and remain playable by the existing engine', () => {
  for (const pack of PRACTICE_PACKS) {
    const lesson = practiceLesson(pack)
    if (lesson.kind === 'drill') {
      for (const [i, step] of lesson.steps.entries()) {
        for (const t of step.targets ?? []) checkTarget(t, `${lesson.id} step ${i}`)
        for (const t of step.play ?? []) checkTarget(t, `${lesson.id} step ${i}`)
        for (const t of step.pool ?? []) checkTarget(t, `${lesson.id} step ${i}`)
      }
      playDrill(lesson)
    } else {
      lesson.notes.forEach((t, i) => checkTarget(t, `${lesson.id} note ${i}`))
      playSong(lesson)
    }
  }
})

test('daily practice is unavailable before Unit 1 is complete', () => {
  assert.equal(planPracticeSession({
    lessons,
    packs: PRACTICE_PACKS,
    progress: complete(['meet-the-keyboard', 'finding-middle-c']),
    practiceProgress: new Map()
  }), null)
})

test('planner chooses eligible least-recent packs with variety and no coming-soon content', () => {
  const progress = complete([
    'meet-the-keyboard', 'finding-middle-c', 'hands-say-hello',
    'middle-c-again', 'meet-d', 'meet-e', 'meet-f-and-g',
    'ode-to-joy', 'lightly-row', 'au-clair-de-la-lune',
    'long-and-short', 'playing-with-the-pulse'
  ])
  const practiceProgress = new Map([
    ['practice-keyboard-c-map', prac(900)],
    ['practice-middle-c-home', prac(800)],
    ['practice-meet-d-steps', prac(700)]
  ])
  const session = planPracticeSession({ lessons, packs: PRACTICE_PACKS, progress, practiceProgress })
  assert.ok(session)
  assert.ok(session.entries.length >= 2 && session.entries.length <= 3)
  assert.equal(new Set(session.entries.map(e => e.id)).size, session.entries.length)
  assert.ok(session.entries.every(e => e.unlocksAfter.every(id => progress.get(id)?.completed)))
  assert.ok(!session.entries.some(e => e.unlocksAfter.includes('your-first-chord')))
  assert.ok(new Set(session.entries.flatMap(e => e.tags)).size >= 2, 'session should mix practice types')
  assert.equal(session.entries[0].id, 'practice-hands-finger-walk')
})
