import { test } from 'node:test'
import assert from 'node:assert/strict'
import { letterPolicy, noveltyFor, letterMidis } from '../src/core/wean.js'
import { findLesson, READING_POOL } from '../src/content/course.js'
import { readingWarmup } from '../src/core/reading.js'
import { practiceLesson } from '../src/core/practice.js'
import { PRACTICE_PACKS } from '../src/content/practice.js'
import { nameToMidi } from '../src/core/notes.js'

test('letters everywhere in units 1-6; weaned from unit 7 (§3.5)', () => {
  assert.equal(letterPolicy(findLesson('ode-to-joy')), 'all')          // u3
  assert.equal(letterPolicy(findLesson('labe-igi-orombo')), 'all')     // u5
  assert.equal(letterPolicy(findLesson('notes-cold')), 'novel-only')   // u7
  assert.equal(letterPolicy(findLesson('london-bridge-in-g')), 'novel-only') // u10
  assert.equal(letterPolicy(findLesson('saints-with-chords')), 'novel-only') // u11
})

test('novelty: new clef relabels; known material labels nothing', () => {
  // the bass clef lesson is the first bass-staff sighting — its notes are novel
  const bass = noveltyFor(findLesson('the-bass-clef'))
  assert.ok(bass.size > 0, 'first bass-clef notes are novel')
  // Merrily (later, also bass) re-uses those positions — nothing novel
  assert.equal(noveltyFor(findLesson('merrily-left-hand')).size, 0)
  // Meet F sharp introduces F#4; G4 was met long ago
  const fs = noveltyFor(findLesson('meet-f-sharp'))
  assert.ok(fs.has(nameToMidi('F#4')))
  assert.ok(!fs.has(nameToMidi('G4')))
  // London Bridge's only genuinely-new note is E5 — everything else is pure notation
  const lb = noveltyFor(findLesson('london-bridge-in-g'))
  assert.deepEqual([...lb], [nameToMidi('E5')])
})

test('reading warm-ups read cold; practice inherits its source unit', () => {
  const warmup = readingWarmup(READING_POOL, 1)
  assert.equal(letterPolicy(warmup), 'novel-only')
  assert.equal(noveltyFor(warmup).size, 0)
  const pack = PRACTICE_PACKS[0]
  const lessonised = practiceLesson(pack)
  const expected = Number(pack.unitId.slice(1)) < 7 ? 'all' : 'novel-only'
  assert.equal(letterPolicy(lessonised), expected)
})

test('letterMidis maps the three-way setting', () => {
  const u3 = findLesson('ode-to-joy')
  const u10 = findLesson('london-bridge-in-g')
  assert.equal(letterMidis(false, u3), 'none')
  assert.equal(letterMidis(true, u10), 'all')
  assert.equal(letterMidis(undefined, u3), 'all')
  assert.equal(letterMidis('auto', u3), 'all')
  const set = letterMidis(undefined, u10)
  assert.ok(set instanceof Set && set.size === 1 && set.has(nameToMidi('E5')))
  // free play (no lesson): letters on unless always-off
  assert.equal(letterMidis(undefined, null), 'all')
  assert.equal(letterMidis(false, null), 'none')
})
