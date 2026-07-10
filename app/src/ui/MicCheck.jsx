/**
 * "Can you hear me?" calibration (SR-AUD-11): plain-language permission ask,
 * play-any-note check, confirm the heard pitch, optional sensitivity slider.
 * Denial or absence degrades gracefully to tap mode (SR-AUD-12).
 */
import { useState, useRef, useEffect } from 'preact/hooks'
import { createMic } from '../audio/mic.js'
import { letter } from '../core/notes.js'
import { VOICE } from '../content/voice.js'
import { ListeningPill } from './ListeningPill.jsx'

const fill = (t, vals) => t.replace(/\{(\w+)\}/g, (_, k) => vals[k])

// slider 0..100 -> clarity threshold: Careful 0.95 .. Eager 0.82
const toClarity = (v) => 0.95 - (v / 100) * 0.13
const fromClarity = (c) => Math.round(((0.95 - c) / 0.13) * 100)

export function MicCheck({ initialClarity = 0.9, onDone }) {
  const [stage, setStage] = useState('intro') // intro | listening | confirm | denied
  const [heard, setHeard] = useState(null)
  const [sens, setSens] = useState(fromClarity(initialClarity))
  const [lowStage, setLowStage] = useState('idle') // idle | listening | heard
  const micRef = useRef(null)
  const lowStageRef = useRef('idle') // mirrors lowStage for the onNote closure (created once in begin)
  const lowClarityRef = useRef(null)
  const relaxRef = useRef(null)

  useEffect(() => () => { micRef.current?.stop(); clearInterval(relaxRef.current) }, [])

  const begin = async () => {
    const mic = createMic({
      clarity: toClarity(sens),
      onNote: (ev) => {
        if (lowStageRef.current === 'listening' && ev.pitch < 55) {
          clearInterval(relaxRef.current)
          lowStageRef.current = 'heard'
          setLowStage('heard')
          return
        }
        setHeard(ev.pitch)
        setStage(s => (s === 'listening' || s === 'confirm') ? 'confirm' : s)
      }
    })
    micRef.current = mic
    try {
      await mic.start()
      setStage('listening')
    } catch {
      mic.stop()
      setStage('denied')
    }
  }

  const beginLow = () => {
    lowStageRef.current = 'listening'
    setLowStage('listening')
    lowClarityRef.current = toClarity(sens)
    micRef.current?.setLowClarity(lowClarityRef.current)
    relaxRef.current = setInterval(() => {
      lowClarityRef.current = Math.max(0.78, lowClarityRef.current - 0.03)
      micRef.current?.setLowClarity(lowClarityRef.current)
    }, 2000)
  }

  const finish = (enabled) => {
    clearInterval(relaxRef.current)
    micRef.current?.stop()
    onDone({
      enabled,
      clarity: toClarity(sens),
      detector: 'mpm',
      lowClarity: lowStage === 'heard' ? lowClarityRef.current : undefined
    })
  }

  const v = VOICE.micCheck
  return (
    <div class="screen" style="align-items:center;justify-content:center;animation:fadeUp .4s ease;">
      <div style="background:var(--card);border:1px solid var(--line);border-radius:22px;padding:44px 54px;box-shadow:0 10px 30px rgba(80,60,20,.07);text-align:center;max-width:600px;">
        {stage === 'intro' && <>
          <div class="kicker">{v.kicker}</div>
          <div style="font-family:var(--serif);font-weight:600;font-size:34px;margin-top:8px;">{v.title}</div>
          <div style="font-size:15.5px;color:var(--ink-soft);margin-top:10px;text-wrap:pretty;">{v.line}</div>
          <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-top:24px;">
            <button class="btn-primary" onClick={begin}>{v.allow}</button>
            <button class="btn-quiet" onClick={() => finish(false)} style="padding:12px 20px;">{v.later}</button>
          </div>
        </>}

        {stage === 'listening' && <>
          <div style="display:flex;justify-content:center;"><ListeningPill text="Listening…" /></div>
          <div style="font-family:var(--serif);font-weight:600;font-size:30px;margin-top:16px;">{v.listenTitle}</div>
          <div style="font-size:15.5px;color:var(--ink-soft);margin-top:8px;">{v.listenLine}</div>
        </>}

        {stage === 'confirm' && <>
          <div style="display:flex;justify-content:center;"><ListeningPill text={`Heard ${letter(heard)}`} active /></div>
          <div style="font-family:var(--serif);font-weight:600;font-size:34px;margin-top:16px;">{fill(v.heardTitle, { note: letter(heard) })}</div>
          <div style="font-size:15.5px;color:var(--ink-soft);margin-top:8px;">{v.heardLine}</div>
          <div style="margin-top:20px;font-size:13px;color:var(--ink-mid);text-wrap:pretty;">{v.sensitivity}</div>
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:8px;">
            <span style="font-size:12px;font-weight:700;color:var(--ink-mid);">{v.sensLow}</span>
            <input type="range" min="0" max="100" value={sens}
              onInput={e => { const val = Number(e.currentTarget.value); setSens(val); micRef.current?.setClarity(toClarity(val)) }}
              style="width:220px;accent-color:var(--accent-ink);" />
            <span style="font-size:12px;font-weight:700;color:var(--ink-mid);">{v.sensHigh}</span>
          </div>
          {lowStage === 'idle' && <div style="margin-top:16px;"><button class="btn-quiet" onClick={beginLow}>{v.lowOffer}</button></div>}
          {lowStage === 'listening' && <div style="font-size:14px;color:var(--ink-soft);margin-top:16px;">{v.lowListening}</div>}
          {lowStage === 'heard' && <div style="font-size:14px;color:var(--ink-mid);margin-top:16px;">{v.lowHeard}</div>}
          <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-top:22px;">
            <button class="btn-primary" onClick={() => finish(true)}>{v.confirm}</button>
            <button class="btn-quiet" onClick={() => { setHeard(null); setStage('listening') }} style="padding:12px 20px;">{v.retry}</button>
          </div>
        </>}

        {stage === 'denied' && <>
          <div style="font-family:var(--serif);font-weight:600;font-size:34px;">{v.deniedTitle}</div>
          <div style="font-size:15.5px;color:var(--ink-soft);margin-top:10px;text-wrap:pretty;">{v.deniedLine}</div>
          <button class="btn-primary" onClick={() => finish(false)} style="margin-top:22px;">{v.deniedButton}</button>
        </>}
      </div>
    </div>
  )
}
