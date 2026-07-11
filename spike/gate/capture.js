/**
 * Mic capture for the gate app: getUserMedia (product constraints: mono, no
 * echo cancellation, no auto-gain) -> capture worklet -> contiguous Float32
 * audio. The worklet posts overlapping 2048-sample frames at a 1024 hop, so
 * the first frame is kept whole and each later frame contributes its second
 * half. `window.__gateStream` stands in for the mic in headless tests.
 */
export function createCapture() {
  let ctx = null;
  let node = null;
  let stream = null;
  let owns = false;
  let sampleRate = 48000;
  let first = true;
  const listeners = new Set();

  async function start() {
    stream = window.__gateStream ?? await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: false, autoGainControl: false, noiseSuppression: false }
    });
    owns = !window.__gateStream;
    ctx = new AudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    sampleRate = ctx.sampleRate;
    await ctx.audioWorklet.addModule(new URL('../worklet.js', import.meta.url));
    node = new AudioWorkletNode(ctx, 'capture');
    ctx.createMediaStreamSource(stream).connect(node);
    const silent = ctx.createGain();
    silent.gain.value = 0;
    node.connect(silent).connect(ctx.destination);
    first = true;
    node.port.onmessage = (e) => {
      const { frame } = e.data;
      const fresh = first ? frame : frame.subarray(1024);
      first = false;
      for (const fn of [...listeners]) fn(fresh);
    };
    return { sampleRate };
  }

  const concat = (chunks, total) => {
    const out = new Float32Array(total);
    let p = 0;
    for (const c of chunks) { out.set(c, p); p += c.length; }
    return out;
  };

  function record(sec) {
    return new Promise((resolve) => {
      const need = Math.ceil(sec * sampleRate);
      const chunks = [];
      let got = 0;
      const fn = (fresh) => {
        chunks.push(fresh.slice());
        got += fresh.length;
        if (got >= need) {
          listeners.delete(fn);
          resolve(concat(chunks, got).subarray(0, need));
        }
      };
      listeners.add(fn);
    });
  }

  function live(onChunk, chunkSec = 1.5) {
    const need = Math.ceil(chunkSec * sampleRate);
    let chunks = [];
    let got = 0;
    const fn = (fresh) => {
      chunks.push(fresh.slice());
      got += fresh.length;
      if (got >= need) {
        const out = concat(chunks, got);
        chunks = [];
        got = 0;
        onChunk(out);
      }
    };
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function stop() {
    if (node) node.port.onmessage = null;
    ctx?.close().catch(() => {});
    if (owns) stream?.getTracks().forEach(t => t.stop());
    ctx = null;
    node = null;
    stream = null;
    listeners.clear();
  }

  return { start, record, live, stop, get sampleRate() { return sampleRate; } };
}
