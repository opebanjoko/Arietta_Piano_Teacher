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
import { PolyTracker, applyIgnores } from './detect/poly.js'

const DETECTORS = { yin, mpm }

let detect = mpm
let tracker = new NoteTracker()
let onsets = new OnsetTracker()
let poly = false
let polyTracker = null
let clarity = 0.9
let lowClarity = null
let sampleRate = 48000
let suspendedUntil = 0
let ignores = [] // [{pcs:Set<pitch class>, untilMs}] — ringing accompaniment voicings
let statSum = 0
let statN = 0

function ignoredPcs(timeMs) {
  ignores = ignores.filter(i => timeMs < i.untilMs)
  const pcs = new Set()
  for (const i of ignores) for (const pc of i.pcs) pcs.add(pc)
  return pcs
}

function onFrame({ frame, timeMs }) {
  if (timeMs < suspendedUntil) return
  const t0 = performance.now()
  const level = rms(frame)
  if (poly) {
    const raw = polyTracker.feed(frame, timeMs)
    const ev = raw && applyIgnores(raw, ignoredPcs(timeMs))
    if (ev) postMessage({ type: ev.pitches ? 'noteset' : 'note', event: ev })
  } else {
    const ev = tracker.feed(detect(frame, sampleRate), level, timeMs)
    if (ev && !ignoredPcs(timeMs).has(ev.pitch % 12)) postMessage({ type: 'note', event: ev })
  }
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
    if (m.lowClarity !== undefined) lowClarity = m.lowClarity
    if (m.poly !== undefined) poly = m.poly
    tracker = new NoteTracker({ minClarity: clarity, lowClarity })
    polyTracker = poly ? new PolyTracker({ sampleRate }) : null
  } else if (m.type === 'ignore') {
    ignores.push({ pcs: new Set(m.pitches.map(p => p % 12)), untilMs: m.untilMs })
  } else if (m.type === 'suspend') {
    // audio-clock horizon: frames stamped before this are app playback ringing out
    suspendedUntil = m.untilMs
    tracker = new NoteTracker({ minClarity: clarity, lowClarity })
    if (poly) polyTracker = new PolyTracker({ sampleRate })
    onsets = new OnsetTracker()
  }
}
