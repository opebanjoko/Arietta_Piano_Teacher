/**
 * Watch-me demo (SR-UI-05): a looping modeled hand doing the new physical
 * thing — drawn and animated in code, so it ships inside the app bundle and
 * costs nothing offline. Driven by step data:
 *   anim: { keys: ['C4','D4','E4'], fingers: [1,2,3], hand: 'right' | 'left' }
 * With together: true (chords, SR-AUD-10) every finger lands at once.
 */
import { useState, useEffect } from 'preact/hooks'
import { nameToMidi, letter, whiteIndex, isBlack } from '../core/notes.js'

const STEP_MS = 850
const REST_MS = 1300

// finger capsules left-to-right across a right hand seen from above:
// thumb (1) leftmost and short, middle (3) tallest.
const FINGER_X = { 1: 10, 2: 30, 3: 46, 4: 62, 5: 78 }
const FINGER_H = { 1: 26, 2: 44, 3: 50, 4: 44, 5: 34 }

function Hand({ active: activeFingers, side }) {
  const fingers = [1, 2, 3, 4, 5]
  return (
    <svg width="92" height="96" viewBox="0 0 92 96"
      style={`overflow:visible;${side === 'left' ? 'transform:scaleX(-1);' : ''}`}>
      <ellipse cx="46" cy="82" rx="34" ry="22" fill="var(--accent-soft)"
        stroke="var(--line-strong)" stroke-width="1.5" />
      {fingers.map(f => {
        const active = activeFingers.includes(f)
        return (
          <rect x={FINGER_X[f] - 6} y={66 - FINGER_H[f] - (active ? 10 : 0)}
            width="13" height={FINGER_H[f] + 18 + (active ? 10 : 0)} rx="6.5"
            fill={active ? 'var(--accent)' : 'var(--accent-soft)'}
            stroke={active ? 'var(--accent-ink)' : 'var(--line-strong)'} stroke-width="1.5"
            style="transition:all .28s ease;" />
        )
      })}
    </svg>
  )
}

export function WatchMe({ anim }) {
  const { keys, fingers, hand = 'right', together = false } = anim
  const [at, setAt] = useState(0) // 0..keys.length-1, or -1 resting between loops

  useEffect(() => {
    let i = 0
    setAt(0)
    let t
    const tick = () => {
      i = together ? (i === -1 ? 0 : -1) : i >= keys.length - 1 ? -1 : i + 1
      setAt(i)
      t = setTimeout(tick, i === -1 ? REST_MS : STEP_MS)
    }
    t = setTimeout(tick, together ? STEP_MS * 1.6 : STEP_MS)
    return () => clearTimeout(t)
  }, [anim])

  // draw the whites of the octave the demo lives in
  const midis = keys.map(nameToMidi)
  const base = Math.floor(Math.min(...midis) / 12) * 12
  const whites = Array.from({ length: 8 }, (_, i) => base + [0, 2, 4, 5, 7, 9, 11, 12][i])
  const pressedMidis = at < 0 ? [] : together ? midis : [midis[at]]
  const activeFingers = at < 0 ? [] : together ? fingers : [fingers[at]]
  const handAt = together ? Math.floor((keys.length - 1) / 2) : at >= 0 ? at : 0
  const keyPct = 100 / whites.length
  const handLeft = (whiteIndex(midis[handAt]) - whiteIndex(base)) * keyPct + keyPct / 2

  return (
    <div style="width:420px;max-width:80vw;">
      <div style="position:relative;height:100px;pointer-events:none;">
        <div style={`position:absolute;bottom:-14px;left:${handLeft}%;transform:translateX(-${hand === 'right' ? FINGER_X[fingers[handAt]] + 1 : 92 - FINGER_X[fingers[handAt]] - 1}px);transition:left .32s ease, transform .32s ease;z-index:2;`}>
          <Hand active={activeFingers} side={hand} />
        </div>
      </div>
      <div style="position:relative;height:92px;border:1px solid var(--line-soft);border-radius:10px;overflow:hidden;background:#241B12;">
        <div style="display:flex;height:100%;">
          {whites.map(m => {
            const pressed = pressedMidis.includes(m)
            return (
              <div style={`flex:1;position:relative;border:1px solid #D9CBB4;border-top:none;border-radius:0 0 6px 6px;background:${pressed ? 'linear-gradient(180deg,#F1E3BE,#EAD9AC)' : 'linear-gradient(180deg,#FFFDF6,#F4ECD9)'};box-shadow:${pressed ? 'inset 0 3px 8px rgba(90,60,20,.28)' : 'inset 0 -5px 0 rgba(214,198,166,.5)'};display:flex;align-items:flex-end;justify-content:center;padding-bottom:6px;transition:background .15s ease;`}>
                <div style={`font-weight:800;font-size:11px;color:${pressed ? 'var(--accent-ink)' : 'var(--ink-faint)'};`}>{letter(m)}</div>
              </div>
            )
          })}
        </div>
        {whites.slice(0, -1).map((m, i) => isBlack(m + 1) && (
          <div style={`position:absolute;top:0;left:${(i + 1) * keyPct - keyPct * 0.28}%;width:${keyPct * 0.56}%;height:56px;background:linear-gradient(180deg,#423526,#241B12);border-radius:0 0 4px 4px;z-index:1;`}></div>
        ))}
      </div>
      <div style="text-align:center;margin-top:10px;font-size:13px;color:var(--ink-soft);">
        {at < 0 ? <span>…and again</span>
          : together ? <span>fingers <b style="color:var(--accent-ink);">{fingers.join('·')}</b> land together on <b style="color:var(--accent-ink);">{midis.map(letter).join('·')}</b></span>
          : <span>finger <b style="color:var(--accent-ink);">{fingers[at]}</b> on <b style="color:var(--accent-ink);">{letter(midis[at])}</b></span>}
      </div>
    </div>
  )
}
