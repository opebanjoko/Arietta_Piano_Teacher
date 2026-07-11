/**
 * Recorded-corpus gate scoring (SR-VER-01), automated for CI.
 *
 * PLACEHOLDER while the Phase 0 human gate is deferred: when no recordings
 * exist under spike/corpus/, this suite skips loudly. Drop the runbook's WAV
 * clips into spike/corpus/ (gitignored — home audio stays local) and it
 * scores them against SR-AUD-05/06/07 automatically.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { yin, mpm, rms } from '../src/audio/detect/pitch.js'
import { NoteTracker } from '../src/audio/detect/tracker.js'
import { nameToMidi } from '../src/core/notes.js'

const CORPUS_DIR = fileURLToPath(new URL('../../spike/corpus/', import.meta.url))
const FRAME = 2048
const HOP = 1024

function listWavs() {
  try {
    return readdirSync(CORPUS_DIR).filter(f => f.endsWith('.wav') && !f.startsWith('poly-'))
  } catch {
    return []
  }
}

/** 16-bit mono PCM WAV (the spike Record tab's own format). */
function decodeWav(buf) {
  const sampleRate = buf.readUInt32LE(24)
  const samples = new Float32Array((buf.length - 44) / 2)
  for (let i = 0; i < samples.length; i++) samples[i] = buf.readInt16LE(44 + i * 2) / 32768
  return { sampleRate, samples }
}

/**
 * filename: <instrument>-<note>-<distance>-<take>.wav or noise-<what>-<take>.wav
 * The gate app spells sharps filesystem-safe (Cs4 for C#4); accept both.
 * poly-*.wav clips belong to poly-corpus.test.js, not this scorer.
 */
function expectedMidi(name) {
  const seg = name.split('-')
  if (seg[0] === 'noise') return null
  return nameToMidi(seg[1].replace(/^([A-G])s(\d)$/, '$1#$2'))
}

function runClip(detect, { sampleRate, samples }) {
  const tracker = new NoteTracker()
  const events = []
  for (let off = 0; off + FRAME <= samples.length; off += HOP) {
    const frame = samples.subarray(off, off + FRAME)
    const ev = tracker.feed(detect(frame, sampleRate), rms(frame), (off / sampleRate) * 1000)
    if (ev) events.push(ev)
  }
  return events
}

const wavs = listWavs()

test('recorded corpus meets the gate (SR-AUD-07)', { skip: wavs.length === 0 && 'no corpus recorded yet — Phase 0 gate DEFERRED (spike/GATE_RUNBOOK.md); place WAVs in spike/corpus/' }, () => {
  const results = {}
  for (const [name, detect] of Object.entries({ yin, mpm })) {
    let noteClips = 0, detected = 0, falseEvents = 0, totalMs = 0
    for (const f of wavs) {
      const clip = decodeWav(readFileSync(CORPUS_DIR + f))
      totalMs += (clip.samples.length / clip.sampleRate) * 1000
      const events = runClip(detect, clip)
      const want = expectedMidi(f)
      if (want === null) {
        falseEvents += events.length
        continue
      }
      noteClips++
      const hits = events.filter(e => e.pitch === want).length
      if (hits >= 1) detected++
      falseEvents += events.length - Math.min(hits, 1)
    }
    results[name] = {
      detectionRate: noteClips ? detected / noteClips : 1,
      falsePer10Min: totalMs ? (falseEvents * 600000) / totalMs : 0
    }
  }
  console.log('corpus gate:', JSON.stringify(results))
  const pass = Object.values(results).some(r => r.detectionRate >= 0.95 && r.falsePer10Min <= 1)
  assert.ok(pass, `no detector passes the gate: ${JSON.stringify(results)}`)
})
