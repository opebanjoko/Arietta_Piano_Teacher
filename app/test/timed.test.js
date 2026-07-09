import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startDrill, drillNote, startSong, songNote } from '../src/core/engine.js'
import { nameToMidi } from '../src/core/notes.js'
import { noteEvent } from '../src/core/events.js'
import { VOICE } from '../src/content/voice.js'

const tapAt = (name, timestamp) =>
  noteEvent({ pitch: nameToMidi(name), source: 'tap', timestamp })

const n = (note, finger, beats) => beats ? { note, finger, beats } : { note, finger }

const SONG = {
  id: 'fixture-timed-song',
  kind: 'song',
  tempo: 60, // beat = 1000ms
  notes: [n('C4', 1), n('D4', 2), n('E4', 3), n('D4', 2), n('C4', 1, 2), n('C4', 1)]
}

function playSongAtGaps(gaps) {
  // gaps[i] is the ms between note i-1 and note i
  let s = startSong(SONG)
  let t = 0
  for (let i = 0; i < SONG.notes.length; i++) {
    t += gaps[i] ?? 0
    s = songNote(s, SONG, tapAt(SONG.notes[i].note, t))
  }
  return s
}

test('a steady song earns the steady timing mention and no numbers', () => {
  const s = playSongAtGaps([0, 1000, 1000, 1000, 1000, 2000]) // last gap honors the 2-beat note
  assert.ok(s.done)
  assert.equal(s.timingMention, VOICE.timing.steady)
  assert.ok(!/\d/.test(s.timingMention))
})

test('deliberately rushed playing is heard as eager (Phase 3 exit check)', () => {
  const s = playSongAtGaps([0, 600, 620, 580, 610, 1300])
  assert.equal(s.timingMention, VOICE.timing.early)
})

test('deliberately dragged playing is heard as a touch late', () => {
  const s = playSongAtGaps([0, 1400, 1450, 1380, 1420, 2600])
  assert.equal(s.timingMention, VOICE.timing.late)
})

test('the live pulse word rides along without ever being a score', () => {
  let s = startSong(SONG)
  s = songNote(s, SONG, tapAt('C4', 0))
  assert.equal(s.pulse, null) // first note anchors the grid
  s = songNote(s, SONG, tapAt('D4', 1000))
  assert.equal(s.pulse, VOICE.timing.live.on)
  s = songNote(s, SONG, tapAt('E4', 1500))
  assert.equal(s.pulse, VOICE.timing.live.early)
})

test('a hint moment breaks the pulse and the grid picks up again kindly', () => {
  let s = startSong(SONG)
  s = songNote(s, SONG, tapAt('C4', 0))
  s = songNote(s, SONG, tapAt('G4', 800))    // miss: hint, no judgment
  assert.ok(s.hint)
  assert.equal(s.pulse, null)
  s = songNote(s, SONG, tapAt('D4', 4000))   // recovering note: anchors, not judged
  assert.equal(s.pulse, null)
  s = songNote(s, SONG, tapAt('E4', 5000))
  assert.equal(s.pulse, VOICE.timing.live.on)
})

test('a long think between notes is a pause, never lateness', () => {
  const s = playSongAtGaps([0, 1000, 6000, 1000, 1000, 2000])
  assert.equal(s.timingMention, VOICE.timing.steady)
})

test('an untimed song never mentions timing', () => {
  const plain = { id: 'plain', kind: 'song', notes: SONG.notes }
  let s = startSong(plain)
  for (const t of plain.notes) s = songNote(s, plain, tapAt(t.note, 0))
  assert.ok(s.done)
  assert.equal(s.timingMention, null)
  assert.equal(s.pulse, null)
})

const DRILL = {
  id: 'fixture-timed-drill',
  kind: 'drill',
  tempo: 60,
  steps: [
    {
      kind: 'play', timed: true,
      prompt: 'Walk with the pulse.',
      targets: [n('C4', 1), n('D4', 2), n('E4', 3)]
    }
  ],
  done: { title: 'Done.', line: 'In time.' }
}

test('a timed drill step summarizes the pulse instead of a stock encouragement', () => {
  let s = startDrill(DRILL)
  s = drillNote(s, DRILL, tapAt('C4', 0))
  s = drillNote(s, DRILL, tapAt('D4', 1000))
  assert.equal(s.feedback.kind, 'pulse')
  assert.equal(s.feedback.text, VOICE.timing.live.on)
  s = drillNote(s, DRILL, tapAt('E4', 2050))
  assert.equal(s.phase, 'stepdone')
  assert.equal(s.feedback.text, VOICE.timing.steady)
})

test('a rushed timed drill step says so in words', () => {
  let s = startDrill(DRILL)
  s = drillNote(s, DRILL, tapAt('C4', 0))
  s = drillNote(s, DRILL, tapAt('D4', 500))
  s = drillNote(s, DRILL, tapAt('E4', 1000))
  assert.equal(s.phase, 'stepdone')
  assert.equal(s.feedback.text, VOICE.timing.early)
})

test('an untimed play step keeps plain encouragement', () => {
  const plain = { ...DRILL, steps: [{ ...DRILL.steps[0], timed: undefined }] }
  let s = startDrill(plain)
  s = drillNote(s, plain, tapAt('C4', 0))
  assert.equal(s.feedback, null)
  s = drillNote(s, plain, tapAt('D4', 100))
  s = drillNote(s, plain, tapAt('E4', 200))
  assert.equal(s.phase, 'stepdone')
  assert.ok(VOICE.encouragements.includes(s.feedback.text))
})
