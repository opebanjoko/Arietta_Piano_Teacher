/**
 * Treble staff with note letters and mandatory finger numbers (SR-CRS-05).
 * Notes are laid out for C4-C5; C4 gets its ledger line.
 */
import { nameToMidi, letter, whiteIndex } from '../core/notes.js'

const C4 = nameToMidi('C4')
const Y_C4 = 116

function noteY(midi) {
  return Y_C4 - (whiteIndex(midi) - whiteIndex(C4)) * 7
}

const FILL = {
  played: 'var(--sage)', current: 'var(--accent)', demo: 'var(--accent-ink)', up: '#C9BC9F'
}
const LABEL = {
  played: 'var(--sage)', current: 'var(--accent-ink)', demo: 'var(--accent-ink)', up: '#B4A585'
}

/**
 * notes: [{ note, finger, status }] — status 'played' | 'current' | 'demo' | 'up'
 */
export function Staff({ notes, width = 620, height = 166 }) {
  const k = notes.length
  const step = k > 1 ? Math.min(120, (width - 200) / (k - 1)) : 0
  const start = width / 2 - ((k - 1) * step) / 2 + 30

  return (
    <div style="background:var(--card);border:1px solid var(--line);border-radius:18px;padding:8px 26px 0;box-shadow:0 8px 24px rgba(80,60,20,.06);">
      <div style={`position:relative;width:${width}px;max-width:86vw;height:${height}px;`}>
        {[0, 1, 2, 3, 4].map(i => (
          <div style={`position:absolute;left:0;right:0;height:1.6px;background:rgba(43,36,28,.5);top:${46 + i * 14}px;`}></div>
        ))}
        <div style="position:absolute;left:14px;top:20px;font-family:var(--music);font-size:78px;line-height:1;color:var(--ink);">𝄞</div>
        {notes.map((n, i) => {
          const midi = nameToMidi(n.note)
          const y = noteY(midi)
          const x = ((start + i * step) / width * 100).toFixed(2)
          const fill = FILL[n.status], label = LABEL[n.status]
          return (
            <div style={`position:absolute;left:${x}%;top:${y}px;width:0;height:0;`}>
              <div style={`position:absolute;left:-20px;top:-1px;width:40px;height:1.8px;background:rgba(43,36,28,.55);opacity:${n.note === 'C4' ? 1 : 0};`}></div>
              <div style={`position:absolute;left:10px;top:-58px;width:2.4px;height:58px;border-radius:2px;background:${fill};transition:background .25s;`}></div>
              <div style={`position:absolute;left:-13px;top:-9px;width:26px;height:18px;border-radius:50%;background:${fill};transform:rotate(-16deg)${n.status === 'demo' ? ' scale(1.22)' : ''};animation:${n.status === 'current' ? 'glowPulse 1.8s ease-in-out infinite' : 'none'};transition:background .25s, transform .2s;`}></div>
              <div style={`position:absolute;left:0;top:${-58 - 16 + (y - 46 < 16 ? 46 - y - 2 : 0)}px;transform:translateX(-50%);font-family:var(--mono);font-size:10px;font-weight:700;color:${label};background:${n.status === 'current' ? 'var(--accent-soft)' : 'transparent'};border-radius:8px;padding:1px 5px;`}>{n.finger}</div>
              <div style={`position:absolute;left:0;top:${140 - y}px;transform:translateX(-50%);font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.5px;color:${label};`}>{letter(midi)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
