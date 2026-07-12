import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startDrill, drillNote, drillContinue, drillChoice, drillAdvance, startSong, songNote, lessonStates } from '../src/core/engine.js'
import { findLesson, allLessons } from '../src/content/course.js'
import { nameToMidi } from '../src/core/notes.js'
import { noteEvent } from '../src/core/events.js'

const tap = name => noteEvent({ pitch: nameToMidi(name), source: 'tap', timestamp: 0 })

test('drill happy path: play every target, step by step, to completion', () => {
  const lesson = findLesson('meet-e')
  let s = startDrill(lesson)
  assert.equal(s.phase, 'working')
  for (const step of lesson.steps) {
    for (const t of step.targets) s = drillNote(s, lesson, tap(t.note))
    assert.equal(s.phase, 'stepdone')
    assert.equal(s.feedback.kind, 'good')
    s = drillAdvance(s, lesson)
  }
  assert.equal(s.phase, 'done')
})

test('mid-sequence correct note advances quietly, wrong note hints', () => {
  const lesson = findLesson('meet-e')
  let s = startDrill(lesson)
  s = drillAdvance(drillNote(s, lesson, tap('E4')), lesson)   // step 1 done
  s = drillNote(s, lesson, tap('E4'))                         // step 2: 1 of 3
  assert.equal(s.phase, 'working')
  assert.equal(s.seqPos, 1)
  assert.equal(s.feedback, null)
  s = drillNote(s, lesson, tap('G4'))                         // miss
  assert.equal(s.misses, 1)
  assert.equal(s.feedback.kind, 'hint')
  assert.match(s.feedback.text, /I heard G\. E is two keys to the left\./)
  s = drillNote(s, lesson, tap('E4'))                         // recover
  assert.equal(s.seqPos, 2)
  assert.equal(s.misses, 0)
})

test('second miss keeps hinting and the UI can glow the target (misses >= 2)', () => {
  const lesson = findLesson('meet-e')
  let s = startDrill(lesson)
  s = drillNote(s, lesson, tap('G4'))
  s = drillNote(s, lesson, tap('F4'))
  assert.equal(s.misses, 2)
  assert.match(s.feedback.text, /So close — /)
})

test('black-key miss gets the plain-language black key hint', () => {
  const lesson = findLesson('meet-e')
  let s = startDrill(lesson)
  s = drillNote(s, lesson, tap('F#4'))
  assert.match(s.feedback.text, /black keys/)
  assert.match(s.feedback.text, /E is a white key/)
})

test('octave slip in a drill is a gentle specific hint, not a plain wrong', () => {
  const lesson = findLesson('meet-e')
  let s = startDrill(lesson)
  s = drillNote(s, lesson, tap('E5'))
  assert.equal(s.misses, 1)
  assert.match(s.feedback.text, /one octave too high/)
})

test('pitch-class steps accept any octave (Meet the keyboard: any C)', () => {
  const lesson = findLesson('meet-the-keyboard')
  let s = startDrill(lesson)
  assert.equal(lesson.steps[s.stepIndex].kind, 'info')
  s = drillContinue(s, lesson)
  s = drillNote(s, lesson, tap('C5'))
  assert.equal(s.phase, 'stepdone')
})

test('info steps ignore notes and advance on continue', () => {
  const lesson = findLesson('finding-middle-c')
  let s = startDrill(lesson)
  const before = s
  s = drillNote(s, lesson, tap('C4'))
  assert.deepEqual(s, before)
  s = drillContinue(s, lesson)
  assert.equal(s.stepIndex, 1)
})

test('encouragements do not repeat within a lesson', () => {
  const lesson = findLesson('meet-f-and-g')
  let s = startDrill(lesson)
  const seen = []
  for (const step of lesson.steps) {
    if (step.kind === 'ear-choice') {
      s = drillChoice(s, lesson, step.choices.findIndex(c => c.correct))
    } else {
      for (const t of step.targets) s = drillNote(s, lesson, tap(t.note))
    }
    seen.push(s.feedback.text)
    s = drillAdvance(s, lesson)
  }
  assert.equal(new Set(seen).size, seen.length)
})

