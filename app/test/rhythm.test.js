import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startDrill, drillClap, drillNote } from '../src/core/engine.js'
import { OnsetTracker } from '../src/audio/detect/onset.js'
import { nameToMidi } from '../src/core/notes.js'
import { noteEvent } from '../src/core/events.js'
import { VOICE } from '../src/content/voice.js'

const clapAt = (timestamp) => ({ kind: 'onset', source: 'mic', timestamp })

const LESSON = {
  id: 'fixture-rhythm',
  kind: 'drill',
  tempo: 60, // beat = 1000ms
  steps: [
    {
      kind: 'rhythm-clap',
      prompt: 'Clap: short, short, long.',
      pattern: [1, 1, 2] // beats between the four claps
    }
  ],
  done: { title: 'Done.', line: 'In the pulse.' }
}

test('four claps on the grid complete the step (SR-AUD-14)', () => {
  let s = startDrill(LESSON)
  s = drillClap(s, LESSON, clapAt(0))
  s = drillClap(s, LESSON, clapAt(1000))
  s = drillClap(s, LESSON, clapAt(2000))
  assert.equal(s.phase, 'working')
  s = drillClap(s, LESSON, clapAt(4000))
  assert.equal(s.phase, 'stepdone')
  assert.equal(s.feedback.text, VOICE.rhythm.done)
})

test('a rushed clap earns one kind retry naming the clap, and the pattern restarts', () => {
  let s = startDrill(LESSON)
  s = drillClap(s, LESSON, clapAt(0))
  s = drillClap(s, LESSON, clapAt(1000))
  s = drillClap(s, LESSON, clapAt(1400)) // third clap far too soon
  s = drillClap(s, LESSON, clapAt(3400))
  assert.equal(s.phase, 'working')
  assert.equal(s.feedback.kind, 'hint')
  assert.match(s.feedback.text, /third clap came a little early/)
  assert.equal(s.seqPos, 0)
  // clean second try succeeds
  s = drillClap(s, LESSON, clapAt(10000))
  s = drillClap(s, LESSON, clapAt(11000))
  s = drillClap(s, LESSON, clapAt(12000))
  s = drillClap(s, LESSON, clapAt(14000))
  assert.equal(s.phase, 'stepdone')
})

test('a long pause restarts the pattern silently — thinking is safe', () => {
  let s = startDrill(LESSON)
  s = drillClap(s, LESSON, clapAt(0))
  s = drillClap(s, LESSON, clapAt(1000))
  s = drillClap(s, LESSON, clapAt(9000)) // gave up mid-pattern, started again
  assert.equal(s.seqPos, 1)
  assert.equal(s.feedback, null)
  s = drillClap(s, LESSON, clapAt(10000))
  s = drillClap(s, LESSON, clapAt(11000))
  s = drillClap(s, LESSON, clapAt(13000))
  assert.equal(s.phase, 'stepdone')
})

test('note events do not drive a clap step, and claps do not drive play steps', () => {
  const tap = noteEvent({ pitch: nameToMidi('C4'), source: 'tap', timestamp: 0 })
  let s = startDrill(LESSON)
  assert.deepEqual(drillNote(s, LESSON, tap), s)
  const playLesson = {
    ...LESSON,
    steps: [{ kind: 'play', targets: [{ note: 'C4', finger: 1 }] }]
  }
  const p = startDrill(playLesson)
  assert.deepEqual(drillClap(p, playLesson, clapAt(0)), p)
})

test('onset tracker: a clap over quiet background emits one onset', () => {
  const t = new OnsetTracker()
  for (let ms = 0; ms < 200; ms += 21) assert.equal(t.feed(0.005, ms), null)
  const ev = t.feed(0.3, 200)
  assert.ok(ev)
  assert.equal(ev.kind, 'onset')
  assert.equal(ev.timestamp, 200)
  // the decaying tail of the same clap stays inside the refractory window
  assert.equal(t.feed(0.25, 221), null)
  assert.equal(t.feed(0.12, 242), null)
})

test('onset tracker: soft or ambiguous sound emits nothing (silence over guessing)', () => {
  const t = new OnsetTracker()
  assert.equal(t.feed(0.015, 0), null)          // below the floor
  for (let ms = 21; ms < 400; ms += 21) t.feed(0.08, ms) // steady talking-level noise
  assert.equal(t.feed(0.1, 400), null)          // not a jump over background
})

test('onset tracker: two separate claps emit two onsets', () => {
  const t = new OnsetTracker()
  t.feed(0.005, 0)
  assert.ok(t.feed(0.3, 21))
  for (let ms = 42; ms < 800; ms += 21) t.feed(0.005, ms)
  assert.ok(t.feed(0.3, 800))
})
