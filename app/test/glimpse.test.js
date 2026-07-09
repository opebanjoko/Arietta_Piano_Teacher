import { test } from 'node:test'
import assert from 'node:assert/strict'
import { glimpseText } from '../src/core/glimpse.js'
import { allLessons } from '../src/content/course.js'

const DAY = 24 * 60 * 60 * 1000
const row = (lessonId, extra = {}) => [lessonId, { lessonId, completed: true, ...extra }]

test('a brand-new player gets the getting-started line', () => {
  const lines = glimpseText({ name: 'Ava', lessons: allLessons(), progress: new Map() })
  assert.equal(lines.length, 1)
  assert.match(lines[0], /Ava is just getting started/)
})

test('the glimpse names notes met, songs played, recency and the next step — in words (SR-UI-03)', () => {
  const now = Date.now()
  const progress = new Map([
    row('meet-the-keyboard', { lastPlayedAt: now - 10 * DAY }),
    row('finding-middle-c', { lastPlayedAt: now - 9 * DAY }),
    row('hands-say-hello', { lastPlayedAt: now - 8 * DAY }),
    row('middle-c-again', { lastPlayedAt: now - 5 * DAY }),
    row('meet-d', { lastPlayedAt: now - 4 * DAY }),
    row('meet-e', { lastPlayedAt: now - 3 * DAY }),
    row('ode-to-joy', { bestCount: 15, lastPlayedAt: now - 2 * DAY })
  ])
  const lines = glimpseText({ name: 'Ava', lessons: allLessons(), progress, now })
  const text = lines.join(' ')
  assert.match(text, /Ava has met C, D and E at the piano/)
  assert.match(text, /Ode to Joy/)
  assert.match(text, /earlier this week/)
  assert.match(text, /Next on the path: Meet F and G/)
  assert.ok(!/\d/.test(text), 'no digits anywhere in the glimpse')
})

test('played today reads as today', () => {
  const now = Date.now()
  const progress = new Map([row('meet-the-keyboard', { lastPlayedAt: now - 1000 })])
  const text = glimpseText({ name: 'Bo', lessons: allLessons(), progress, now }).join(' ')
  assert.match(text, /Last at the piano today/)
})
