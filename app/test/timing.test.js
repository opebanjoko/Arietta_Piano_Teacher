import { test } from 'node:test'
import assert from 'node:assert/strict'
import { beatMs, judgeGap, timingSummary } from '../src/core/timing.js'
import { VOICE } from '../src/content/voice.js'

test('tolerance is generous at 60 BPM and narrows as tempo rises (SR-CRS-08)', () => {
  // 200ms off the grid: inside the window at 60 BPM, outside at 120 BPM
  assert.equal(judgeGap(1200, 1000, 60), 'on')
  assert.equal(judgeGap(700, 500, 120), 'late')
  assert.equal(judgeGap(300, 500, 120), 'early')
})

test('a long wait is a pause, never lateness — silence is safe', () => {
  assert.equal(judgeGap(3000, 1000, 60), 'pause')
})

test('exactly on the grid is on', () => {
  assert.equal(judgeGap(beatMs(60), beatMs(60), 60), 'on')
})

test('steady playing earns the steady line, with no numbers in it', () => {
  const line = timingSummary(['on', 'on', 'on', 'on'], VOICE)
  assert.equal(line, VOICE.timing.steady)
  assert.ok(!/\d/.test(line))
})

test('deliberately rushed playing reads as eager, never as a score', () => {
  const line = timingSummary([null, 'early', 'early', 'on', 'early', 'early'], VOICE)
  assert.equal(line, VOICE.timing.early)
  assert.ok(!/\d/.test(line))
})

test('deliberately dragged playing reads as a touch late', () => {
  const line = timingSummary([null, 'late', 'on', 'late', 'late'], VOICE)
  assert.equal(line, VOICE.timing.late)
})

test('one wobble is named kindly by its ordinal', () => {
  const line = timingSummary(['on', 'on', 'early', 'on'], VOICE)
  assert.match(line, /a little early on the third note/)
  assert.ok(!/\d/.test(line))
})

test('a mix of early and late is just a wobble or two', () => {
  const line = timingSummary(['early', 'late', 'early', 'late'], VOICE)
  assert.equal(line, VOICE.timing.mixed)
})

test('pauses and unjudged notes never reach the summary', () => {
  assert.equal(timingSummary(['pause', null, 'pause'], VOICE), null)
  assert.equal(timingSummary(['pause', 'on', 'on'], VOICE), VOICE.timing.steady)
})
