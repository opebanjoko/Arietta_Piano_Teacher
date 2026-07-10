/**
 * MIDI input adapter (SR-MID-01): a connected digital piano is normalized to
 * NoteEvents (source:'midi', velocity 0..1) and preferred over the mic —
 * perfect accuracy, immune to room noise, works with headphones.
 *
 * iPad Safari has no Web MIDI (SR-MID-02): requestMIDIAccess is absent and
 * this resolves to null; the mic path carries the lesson. The decision record
 * (docs/decisions/2026-07-10-native-shell.md) covers the eventual thin shell.
 * The engine never sees the difference (SR-EVT-02).
 */
import { noteEvent } from '../core/events.js'

export async function createMidiInput({ onNote, onDevices, midiAccess } = {}) {
  const access = midiAccess !== undefined
    ? midiAccess
    : await (navigator.requestMIDIAccess?.({ sysex: false }).catch(() => null) ?? null)
  if (!access) return null

  let stopped = false

  const handle = (e) => {
    if (stopped) return
    const [status, pitch, vel] = e.data
    if ((status & 0xf0) !== 0x90 || vel === 0) return
    if (pitch < 48 || pitch > 96) return
    onNote(noteEvent({ pitch, source: 'midi', velocity: vel / 127, timestamp: performance.now() }))
  }

  const wire = () => {
    for (const port of access.inputs.values()) port.onmidimessage = handle
    onDevices?.(access.inputs.size)
  }

  access.onstatechange = wire
  wire()

  return {
    count: () => access.inputs.size,
    stop() {
      stopped = true
      access.onstatechange = null
      for (const port of access.inputs.values()) port.onmidimessage = null
    }
  }
}
