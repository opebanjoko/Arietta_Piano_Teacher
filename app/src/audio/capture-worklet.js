/**
 * AudioWorkletProcessor: slices the mic input into overlapping analysis frames
 * (2048 samples, 1024 hop) and ships them straight to the detection worker
 * over a MessageChannel — the UI thread never touches audio (SR-AUD-02).
 * Frames only ever live in memory (SR-AUD-13).
 */

const FRAME = 2048
const HOP = 1024

class CaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buf = new Float32Array(FRAME)
    this.filled = 0
    this.sinceHop = 0
    this.out = null
    this.port.onmessage = (e) => {
      if (e.data.type === 'port') this.out = e.ports[0]
    }
  }

  process(inputs) {
    const ch = inputs[0]?.[0]
    if (!ch || !this.out) return true

    for (let i = 0; i < ch.length; i++) {
      if (this.filled < FRAME) {
        this.buf[this.filled++] = ch[i]
      } else {
        this.buf.copyWithin(0, 1)
        this.buf[FRAME - 1] = ch[i]
      }
      this.sinceHop++
    }

    if (this.filled === FRAME && this.sinceHop >= HOP) {
      this.sinceHop = 0
      const frame = this.buf.slice()
      this.out.postMessage({ frame, timeMs: currentTime * 1000 }, [frame.buffer])
    }
    return true
  }
}

registerProcessor('arietta-capture', CaptureProcessor)
