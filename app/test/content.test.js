import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COURSE, allLessons, findLesson } from '../src/content/course.js'
import { VOICE } from '../src/content/voice.js'
import { nameToMidi } from '../src/core/notes.js'

const lessons = allLessons()

function checkTarget(t, where) {
  const midi = nameToMidi(t.note)
  assert.ok(midi >= 48 && midi <= 96, `${where}: note ${t.note} outside range`)
  assert.ok(Number.isInteger(t.finger) && t.finger >= 1 && t.finger <= 5,
    `${where}: fingering is mandatory (SR-CRS-05), got ${t.finger}`)
}

test('lesson ids are unique and lessons are complete', () => {
  const ids = lessons.map(l => l.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const l of lessons) {
    assert.ok(l.title, l.id)
    assert.ok(['drill', 'song'].includes(l.kind), l.id)
    assert.ok(l.done?.title && l.done?.line, `${l.id}: needs a completion celebration`)
  }
})

test('Units 1-6 cover the 21-lesson v1 map in course order (§3.2)', () => {
  assert.deepEqual(lessons.map(l => l.id), [
    'meet-the-keyboard', 'finding-middle-c', 'hands-say-hello',
    'middle-c-again', 'meet-d', 'meet-e', 'meet-f-and-g',
    'ode-to-joy', 'lightly-row', 'au-clair-de-la-lune',
    'long-and-short', 'playing-with-the-pulse', 'ode-in-time', 'hot-cross-buns',
    'meet-a-and-b', 'up-to-high-c', 'when-the-saints', 'twinkle',
    'left-hand-home', 'taking-turns', 'your-first-chord'
  ])
  // lesson 21 is on the map but gated until polyphony (§3.2, SR-AUD-10)
  assert.ok(findLesson('your-first-chord').comingSoon)
  assert.equal(lessons.filter(l => l.comingSoon).length, 1)
})

test('every drill step is well-formed and every target carries a finger', () => {
  for (const l of lessons.filter(l => l.kind === 'drill')) {
    assert.ok(l.steps.length >= 1, l.id)
    for (const [i, s] of l.steps.entries()) {
      assert.ok(['info', 'play', 'ear-choice', 'ear-echo', 'watch-me', 'rhythm-clap', 'reading-snippet'].includes(s.kind), `${l.id} step ${i}`)
      if (s.kind !== 'reading-snippet') assert.ok(s.prompt, `${l.id} step ${i}`)
      if (s.kind === 'play' || s.kind === 'ear-echo') {
        assert.ok(s.targets.length >= 1, `${l.id} step ${i}`)
        s.targets.forEach(t => checkTarget(t, `${l.id} step ${i}`))
        if (s.timed) assert.ok(l.tempo, `${l.id} step ${i}: timed steps need a lesson tempo`)
      }
      if (s.kind === 'ear-choice') {
        assert.ok(s.play.length >= 2, `${l.id} step ${i}: needs notes to play`)
        s.play.forEach(t => checkTarget(t, `${l.id} step ${i}`))
        assert.equal(s.choices.filter(c => c.correct).length, 1, `${l.id} step ${i}: exactly one correct choice`)
      }
      if (s.kind === 'rhythm-clap') {
        assert.ok(l.tempo, `${l.id} step ${i}: clap steps need a lesson tempo`)
        assert.ok(s.pattern.length >= 1 && s.pattern.every(b => b > 0), `${l.id} step ${i}`)
      }
      if (s.kind === 'reading-snippet') {
        assert.ok(s.pool.length >= 3, `${l.id} step ${i}: pool too small to move by steps and skips`)
        s.pool.forEach(t => checkTarget(t, `${l.id} step ${i}`))
      }
      if (s.kind === 'watch-me' && s.anim) {
        assert.equal(s.anim.keys.length, s.anim.fingers.length, `${l.id} step ${i}`)
        assert.ok(['right', 'left'].includes(s.anim.hand), `${l.id} step ${i}`)
      }
    }
  }
})

test('ear moments exist in Units 1-3 and every lesson carries a recap (SR-CRS-10/12)', () => {
  const earSteps = lessons.flatMap(l => (l.steps ?? []).filter(s => s.kind.startsWith('ear-')))
  assert.ok(earSteps.length >= 2, 'the teacher trains ears from day one')
  for (const l of lessons) {
    assert.ok(l.recap?.summary && l.recap?.seed, `${l.id}: recap summary + next-time seed required`)
  }
})

test('every song note carries a finger and stays in C position', () => {
  for (const l of lessons.filter(l => l.kind === 'song')) {
    assert.ok(l.notes.length >= 8, l.id)
    l.notes.forEach(t => checkTarget(t, l.id))
  }
})

test('timed songs have positive beats; harmony voicings point at real notes (SR-OUT-03)', () => {
  for (const l of lessons.filter(l => l.kind === 'song')) {
    if (l.tempo) l.notes.forEach((t, i) => assert.ok((t.beats ?? 1) > 0, `${l.id} note ${i}`))
    for (const [idx, notes] of Object.entries(l.harmony ?? {})) {
      assert.ok(Number(idx) < l.notes.length, `${l.id}: harmony at ${idx} has no melody note`)
      notes.forEach(name => {
        const midi = nameToMidi(name)
        assert.ok(midi >= 48 && midi <= 96, `${l.id}: harmony note ${name}`)
      })
    }
  }
  assert.ok(lessons.some(l => l.kind === 'song' && l.tempo), 'Unit 4 promises in-time pieces')
})

test('exactly one sneak-peek song exists (Ode to Joy)', () => {
  const peeks = lessons.filter(l => l.sneakPeek)
  assert.deepEqual(peeks.map(l => l.id), ['ode-to-joy'])
})

test('findLesson resolves ids with unit context', () => {
  const l = findLesson('meet-e')
  assert.equal(l.unitTag, 'UNIT 2')
  assert.equal(findLesson('nope'), null)
})

test('voice pools are populated and repeat-safe', () => {
  assert.ok(VOICE.encouragements.length >= 6, 'enough encouragements to avoid repeats in a lesson')
  assert.equal(new Set(VOICE.encouragements).size, VOICE.encouragements.length)
  assert.equal(VOICE.softeners.length, 3)
  for (const k of ['blackKey', 'directional', 'directionalSong', 'octaveSlip', 'far']) {
    assert.ok(VOICE.hints[k], k)
  }
  for (const k of ['kicker', 'title', 'line', 'accept', 'skip', 'next', 'done']) {
    assert.ok(VOICE.practice[k], `practice.${k}`)
  }
})
