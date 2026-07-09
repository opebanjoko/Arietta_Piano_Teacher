/**
 * Detection worker: frames in (straight from the capture worklet), NoteEvents
 * out. Runs the pitch detector and note tracker off the UI thread (SR-AUD-02).
 * Silence over guessing is enforced by the tracker's clarity threshold
 * (SR-AUD-05); while suspended, frames are dropped so the app never grades
 * its own playback (SR-OUT-02).
 */
import { yin, mpm, rms } from './detect/pitch.js'
import { NoteTracker } from './detect/tracker.js'
import { OnsetTracker } from './detect/onset.js'

const DETECTORS = { yin, mpm }

let detect = mpm
let tracker = new NoteTracker()
let onsets = new OnsetTracker()
let clarity = 0.9
let sampleRate = 48000
let suspendedUntil = 0
let ignores = [] // [{pcs:Set<pitch class>, untilMs}] — ringing accompaniment voicings
let statSum = 0
let statN = 0

function ignored(pitch, timeMs) {
  ignores = ignores.filter(i => timeMs < i.untilMs)
  return ignores.some(i => i.pcs.has(pitch % 12))
}

function onFrame({ frame, timeMs }) {
  if (timeMs < suspendedUntil) return
  const t0 = performance.now()
  const level = rms(frame)
  const ev = tracker.feed(detect(frame, sampleRate), level, timeMs)
  if (ev && !ignored(ev.pitch, timeMs)) postMessage({ type: 'note', event: ev })
  const onset = onsets.feed(level, timeMs)
  if (onset) postMessage({ type: 'onset', event: onset })
  statSum += performance.now() - t0
  if (++statN >= 200) {
    postMessage({ type: 'stats', avgMs: statSum / statN })
    statSum = 0
    statN = 0
  }
}

onmessage = (e) => {
  const m = e.data
  if (m.type === 'port') {
    sampleRate = m.sampleRate
    e.ports[0].onmessage = (fe) => onFrame(fe.data)
  } else if (m.type === 'config') {
    if (m.detector) detect = DETECTORS[m.detector] ?? detect
    if (m.clarity !== undefined) clarity = m.clarity
    tracker = new NoteTracker({ minClarity: clarity })
  } else if (m.type === 'ignore') {
    ignores.push({ pcs: new Set(m.pitches.map(p => p % 12)), untilMs: m.untilMs })
  } else if (m.type === 'suspend') {
    // audio-clock horizon: frames stamped before this are app playback ringing out
    suspendedUntil = m.untilMs
    tracker = new NoteTracker({ minClarity: clarity })
    onsets = new OnsetTracker()
  }
}
