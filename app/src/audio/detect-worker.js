/**
 * Detection worker: frames in (straight from the capture worklet), NoteEvents
 * out. Runs the pitch detector and note tracker off the UI thread (SR-AUD-02).
 * Silence over guessing is enforced by the tracker's clarity threshold
 * (SR-AUD-05); while suspended, frames are dropped so the app never grades
 * its own playback (SR-OUT-02).
 */
import { yin, mpm, rms } from './detect/pitch.js'
import { NoteTracker } from './detect/tracker.js'

const DETECTORS = { yin, mpm }

let detect = mpm
let tracker = new NoteTracker()
let clarity = 0.9
let sampleRate = 48000
let suspendedUntil = 0

function onFrame({ frame, timeMs }) {
  if (timeMs < suspendedUntil) return
  const ev = tracker.feed(detect(frame, sampleRate), rms(frame), timeMs)
  if (ev) postMessage({ type: 'note', event: ev })
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
  } else if (m.type === 'suspend') {
    // audio-clock horizon: frames stamped before this are app playback ringing out
    suspendedUntil = m.untilMs
    tracker = new NoteTracker({ minClarity: clarity })
  }
}
