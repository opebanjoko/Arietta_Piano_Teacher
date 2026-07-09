import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startDrill, drillNote, drillContinue, drillChoice, drillAdvance } from '../src/core/engine.js'
import { nameToMidi } from '../src/core/notes.js'
import { noteEvent } from '../src/core/events.js'

const tap = name => noteEvent({ pitch: nameToMidi(name), source: 'tap', timestamp: 0 })

const n = (note, finger) => ({ note, finger })

const LESSON = {
  id: 'fixture-ear',
  title: 'Ear fixture',
  kind: 'drill',
  steps: [
    {
      kind: 'ear-choice',
      prompt: 'Higher or lower?',
      play: [n('C4', 1), n('D4', 2)],
      choices: [{ label: 'Higher', correct: true }, { label: 'Lower', correct: false }]
    },
    {
      kind: 'ear-echo',
      prompt: 'Copy me.',
      targets: [n('C4', 1), n('D4', 2), n('E4', 3)]
    },
    {
      kind: 'watch-me',
      prompt: 'Watch how the thumb lands.',
      media: null
    }
  ],
  done: { title: 'Done.', line: 'Nice ears.' }
}

test('ear-choice: correct answer completes the step, wrong answer gets a warm retry', () => {
  let s = startDrill(LESSON)
  s = drillChoice(s, LESSON, 1)                 // wrong: Lower
  assert.equal(s.phase, 'working')
  assert.equal(s.misses, 1)
  assert.equal(s.feedback.kind, 'hint')
  assert.match(s.feedback.text, /listen/i)
  s = drillChoice(s, LESSON, 0)                 // right: Higher
  assert.equal(s.phase, 'stepdone')
  assert.equal(s.feedback.kind, 'good')
})

test('ear-choice ignores note events; play steps ignore choices', () => {
  let s = startDrill(LESSON)
  assert.deepEqual(drillNote(s, LESSON, tap('D4')), s)
  s = drillAdvance(drillChoice(s, LESSON, 0), LESSON)   // now on ear-echo
  assert.deepEqual(drillChoice(s, LESSON, 0), s)
})

test('ear-echo matches notes like a play step', () => {
  let s = startDrill(LESSON)
  s = drillAdvance(drillChoice(s, LESSON, 0), LESSON)
  s = drillNote(s, LESSON, tap('C4'))
  s = drillNote(s, LESSON, tap('F4'))           // miss mid-echo
  assert.equal(s.misses, 1)
  s = drillNote(s, LESSON, tap('D4'))
  s = drillNote(s, LESSON, tap('E4'))
  assert.equal(s.phase, 'stepdone')
})

test('watch-me advances on continue and completes the lesson', () => {
  let s = startDrill(LESSON)
  s = drillAdvance(drillChoice(s, LESSON, 0), LESSON)
  for (const t of LESSON.steps[1].targets) s = drillNote(s, LESSON, tap(t.note))
  s = drillAdvance(s, LESSON)
  assert.equal(LESSON.steps[s.stepIndex].kind, 'watch-me')
  s = drillContinue(s, LESSON)
  assert.equal(s.phase, 'done')
})
