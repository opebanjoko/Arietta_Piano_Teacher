/**
 * The tap keyboard (SR-UI-04): permanent input fallback and dev/test simulator.
 * Emits source:'tap' NoteEvents through the same pipeline the mic will use.
 */
import { useState, useRef, useEffect } from 'preact/hooks'
import { nameToMidi, letter } from '../core/notes.js'
import { noteEvent } from '../core/events.js'

const OCTAVE_BLACKS = [
  { l: 'C#', after: 0 }, { l: 'D#', after: 1 },
  { l: 'F#', after: 3 }, { l: 'G#', after: 4 }, { l: 'A#', after: 5 }
]

/** One octave from C4 by default; `low` adds the left hand's C3 octave (Unit 6). */
function layout(low) {
  const octaves = low ? [3, 4] : [4]
  const whites = octaves.flatMap(o => ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(w => `${w}${o}`))
  whites.push(`C${octaves.at(-1) + 1}`)
  const blacks = octaves.flatMap((o, oi) =>
    OCTAVE_BLACKS.map(b => ({ note: `${b.l}${o}`, after: b.after + oi * 7 })))
  return { whites, blacks }
}

export function Keyboard({ onNote, glowMidi = null, showLabels = true, low = false }) {
  const [pressed, setPressed] = useState(null)
  const pressTO = useRef(null)
  useEffect(() => () => clearTimeout(pressTO.current), [])

  const tap = (name) => {
    setPressed(name)
    clearTimeout(pressTO.current)
    pressTO.current = setTimeout(() => setPressed(null), 170)
    onNote(noteEvent({ pitch: nameToMidi(name), source: 'tap', timestamp: performance.now() }))
  }

  const { whites, blacks } = layout(low)
  const w = 100 / whites.length

  return (
    <section style="flex:none;padding:2px 28px 18px;">
      <div style="border:1px solid var(--line-soft);border-radius:16px;overflow:hidden;background:var(--card-warm);box-shadow:0 10px 30px rgba(80,60,20,.09);">
        <div style="display:flex;align-items:center;gap:12px;padding:9px 14px;border-bottom:1px dashed var(--line-soft);">
          <div style="font-family:var(--mono);font-size:10px;letter-spacing:1.4px;color:var(--ink-mono);border:1px dashed #B9A87F;border-radius:6px;padding:3px 8px;background:var(--card);">MIC&nbsp;SIMULATOR</div>
          <div style="font-size:12.5px;color:var(--ink-mid);">Tap the keys you’d play on your real piano — I’ll pretend the microphone heard them.</div>
        </div>
        <div style="height:6px;background:linear-gradient(180deg,#A4453C,#8C362E);"></div>
        <div style="position:relative;height:168px;background:#241B12;">
          <div style="display:flex;height:100%;">
            {whites.map(name => {
              const isPressed = pressed === name
              const glow = glowMidi === nameToMidi(name)
              const bg = isPressed ? 'linear-gradient(180deg,#F1E3BE,#EAD9AC)'
                : glow ? 'linear-gradient(180deg,#FFF8E2,#F8ECC8)'
                : 'linear-gradient(180deg,#FFFDF6,#F4ECD9)'
              return (
                <div key={name} onPointerDown={() => tap(name)}
                  style={`flex:1;position:relative;z-index:1;border:1px solid #D9CBB4;border-top:none;border-radius:0 0 8px 8px;background:${bg};box-shadow:${isPressed ? 'inset 0 3px 10px rgba(90,60,20,.28)' : 'inset 0 -7px 0 rgba(214,198,166,.5)'};animation:${glow ? 'glowPulse 1.5s ease-in-out infinite' : 'none'};cursor:pointer;display:flex;align-items:flex-end;justify-content:center;padding-bottom:9px;transition:background .12s ease;touch-action:none;`}>
                  {name === 'C4' && <div style="position:absolute;top:110px;left:50%;transform:translateX(-50%);font-family:var(--mono);font-size:9.5px;letter-spacing:.8px;color:rgba(43,36,28,.42);white-space:nowrap;">middle&nbsp;C</div>}
                  <div style={`font-weight:800;font-size:14px;color:${glow ? 'var(--accent-ink)' : 'var(--ink-mid)'};opacity:${showLabels ? 1 : 0};`}>{letter(nameToMidi(name))}</div>
                </div>
              )
            })}
          </div>
          {blacks.map(b => (
            <div key={b.note} onPointerDown={() => tap(b.note)}
              style={`position:absolute;top:0;left:${(b.after + 1) * w - 0.296 * w}%;width:${0.592 * w}%;height:104px;background:${pressed === b.note ? 'linear-gradient(180deg,#6B5840,#4A3A28)' : 'linear-gradient(180deg,#423526,#241B12)'};border-radius:0 0 7px 7px;box-shadow:0 4px 8px rgba(20,12,4,.4);cursor:pointer;z-index:2;transition:background .12s ease;touch-action:none;`}></div>
          ))}
        </div>
      </div>
    </section>
  )
}
