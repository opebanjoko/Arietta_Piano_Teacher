/**
 * Mic controller (SR-AUD-01/02/12/13): capture -> worklet -> worker -> NoteEvents.
 * Echo cancellation and auto-gain are disabled (they distort pitch content);
 * noise suppression is configurable from calibration. Audio buffers exist only
 * in memory inside the worklet/worker — nothing is persisted or transmitted.
 */
import workletUrl from './capture-worklet.js?worker&url'
import { registerMic } from './gate.js'

export function createMic({ onNote, onOnset, onState, detector = 'mpm', clarity = 0.9, noiseSuppression = false } = {}) {
  let ctx = null
  let worker = null
  let stream = null
  let ownsStream = false // injected streams belong to their injector
  let state = 'idle'
  let resumeTO = null

  const setState = (s) => { if (s !== state) { state = s; onState?.(s) } }

  async function wire(mediaStream) {
    stream = mediaStream
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') await ctx.resume()
    await ctx.audioWorklet.addModule(workletUrl)
    const node = new AudioWorkletNode(ctx, 'arietta-capture', { numberOfOutputs: 1 })
    const silent = ctx.createGain()
    silent.gain.value = 0
    ctx.createMediaStreamSource(stream).connect(node)
    node.connect(silent).connect(ctx.destination) // keeps the graph pulling

    worker = new Worker(new URL('./detect-worker.js', import.meta.url), { type: 'module' })
    const mc = new MessageChannel()
    node.port.postMessage({ type: 'port' }, [mc.port1])
    worker.postMessage({ type: 'port', sampleRate: ctx.sampleRate }, [mc.port2])
    worker.postMessage({ type: 'config', detector, clarity })
    worker.onmessage = (e) => {
      if (e.data.type === 'note') onNote?.(e.data.event)
      else if (e.data.type === 'onset') onOnset?.(e.data.event)
    }
    setState('listening')
  }

  const mic = {
    get state() { return state },

    /** Start from the real microphone. Throws on denial/absence — caller degrades to tap (SR-AUD-12). */
    async start() {
      // dev/test simulator seam (like the tap keyboard): a page-supplied
      // MediaStream stands in for the mic so the full pipeline runs headless
      if (window.__ariettaMicStream) {
        await wire(window.__ariettaMicStream)
        return
      }
      const media = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression
        }
      })
      ownsStream = true
      await wire(media)
    },

    /** Start from a supplied MediaStream (dev/test simulator path). */
    async startFromStream(mediaStream) {
      await wire(mediaStream)
    },

    /** SR-OUT-02: drop detection while app audio sounds, on the audio clock. */
    suspendFor(ms) {
      if (!ctx || !worker) return
      worker.postMessage({ type: 'suspend', untilMs: ctx.currentTime * 1000 + ms })
      setState('suspended')
      clearTimeout(resumeTO)
      resumeTO = setTimeout(() => { if (state === 'suspended') setState('listening') }, ms)
    },

    /** SR-OUT-02 for accompaniment: deafen only the sounded pitch classes. */
    ignorePitches(pitches, ms) {
      if (!ctx || !worker) return
      worker.postMessage({ type: 'ignore', pitches, untilMs: ctx.currentTime * 1000 + ms })
    },

    setClarity(c) {
      clarity = c
      worker?.postMessage({ type: 'config', clarity: c })
    },

    setDetector(name) {
      detector = name
      worker?.postMessage({ type: 'config', detector: name })
    },

    stop() {
      clearTimeout(resumeTO)
      if (ownsStream) stream?.getTracks().forEach(t => t.stop())
      worker?.terminate()
      ctx?.close()
      ctx = null; worker = null; stream = null
      setState('idle')
    }
  }

  registerMic(mic)
  return mic
}
