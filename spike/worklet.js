/**
 * Capture worklet: accumulates mic samples and posts overlapping analysis
 * frames (2048 samples, 1024 hop) to the main thread with end-of-frame
 * timestamps in audio-clock milliseconds.
 */
const FRAME = 2048;
const HOP = 1024;

class CaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.fifo = new Float32Array(FRAME * 4);
    this.fifoLen = 0;
    this.fifoStart = 0; // absolute sample index of fifo[0]
  }

  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;

    if (this.fifoLen + ch.length > this.fifo.length) {
      // Should not happen (we drain every hop), but never grow unbounded.
      this.fifoLen = 0;
      this.fifoStart = currentFrame;
    }
    this.fifo.set(ch, this.fifoLen);
    this.fifoLen += ch.length;

    while (this.fifoLen >= FRAME) {
      const frame = this.fifo.slice(0, FRAME);
      const endSample = this.fifoStart + FRAME;
      this.port.postMessage({ frame, tMs: (endSample / sampleRate) * 1000 }, [frame.buffer]);
      this.fifo.copyWithin(0, HOP, this.fifoLen);
      this.fifoLen -= HOP;
      this.fifoStart += HOP;
    }
    return true;
  }
}

registerProcessor('capture', CaptureProcessor);
