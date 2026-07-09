/**
 * Metronome (SR-OUT-04): a gentle, woody click at authored tempos, scheduled
 * on the audio clock. Clicks are short unpitched taps well below the note
 * tracker's stability window, so they never trip detection and don't need the
 * self-hearing gate — the teacher can keep the pulse and listen at once.
 */

const LOOKAHEAD_MS = 25
const HORIZON_S = 0.1

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

function click(ac, at) {
  const g = ac.createGain()
  g.gain.setValueAtTime(0.09, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05)

  const bp = ac.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1750
  bp.Q.value = 9

  const o = ac.createOscillator()
  o.type = 'square'
  o.frequency.value = 1750
  o.connect(bp)
  bp.connect(g)
  g.connect(ac.destination)
  o.start(at)
  o.stop(at + 0.06)
}

/** One clap-like click right now — used to demo a rhythm pattern. */
export function playClap() {
  const ac = ensureContext()
  if (!ac) return
  click(ac, ac.currentTime + 0.01)
}

/** Start the pulse. onBeat (optional) fires on the UI thread near each click. */
export function startMetronome(bpm, onBeat) {
  const ac = ensureContext()
  if (!ac) return { stop() {} }

  const beat = 60 / bpm
  let next = ac.currentTime + 0.1
  const timer = setInterval(() => {
    while (next < ac.currentTime + HORIZON_S) {
      click(ac, next)
      if (onBeat) {
        const delay = Math.max(0, (next - ac.currentTime) * 1000)
        setTimeout(onBeat, delay)
      }
      next += beat
    }
  }, LOOKAHEAD_MS)

  return { stop: () => clearInterval(timer) }
}
