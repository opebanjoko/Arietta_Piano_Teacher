/**
 * Self-hearing gate (SR-OUT-02): whatever the app plays through the speakers,
 * detection is suspended for — the teacher never grades her own output.
 * The synth reports here; the active mic (if any) honors it. No mic, no-op.
 */

let activeMic = null

export function registerMic(mic) {
  activeMic = mic
}

export function unregisterMic() {
  activeMic = null
}

export function holdFor(ms) {
  activeMic?.suspendFor(ms)
}

/**
 * Softer gate for accompaniment (SR-OUT-03): while a harmony voicing rings,
 * only its own pitch classes are deaf — the student's next melody note is
 * still heard, and the app still never grades its own output.
 */
export function holdPitches(pitches, ms) {
  activeMic?.ignorePitches(pitches, ms)
}