test('song matches pitch class in any octave and logs slips (SR-CRS-03)', () => {
  const lesson = findLesson('ode-to-joy')
  let s = startSong(lesson)
  s = songNote(s, lesson, tap('E5'))          // right pitch class, wrong octave
  assert.equal(s.pos, 1)
  assert.equal(s.slips, 1)
  s = songNote(s, lesson, tap('E4'))          // exact
  assert.equal(s.pos, 2)
  assert.equal(s.slips, 1)
})

test('song wrong note hints with the next-note phrasing and does not advance', () => {
  const lesson = findLesson('ode-to-joy')
  let s = startSong(lesson)
  s = songNote(s, lesson, tap('D4'))
  assert.equal(s.pos, 0)
  assert.equal(s.misses, 1)
  assert.match(s.hint, /The next note is E — one key to the right\./)
})

test('song counts notes landed without a miss (feeds best note-count)', () => {
  const lesson = findLesson('ode-to-joy')
  let s = startSong(lesson)
  s = songNote(s, lesson, tap('D4'))   // miss on note 1
  s = songNote(s, lesson, tap('E4'))   // then land it — not clean
  s = songNote(s, lesson, tap('E4'))   // note 2 first try — clean
  assert.equal(s.cleanCount, 1)
})

test('completing a song reports done, with an octave mention only after 3+ slips', () => {
  const lesson = findLesson('au-clair-de-la-lune')
  let clean = startSong(lesson)
  for (const t of lesson.notes) clean = songNote(clean, lesson, tap(t.note))
  assert.equal(clean.done, true)
  assert.equal(clean.cleanCount, lesson.notes.length)
  assert.equal(clean.mention, null)

  let slippy = startSong(lesson)
  for (const [i, t] of lesson.notes.entries()) {
    const name = i < 3 ? t.note.replace('4', '5') : t.note
    slippy = songNote(slippy, lesson, tap(name))
  }
  assert.equal(slippy.done, true)
  assert.match(slippy.mention, /octave/)
})

test('linear unlocking: next after last complete; sneak peek playable early (SR-CRS-04)', () => {
  const lessons = allLessons()
  const none = lessonStates(lessons, new Set())
  assert.equal(none.get('meet-the-keyboard'), 'next')
  assert.equal(none.get('finding-middle-c'), 'locked')
  assert.equal(none.get('ode-to-joy'), 'peek')

  const some = lessonStates(lessons, new Set(['meet-the-keyboard', 'finding-middle-c']))
  assert.equal(some.get('meet-the-keyboard'), 'complete')
  assert.equal(some.get('hands-say-hello'), 'next')
  assert.equal(some.get('middle-c-again'), 'locked')

  const all = lessonStates(lessons, new Set(lessons.map(l => l.id)))
  for (const l of lessons) {
    assert.equal(all.get(l.id), l.comingSoon ? 'coming-soon' : 'complete')
  }
})

test('a lesson inserted below the high-water mark stays playable, not locked', () => {
  // a student who completed c and d earned past b; a mid-course insertion must not re-gate them
  const lessons = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }]
  const states = lessonStates(lessons, new Set(['a', 'c', 'd']))
  assert.equal(states.get('b'), 'next', 'first incomplete is the suggested next')
  assert.equal(states.get('e'), 'locked', 'beyond the high-water mark stays gated')
  // two insertions below the mark: both playable
  const two = lessonStates(lessons, new Set(['a', 'd']))
  assert.equal(two.get('b'), 'next')
  assert.equal(two.get('c'), 'next', 'also below the mark — already earned')
  assert.equal(two.get('e'), 'locked')
})

test('a coming-soon lesson never unlocks and never blocks the path', () => {
  // synthetic: no real lesson is gated since the polyphony gate opened lesson 21
  const lessons = [{ id: 'a' }, { id: 'gated', comingSoon: true }, { id: 'b' }]
  const fresh = lessonStates(lessons, new Set(['a']))
  assert.equal(fresh.get('gated'), 'coming-soon')
  assert.equal(fresh.get('b'), 'next', 'a gated lesson must not block the path')
  const done = lessonStates(lessons, new Set(['a', 'b']))
  assert.equal(done.get('gated'), 'coming-soon')
  assert.ok(![...done.values()].includes('next'), 'nothing left to unlock')
})
