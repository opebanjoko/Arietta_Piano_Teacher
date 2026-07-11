/**
 * Recorded poly-corpus gate scoring (POLY_GATE_RUNBOOK.md Session P2),
 * automated for CI like the mono corpus test.
 *
 * PLACEHOLDER while the polyphony human gate is deferred: when no poly-*.wav
 * recordings exist under spike/corpus/, this suite skips loudly. The gate app
 * (see the runbook) records and names the clips; drop them into spike/corpus/
 * and this scores them through the production PolyTracker.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PolyTracker } from '../src/audio/detect/poly.js'

const CORPUS_DIR = fileURLToPath(new URL('../../spike/corpus/', import.meta.url))
const FRAME = 2048
const HOP = 1024

// truth per chord label in poly-<piano>-<label>-<distance>-<take>.wav
// (matches spike/gate/tasks.js, both transcribed from the runbook)
const CHORDS = {
  C3maj: [48, 52, 55], F3maj: [53, 57, 60], G3maj: [55, 59, 62],
  C4maj: [60, 64, 67], F4maj: [65, 69, 72],
  C4E4: [60, 64], E4G4: [64, 67], C3E3: [48, 52]
}
const SEQS = {
  heldbass: [[48], [60], [62], [64], [65], [67]],
  together: [[48, 52, 55], [62], [65], [69], [65], [62]]
}

function listWavs() {
  try {
    return readdirSync(CORPUS_DIR).filter(f => f.startsWith('poly-') && f.endsWith('.wav'))
  } catch {
    return []
  }
}

function decodeWav(buf) {
  const sampleRate = buf.readUInt32LE(24)
  const samples = new Float32Array((buf.length - 44) / 2)
  for (let i = 0; i < samples.length; i++) samples[i] = buf.readInt16LE(44 + i * 2) / 32768
  return { sampleRate, samples }
}

function runClip({ sampleRate, samples }) {
  const tracker = new PolyTracker({ sampleRate })
  const events = []
  for (let off = 0; off + FRAME <= samples.length; off += HOP) {
    const ev = tracker.feed(samples.subarray(off, off + FRAME), ((off + FRAME) / sampleRate) * 1000)
    if (ev) events.push(ev.pitches ?? [ev.pitch])
  }
  return events
}

const setEq = (a, b) => a.length === b.length && a.every((m, i) => m === b[i])
const sorted = (a) => [...a].sort((x, y) => x - y)

const wavs = listWavs()

test('recorded poly corpus meets the gate (SR-AUD-10)', { skip: wavs.length === 0 && 'no poly corpus recorded yet — gate DEFERRED (spike/POLY_GATE_RUNBOOK.md); record with the gate app and place poly-*.wav in spike/corpus/' }, () => {
  let clips = 0
  let detected = 0
  let falseEvents = 0
  let totalMs = 0
  for (const f of wavs) {
    const label = f.split('-')[2]
    const chord = CHORDS[label]
    const seq = SEQS[label]
    assert.ok(chord || seq, `${f}: unknown chord label '${label}'`)
    const clip = decodeWav(readFileSync(CORPUS_DIR + f))
    totalMs += (clip.samples.length / clip.sampleRate) * 1000
    const events = runClip(clip)
    clips++
    const played = new Set((chord ?? seq.flat()))
    falseEvents += events.filter(set => set.some(m => !played.has(m))).length
    if (chord) {
      if (events.some(set => setEq(set, sorted(chord)))) detected++
    } else if (events.length === seq.length && events.every((set, i) => setEq(set, sorted(seq[i])))) {
      detected++
    }
  }
  const detectionRate = clips ? detected / clips : 1
  const falsePer10Min = totalMs ? (falseEvents * 600000) / totalMs : 0
  console.log('poly corpus gate:', JSON.stringify({ clips, detectionRate, falsePer10Min }))
  assert.ok(detectionRate >= 0.95 && falsePer10Min <= 1,
    `poly gate not met: detection ${detectionRate}, false/10min ${falsePer10Min}`)
})
