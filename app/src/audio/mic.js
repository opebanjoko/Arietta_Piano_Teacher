/**
 * Mic controller (SR-AUD-01/02/12/13): capture -> worklet -> worker -> NoteEvents.
 * Echo cancellation and auto-gain are disabled (they distort pitch content);
 * noise suppression is configurable from calibration. Audio buffers exist only
 * in memory inside the worklet/worker — nothing is persisted or transmitted.
 *
 * Interruption handling (SR-PLT-02): iPad Safari ends the mic track or
 * suspends the AudioContext on backgrounding, Siri, or calls. The controller
 * watches for that and rebuilds its own graph via recovery.js, reporting
 * 'interrupted' while it works and 'lost' if it gives up — the tap keyboard
 * carries the lesson either way (SR-AUD-12).
 */
import workletUrl from './capture-worklet.js?worker&url'
import { registerMic } from './gate.js'
import { createRecovery } from './recovery.js'

export function createMic({ onNote, onNoteSet, onOnset, onState, onStats, detector = 'mpm', clarity = 0.9, lowClarity = null, noiseSuppression = false, poly = false } = {}) {
  let ctx = null
  let worker = null
  let stream = null
  let ownsStream = false // injected streams belong to their injector
  let state = 'idle'
  let resumeTO = null
  let recovery = null
  let closing = false // our own teardown must not read as an interruption
  let stopping = false // stop() wins over any in-flight recovery restart

  const setState = (s) => { if (stopping || s === state) return; state = s; onState?.(s) }
  const onVisibility = () => recovery?.visibility(!document.hidden)

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
    worker.postMessage({ type: 'config', detector, clarity, lowClarity, poly })
    worker.onmessage = (e) => {
      if (e.data.type === 'note') onNote?.(e.data.event)
      else if (e.data.type === 'noteset') onNoteSet?.(e.data.event)
      else if (e.data.type === 'onset') onOnset?.(e.data.event)
      else if (e.data.type === 'stats') onStats?.(e.data.avgMs)
    }

    ctx.onstatechange = () => { if (!closing && ctx) recovery?.ctxStateChanged(ctx.state) }
    stream.getAudioTracks().forEach(t => { t.onended = () => { if (!closing) recovery?.trackEnded() } })
    setState('listening')
  }

  /** Tear down the graph but keep config and callbacks (recovery restart path). */
  function unwire() {
    closing = true
    clearTimeout(resumeTO)
    if (ctx) ctx.onstatechange = null
    stream?.getAudioTracks().forEach(t => { t.onended = null })
    worker?.terminate()
    ctx?.close().catch(() => {})
    ctx = null
    worker = null
    closing = false
  }

  async function acquire() {
    const media = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression
      }
    })
    ownsStream = true
    return media
  }

  async function restart() {
    unwire()
    if (ownsStream) {
      stream?.getTracks().forEach(t => t.stop())
      const media = await acquire()
      if (stopping) { media.getTracks().forEach(t => t.stop()); throw new Error('mic stopped') }
      stream = media
    }
    await wire(stream)
    if (stopping) { unwire(); throw new Error('mic stopped') }
  }

  function armRecovery() {
    if (recovery) return
    recovery = createRecovery({ restart, onState: setState })
    document.addEventListener('visibilitychange', onVisibility)
  }

  const mic = {
    get state() { return state },

    /** Start from the real microphone. Throws on denial/absence — caller degrades to tap (SR-AUD-12). */
    async start() {
      // dev/test simulator seam (like the tap keyboard): a page-supplied
      // MediaStream stands in for the mic so the full pipeline runs headless
      if (window.__ariettaMicStream) {
        await wire(window.__ariettaMicStream)
        if (stopping) { unwire(); throw new Error('mic stopped') }
        armRecovery()
        return
      }
      const media = await acquire()
      if (stopping) { media.getTracks().forEach(t => t.stop()); throw new Error('mic stopped') }
      await wire(media)
      if (stopping) { unwire(); stream?.getTracks().forEach(t => t.stop()); throw new Error('mic stopped') }
      armRecovery()
    },

    /** Start from a supplied MediaStream (dev/test simulator path). */
    async startFromStream(mediaStream) {
      await wire(mediaStream)
      if (stopping) { unwire(); throw new Error('mic stopped') }
      armRecovery()
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

    setLowClarity(c) {
      lowClarity = c
      worker?.postMessage({ type: 'config', lowClarity: c })
    },

    setDetector(name) {
      detector = name
      worker?.postMessage({ type: 'config', detector: name })
    },

    /** Polyphonic mode per lesson (SR-AUD-10); mono lessons keep the v1 path. */
    setPoly(on) {
      poly = on
      worker?.postMessage({ type: 'config', poly: on })
    },

    stop() {
      if (stopping) return
      recovery?.stop()
      recovery = null
      document.removeEventListener('visibilitychange', onVisibility)
      unwire()
      if (ownsStream) stream?.getTracks().forEach(t => t.stop())
      stream = null
      setState('idle')
      stopping = true // after the final 'idle' — suppresses any later emission
    }
  }

  registerMic(mic)
  return mic
}
