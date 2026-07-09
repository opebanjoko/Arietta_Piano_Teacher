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
