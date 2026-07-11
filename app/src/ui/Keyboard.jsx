/**
 * The tap keyboard (SR-UI-04): permanent input fallback and dev/test simulator.
 * Emits source:'tap' NoteEvents through the same pipeline the mic will use.
 */
import { useState, useRef, useEffect } from 'preact/hooks'
import { nameToMidi, letter, letterIn } from '../core/notes.js'
import { noteEvent } from '../core/events.js'

const OCTAVE_BLACKS = [
  { l: 'C#', after: 0 }, { l: 'D#', after: 1 },
  { l: 'F#', after: 3 }, { l: 'G#', after: 4 }, { l: 'A#', after: 5 }
]

/** Spoken key name: 'C 4, middle C', 'F sharp 4', 'B flat 3'. */
function keyLabel(name, flats) {
  const midi = nameToMidi(name)
  const l = letterIn(midi, flats)
  const spoken = l.length > 1 ? `${l[0]} ${l[1] === '#' ? 'sharp' : 'flat'}` : l
  const octave = Math.floor(midi / 12) - 1
  return midi === 60 ? `${spoken} ${octave}, middle C` : `${spoken} ${octave}`
}

/**
 * One octave from C4 by default; `low` adds the left hand's C3 octave
 * (Unit 6), `high` adds the octave up to C6 (G position and beyond).
 */
function layout(low, high) {
  const octaves = [...(low ? [3] : []), 4, ...(high ? [5] : [])]
  const whites = octaves.flatMap(o => ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(w => `${w}${o}`))
  whites.push(`C${octaves.at(-1) + 1}`)
  const blacks = octaves.flatMap((o, oi) =>
    OCTAVE_BLACKS.map(b => ({ note: `${b.l}${o}`, after: b.after + oi * 7 })))
  return { whites, blacks }
}

export function Keyboard({ onNote, glowMidi = null, showLabels = true, low = false, high = false, flats = false }) {
  const [pressed, setPressed] = useState(() => new Set())
  const pressTOs = useRef(new Map())
  useEffect(() => () => { for (const t of pressTOs.current.values()) clearTimeout(t) }, [])

  // chords are real now (SR-AUD-10): each key presses independently so a
  // rolled or two-handed chord lights every key it touches
  const tap = (name) => {
    setPressed(p => new Set(p).add(name))
    clearTimeout(pressTOs.current.get(name))
    pressTOs.current.set(name, setTimeout(() =>
      setPressed(p => { const n = new Set(p); n.delete(name); return n }), 170))
    onNote(noteEvent({ pitch: nameToMidi(name), source: 'tap', timestamp: performance.now() }))
  }

  // pointer taps go through onPointerDown; Enter/Space covers keyboard users
  const keyPress = (name) => (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); tap(name) }
  }

  const { whites, blacks } = layout(low, high)
  const w = 100 / whites.length
  // multi-octave layouts shrink every key; widen blacks there so small fingers still land them
  const blackW = (whites.length > 8 ? 0.7 : 0.592) * w

  return (
    <section style="flex:none;padding:2px 28px max(18px, env(safe-area-inset-bottom));">
      <div style="border:1px solid var(--line-soft);border-radius:16px;overflow:hidden;background:var(--card-warm);box-shadow:0 10px 30px rgba(80,60,20,.09);">
        <div style="display:flex;align-items:center;gap:12px;padding:9px 14px;border-bottom:1px dashed var(--line-soft);">
          <div style="font-family:var(--mono);font-size:10px;letter-spacing:1.4px;color:var(--ink-mono);border:1px dashed #B9A87F;border-radius:6px;padding:3px 8px;background:var(--card);">MIC&nbsp;SIMULATOR</div>
          <div style="font-size:13.5px;color:var(--ink-mid);">Tap the keys you’d play on your real piano — I’ll pretend the microphone heard them.</div>
        </div>
        <div style="height:6px;background:linear-gradient(180deg,#A4453C,#8C362E);"></div>
        <div role="group" aria-label="Piano keys — tap to play" style="position:relative;height:168px;background:#241B12;">
          <div style="display:flex;height:100%;">
            {whites.map(name => {
              const isPressed = pressed.has(name)
              const glow = glowMidi === nameToMidi(name)
              const bg = isPressed ? 'linear-gradient(180deg,#F1E3BE,#EAD9AC)'
                : glow ? 'linear-gradient(180deg,#FFF8E2,#F8ECC8)'
                : 'linear-gradient(180deg,#FFFDF6,#F4ECD9)'
              return (
                <div key={name} onPointerDown={() => tap(name)}
                  role="button" tabIndex={0} aria-label={keyLabel(name, flats)} onKeyDown={keyPress(name)}
                  style={`flex:1;position:relative;z-index:1;border:1px solid #D9CBB4;border-top:none;border-radius:0 0 8px 8px;background:${bg};box-shadow:${isPressed ? 'inset 0 3px 10px rgba(90,60,20,.28)' : 'inset 0 -7px 0 rgba(214,198,166,.5)'};animation:${glow ? 'glowPulse 1.5s ease-in-out infinite' : 'none'};cursor:pointer;display:flex;align-items:flex-end;justify-content:center;padding-bottom:9px;transition:background .12s ease;touch-action:none;`}>
                  {name === 'C4' && <div style="position:absolute;top:110px;left:50%;transform:translateX(-50%);font-family:var(--mono);font-size:9.5px;letter-spacing:.8px;color:rgba(43,36,28,.42);white-space:nowrap;">middle&nbsp;C</div>}
                  <div style={`font-weight:800;font-size:14px;color:${glow ? 'var(--accent-ink)' : 'var(--ink-mid)'};opacity:${showLabels ? 1 : 0};`}>{letter(nameToMidi(name))}</div>
                </div>
              )
            })}
          </div>
          {blacks.map(b => {
            const midi = nameToMidi(b.note)
            const glow = glowMidi === midi
            return (
              <div key={b.note} onPointerDown={() => tap(b.note)}
                role="button" tabIndex={0} aria-label={keyLabel(b.note, flats)} onKeyDown={keyPress(b.note)}
                style={`position:absolute;top:0;left:${(b.after + 1) * w - blackW / 2}%;width:${blackW}%;height:104px;background:${pressed.has(b.note) ? 'linear-gradient(180deg,#6B5840,#4A3A28)' : glow ? 'linear-gradient(180deg,#5C4A32,#3A2C1C)' : 'linear-gradient(180deg,#423526,#241B12)'};border-radius:0 0 7px 7px;box-shadow:0 4px 8px rgba(20,12,4,.4);cursor:pointer;z-index:2;transition:background .12s ease;touch-action:none;display:flex;align-items:flex-end;justify-content:center;padding-bottom:7px;animation:${glow ? 'glowPulse 1.5s ease-in-out infinite' : 'none'};`}>
                {showLabels && glow && <div style="font-weight:800;font-size:11px;color:#EFE3C4;">{letterIn(midi, flats)}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
