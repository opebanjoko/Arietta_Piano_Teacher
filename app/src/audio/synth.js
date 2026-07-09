/**
 * Arietta's voice at the piano (SR-OUT-01): the prototype's triangle+sine
 * through a lowpass, frequency computed from MIDI so it covers C3-C6.
 */
import { freq } from '../core/notes.js'

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

export function playTone(midi) {
  const ac = ensureContext()
  if (!ac) return
  const f = freq(midi), t = ac.currentTime

  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7)

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
  g2.gain.setValueAtTime(0.06, t)
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)

  o1.connect(lp)
  o2.connect(g2)
  g2.connect(lp)
  lp.connect(g)
  g.connect(ac.destination)
  o1.start(t); o2.start(t)
  o1.stop(t + 1.8); o2.stop(t + 1.0)
}
