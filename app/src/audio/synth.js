/**
 * Arietta's voice at the piano (SR-OUT-01): the prototype's triangle+sine
 * through a lowpass, frequency computed from MIDI so it covers C3-C6.
 */
import { freq } from '../core/notes.js'
import { holdFor, holdPitches } from './gate.js'

// how long a played tone rings; detection is suspended for this long (SR-OUT-02)
const RING_MS = 1900
// accompaniment rings shorter and quieter than a typical student note (SR-OUT-03)
const HARMONY_RING_MS = 1300

let ctx = null

function ensureContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

/**
 * "Play with me" harmony under a correct melody note. Instead of the full
 * self-hearing gate, only the voicing's own pitch classes go deaf while it
 * rings — the student's next note is still heard (SR-OUT-02/03).
 */
export function playHarmony(midis) {
  const ac = ensureContext()
  if (!ac) return
  holdPitches(midis, HARMONY_RING_MS)
  for (const midi of midis) voice(ac, midi, { gain: 0.085, ring: 1.2 })
}

export function playTone(midi) {
  const ac = ensureContext()
  if (!ac) return
  holdFor(RING_MS)
  voice(ac, midi, { gain: 0.22, ring: 1.7 })
}

function voice(ac, midi, { gain, ring }) {
  const f = freq(midi), t = ac.currentTime

  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + ring)

  const lp = ac.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 2400

  const o1 = ac.createOscillator()
  o1.type = 'triangle'
  o1.frequency.value = f

  const o2 = ac.createOscillator()
  o2.type = 'sine'
  o2.frequency.value = f * 2
  const g2 = ac.createGain()
  g2.gain.setValueAtTime(gain * 0.27, t)
  g2.gain.exponentialRampToValueAtTime(0.0001, t + ring * 0.53)

  o1.connect(lp)
  o2.connect(g2)
  g2.connect(lp)
  lp.connect(g)
  g.connect(ac.destination)
  o1.start(t); o2.start(t)
  o1.stop(t + ring + 0.1); o2.stop(t + ring * 0.6)
}
