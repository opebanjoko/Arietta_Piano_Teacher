import { test } from 'node:test'
import assert from 'node:assert/strict'
import { yin, mpm } from '../src/audio/detect/pitch.js'
import { pianoTone } from './signals.js'

const SR = 48000
const FRAME = 2048
const HOP = 1024
const FRAME_MS = (FRAME / SR) * 1000 // ~42.7ms of audio per frame, 21.3ms hop

// Regression tripwire (SR-PLT-03), not a thermal proof: each detector must
// process a frame in well under one hop on the dev machine. Generous bound
// so CI noise never flakes it; a real iPad run is the hardware gate's job.
const BUDGET_MS = 15

const N = 200
const signal = pianoTone(261.63, SR, FRAME + HOP * (N - 1), 0.5) // middle C
const frames = Array.from({ length: N }, (_, i) => signal.subarray(i * HOP, i * HOP + FRAME))

for (const [name, detect] of [['mpm', mpm], ['yin', yin]]) {
  test(`${name} stays under ${BUDGET_MS}ms per 2048-sample frame`, () => {
    // warm-up pass so JIT compilation is not billed to the measurement
    for (const f of frames.slice(0, 20)) detect(f, SR)
    const t0 = performance.now()
    for (const f of frames) detect(f, SR)
    const avg = (performance.now() - t0) / frames.length
    assert.ok(avg < BUDGET_MS, `${name} avg ${avg.toFixed(2)}ms exceeds ${BUDGET_MS}ms (frame is ${FRAME_MS.toFixed(1)}ms of audio)`)
  })
}
