import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startSong, songNote, acceptLoop, declineLoop, songTargetIndex } from '../src/core/engine.js'
import { nameToMidi } from '../src/core/notes.js'
import { noteEvent } from '../src/core/events.js'
import { VOICE } from '../src/content/voice.js'

const tap = name => noteEvent({ pitch: nameToMidi(name), source: 'tap', timestamp: 0 })
const n = (note, finger) => ({ note, finger })

const SONG = {
  id: 'fixture-trouble',
  kind: 'song',
  notes: [n('C4', 1), n('D4', 2), n('E4', 3), n('F4', 4), n('G4', 5), n('E4', 3), n('C4', 1)]
}

function missThriceAt(s) {
  for (let i = 0; i < 3; i++) s = songNote(s, SONG, tap('B4'))
  return s
}

test('three misses in one corner trigger the mini-loop offer (SR-CRS-07)', () => {
  let s = startSong(SONG)
  s = songNote(s, SONG, tap('C4'))
  s = songNote(s, SONG, tap('D4'))
  s = songNote(s, SONG, tap('E4'))   // now at F (index 3)
  assert.equal(s.trouble, null)
  s = missThriceAt(s)
  assert.deepEqual(s.trouble, { at: 3 })
})

test('scattered misses across the song never trigger the offer', () => {
  let s = startSong(SONG)
  SONG.notes.forEach((t, i) => {
    if (i % 3 === 0) s = songNote(s, SONG, tap('B4')) // a miss every few notes, far apart
    s = songNote(s, SONG, tap(t.note))
  })
  assert.ok(s.done)
  assert.equal(s.trouble, null)
})

test('the accepted loop plays the corner twice, then rejoins before it', () => {
  let s = startSong(SONG)
  s = songNote(s, SONG, tap('C4'))
  s = songNote(s, SONG, tap('D4'))
  s = songNote(s, SONG, tap('E4'))
  s = missThriceAt(s)
  s = acceptLoop(s, SONG)
  assert.equal(s.trouble, null)
  assert.deepEqual([s.loop.from, s.loop.to], [2, 4]) // E F G: starts a note before the spot
  assert.equal(songTargetIndex(s), 2)

  s = songNote(s, SONG, tap('E4'))
  s = songNote(s, SONG, tap('F4'))
  s = songNote(s, SONG, tap('G4'))   // round one done
  assert.equal(s.say, VOICE.trouble.again)
  assert.equal(songTargetIndex(s), 2)

  s = songNote(s, SONG, tap('E4'))
  s = songNote(s, SONG, tap('F4'))
  s = songNote(s, SONG, tap('G4'))   // round two done
  assert.equal(s.loop, null)
  assert.equal(s.say, VOICE.trouble.rejoin)
  assert.equal(s.pos, 2)             // rejoined a note before the corner

  for (const t of SONG.notes.slice(2)) s = songNote(s, SONG, tap(t.note))
  assert.ok(s.done)
})

test('hints still help inside the loop, and loop misses never re-trigger an offer', () => {
  let s = startSong(SONG)
  s = songNote(s, SONG, tap('C4'))
  s = songNote(s, SONG, tap('D4'))
  s = songNote(s, SONG, tap('E4'))
  s = missThriceAt(s)
  s = acceptLoop(s, SONG)
  for (let i = 0; i < 5; i++) s = songNote(s, SONG, tap('B4'))
  assert.ok(s.hint)
  assert.equal(s.trouble, null)
})

test('declining is quiet and the same corner is never offered twice', () => {
  let s = startSong(SONG)
  s = songNote(s, SONG, tap('C4'))
  s = songNote(s, SONG, tap('D4'))
  s = songNote(s, SONG, tap('E4'))
  s = missThriceAt(s)
  s = declineLoop(s)
  assert.equal(s.trouble, null)
  s = missThriceAt(s)                // keeps struggling at the same corner
  assert.equal(s.trouble, null)      // offered once, not nagged
  s = songNote(s, SONG, tap('F4'))
  assert.equal(s.pos, 4)
})

test('loop practice never inflates the clean-note count', () => {
  let s = startSong(SONG)
  s = songNote(s, SONG, tap('C4'))
  s = songNote(s, SONG, tap('D4'))
  s = songNote(s, SONG, tap('E4'))
  const cleanBefore = s.cleanCount
  s = missThriceAt(s)
  s = acceptLoop(s, SONG)
  for (let r = 0; r < 2; r++) {
    s = songNote(s, SONG, tap('E4'))
    s = songNote(s, SONG, tap('F4'))
    s = songNote(s, SONG, tap('G4'))
  }
  assert.equal(s.cleanCount, cleanBefore)
})
