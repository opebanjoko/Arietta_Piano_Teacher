import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateSnippet, resolveReading, readingWarmup } from '../src/core/reading.js'
import { startDrill, drillNote } from '../src/core/engine.js'
import { nameToMidi, whiteIndex } from '../src/core/notes.js'
import { noteEvent } from '../src/core/events.js'

const n = (note, finger) => ({ note, finger })
const POOL = [n('C4', 1), n('D4', 2), n('E4', 3), n('F4', 4), n('G4', 5)]
const tap = name => noteEvent({ pitch: nameToMidi(name), source: 'tap', timestamp: 0 })

test('a snippet is 3-5 notes, all from the learned pool, with fingers (SR-CRS-11)', () => {
  for (let seed = 0; seed < 40; seed++) {
    const s = generateSnippet({ pool: POOL, seed })
    assert.ok(s.length >= 3 && s.length <= 5, `seed ${seed}: length ${s.length}`)
    for (const t of s) {
      assert.ok(POOL.includes(t), `seed ${seed}: ${t.note} not in pool`)
      assert.ok(t.finger >= 1 && t.finger <= 5)
    }
  }
})

test('snippets move only by steps and skips, never standing still or leaping', () => {
  for (let seed = 0; seed < 40; seed++) {
    const s = generateSnippet({ pool: POOL, seed })
    for (let i = 1; i < s.length; i++) {
      const d = Math.abs(whiteIndex(nameToMidi(s[i].note)) - whiteIndex(nameToMidi(s[i - 1].note)))
      assert.ok(d === 1 || d === 2, `seed ${seed}: interval ${d}`)
    }
  }
})

test('the same seed is the same phrase; the next seed is a fresh one', () => {
  const a1 = generateSnippet({ pool: POOL, seed: 7 })
  const a2 = generateSnippet({ pool: POOL, seed: 7 })
  assert.deepEqual(a1, a2)
  const phrases = new Set()
  for (let seed = 0; seed < 12; seed++) {
    phrases.add(generateSnippet({ pool: POOL, seed }).map(t => t.note).join(' '))
  }
  assert.ok(phrases.size >= 8, `only ${phrases.size} distinct phrases in 12 seeds`)
})

test('resolveReading turns snippet steps into playable steps the engine accepts', () => {
  const lesson = {
    id: 'fixture-reading', kind: 'drill',
    steps: [
      { kind: 'info', prompt: 'First, a thought.' },
      { kind: 'reading-snippet', pool: POOL, len: 3 }
    ],
    done: { title: 'Done.', line: 'Read cold.' }
  }
  const resolved = resolveReading(lesson, 3)
  assert.equal(resolved.steps[1].kind, 'play')
  assert.equal(resolved.steps[1].targets.length, 3)
  assert.ok(resolved.steps[1].prompt)

  let s = startDrill(resolved)
  s = { ...s, stepIndex: 1 }
  for (const t of resolved.steps[1].targets) s = drillNote(s, resolved, tap(t.note))
  assert.equal(s.phase, 'stepdone')
})

test('a lesson without snippet steps passes through untouched', () => {
  const lesson = { id: 'plain', steps: [{ kind: 'info', prompt: 'hi' }] }
  assert.equal(resolveReading(lesson, 1), lesson)
})

test('the reading warm-up is ephemeral and one snippet long', () => {
  const wu = readingWarmup(POOL, 5)
  assert.ok(wu.ephemeral)
  assert.equal(wu.steps.length, 1)
  assert.equal(wu.steps[0].kind, 'play')
  assert.ok(wu.steps[0].targets.length >= 3)
})
