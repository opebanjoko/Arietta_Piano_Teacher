/**
 * Staff with note letters and mandatory finger numbers (SR-CRS-05).
 * Treble is anchored at C4 (its ledger line); bass (Unit 8) puts A3 on the
 * top line so the C3 position sits inside the staff. Entries may be chords
 * ({ notes, fingers }) drawn as one stacked column; black keys sit on their
 * natural letter with an accidental glyph; `plain` fades the letter labels
 * (Unit 7: reading without training wheels).
 */
import { Fragment } from 'preact'
import { nameToMidi, letterIn, staffPos } from '../core/notes.js'

const TOP = 46
const LINE_GAP = 14
const BOTTOM = TOP + 4 * LINE_GAP

function noteY(midi, clef, flats) {
  const { line } = staffPos(midi, flats)
  const anchor = clef === 'bass' ? staffPos(nameToMidi('A3')).line : staffPos(nameToMidi('C4')).line
  const anchorY = clef === 'bass' ? TOP : BOTTOM + LINE_GAP
  return anchorY - (line - anchor) * (LINE_GAP / 2)
}

function ledgers(y) {
  const out = []
  for (let ly = BOTTOM + LINE_GAP; ly <= y; ly += LINE_GAP) out.push(ly)
  for (let ly = TOP - LINE_GAP; ly >= y; ly -= LINE_GAP) out.push(ly)
  return out
}

const FILL = {
  played: 'var(--sage)', current: 'var(--accent)', demo: 'var(--accent-ink)', up: '#C9BC9F'
}
const LABEL = {
  played: 'var(--sage)', current: 'var(--accent-ink)', demo: 'var(--accent-ink)', up: '#B4A585'
}
const ACCIDENTAL = { '#': '♯', b: '♭' }

const members = (n) =>
  (n.notes ? n.notes.map((nm, j) => ({ midi: nameToMidi(nm), finger: n.fingers?.[j] }))
    : [{ midi: nameToMidi(n.note), finger: n.finger }]
  ).sort((a, b) => a.midi - b.midi)

/**
 * notes: [{ note, finger, status } | { notes, fingers, status }]
 * status 'played' | 'current' | 'demo' | 'up'
 */
export function Staff({ notes, clef = 'treble', flats = false, plain = false, width = 620, height = 166 }) {
  const k = notes.length
  const step = k > 1 ? Math.min(120, (width - 200) / (k - 1)) : 0
  const start = width / 2 - ((k - 1) * step) / 2 + 30

  return (
    <div style="background:var(--card);border:1px solid var(--line);border-radius:18px;padding:8px 26px 0;box-shadow:0 8px 24px rgba(80,60,20,.06);">
      <div style={`position:relative;width:${width}px;max-width:86vw;height:${height}px;`}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={`position:absolute;left:0;right:0;height:1.6px;background:rgba(43,36,28,.5);top:${TOP + i * LINE_GAP}px;`}></div>
        ))}
        <div style={`position:absolute;left:14px;top:${clef === 'bass' ? 34 : 20}px;font-family:var(--music);font-size:${clef === 'bass' ? 62 : 78}px;line-height:1;color:var(--ink);`}>{clef === 'bass' ? '𝄢' : '𝄞'}</div>
        {notes.map((n, i) => {
          const ms = members(n)
          const x = ((start + i * step) / width * 100).toFixed(2)
          const fill = FILL[n.status], label = LABEL[n.status]
          const letters = ms.map(m => letterIn(m.midi, flats)).join('·')
          const fingers = ms.map(m => m.finger).filter(f => f !== undefined).join('·')
          const topY = noteY(ms.at(-1).midi, clef, flats)
          const bottomY = noteY(ms[0].midi, clef, flats)
          const stemTop = topY - 58
          return (
            <div key={i} style={`position:absolute;left:${x}%;top:0;width:0;height:0;`}>
              {[...new Set(ms.flatMap(m => ledgers(noteY(m.midi, clef, flats))))].map(ly => (
                <div key={ly} style={`position:absolute;left:-20px;top:${ly - 1}px;width:40px;height:1.8px;background:rgba(43,36,28,.55);`}></div>
              ))}
              <div style={`position:absolute;left:10px;top:${stemTop}px;width:2.4px;height:${bottomY - stemTop}px;border-radius:2px;background:${fill};transition:background .25s;`}></div>
              {ms.map(m => {
                const y = noteY(m.midi, clef, flats)
                const acc = staffPos(m.midi, flats).accidental
                return (
                  <Fragment key={m.midi}>
                    {acc && <div style={`position:absolute;left:-26px;top:${y - 12}px;font-family:var(--music);font-size:17px;color:${fill};`}>{ACCIDENTAL[acc]}</div>}
                    <div style={`position:absolute;left:-13px;top:${y - 9}px;width:26px;height:18px;border-radius:50%;background:${fill};transform:rotate(-16deg)${n.status === 'demo' ? ' scale(1.22)' : ''};animation:${n.status === 'current' ? 'glowPulse 1.8s ease-in-out infinite' : 'none'};transition:background .25s, transform .2s;`}></div>
                  </Fragment>
                )
              })}
              <div style={`position:absolute;left:0;top:${stemTop - 16 + (topY - TOP < 16 ? TOP - topY - 2 : 0)}px;transform:translateX(-50%);font-family:var(--mono);font-size:10px;font-weight:700;color:${label};background:${n.status === 'current' ? 'var(--accent-soft)' : 'transparent'};border-radius:8px;padding:1px 5px;`}>{fingers}</div>
              {!plain && (
                <div style={`position:absolute;left:0;top:${Math.max(bottomY + 14, 140)}px;transform:translateX(-50%);font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.5px;color:${label};`}>{letters}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
