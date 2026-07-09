/** Song play-along screen (SR-UI-01): hear-it-first, wait-mode staff, completion. */
import { PlayHeader } from './PlayHeader.jsx'
import { Staff } from './Staff.jsx'
import { VOICE } from '../content/voice.js'

const fill = (t, vals) => t.replace(/\{(\w+)\}/g, (_, k) => vals[k])

const FLOATS = [
  { glyph: '♪', left: '16%', top: '64%', size: 26, dur: 2.8, delay: 0 },
  { glyph: '♫', left: '28%', top: '72%', size: 22, dur: 3.4, delay: .6 },
  { glyph: '♩', left: '70%', top: '66%', size: 24, dur: 3, delay: .3 },
  { glyph: '♪', left: '82%', top: '74%', size: 20, dur: 3.6, delay: .9 },
  { glyph: '♫', left: '50%', top: '78%', size: 22, dur: 3.2, delay: 1.2 }
]

export function Song({ lesson, song, demo, overlay, pill, onHome, onHearIt, onReplay }) {
  const v = VOICE.song
  const total = lesson.notes.length

  const staffNotes = lesson.notes.map((t, i) => {
    let status = 'up'
    if (demo.on && i === demo.pos) status = 'demo'
    else if (i < song.pos) status = 'played'
    else if (i === song.pos && !song.done && !demo.on) status = 'current'
    return { ...t, status }
  })

  const target = lesson.notes[Math.min(song.pos, total - 1)]
  const lead = song.hint ?? (song.done ? v.leadDone : fill(v.lead, { target: target.note.replace(/\d/, '') }))
  const cheer = [...v.cheers].reverse().find(c => song.pos / total >= c.at)?.line ?? ''

  return (
    <section style="flex:1;min-height:0;display:flex;flex-direction:column;position:relative;animation:fadeUp .4s ease;">
      <PlayHeader kicker="PLAY-ALONG · IT WAITS FOR YOU" title={lesson.title}
        pillText={pill.text} pillActive={pill.active} onHome={onHome} />

      <div style="flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:0 30px;">
        <div style="display:flex;align-items:center;gap:16px;">
          <button class="btn-quiet" onClick={onHearIt}>{demo.on ? 'Playing…' : '♪ Hear it first'}</button>
          <div style="width:230px;height:7px;border-radius:99px;background:var(--line);overflow:hidden;">
            <div style={`height:100%;border-radius:99px;background:var(--accent-ink);width:${Math.round(Math.min(song.pos / total, 1) * 100)}%;transition:width .3s ease;`}></div>
          </div>
          <div style="font-size:12.5px;font-weight:700;color:var(--ink-mid);">{Math.min(song.pos, total)} of {total} notes</div>
        </div>
        <Staff notes={staffNotes} width={1060} height={170} />
        <div style="display:flex;align-items:center;justify-content:center;gap:26px;height:26px;">
          <div style={`font-size:15.5px;font-weight:800;color:${song.hint ? 'var(--hint)' : 'var(--ink-soft)'};transition:color .2s;`}>{lead}</div>
          <div style="font-family:var(--serif);font-style:italic;font-size:14.5px;color:#7A9070;">{cheer}</div>
        </div>
      </div>

      {overlay && (
        <div style="position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;background:rgba(250,245,234,.78);backdrop-filter:blur(7px);animation:fadeUp .5s ease;">
          {FLOATS.map(f => (
            <div style={`position:absolute;left:${f.left};top:${f.top};font-size:${f.size}px;color:var(--accent-ink);opacity:0;animation:floatNote ${f.dur}s ease-in-out ${f.delay}s infinite;`}>{f.glyph}</div>
          ))}
          <div style="position:relative;background:var(--card);border:1px solid var(--line);border-radius:22px;padding:38px 54px;box-shadow:0 24px 60px rgba(80,60,20,.16);text-align:center;max-width:560px;">
            <div style="font-size:30px;color:var(--accent-ink);line-height:1;">♫</div>
            <div style="font-family:var(--serif);font-weight:600;font-size:33px;margin-top:8px;">{lesson.done.title}</div>
            <div style="font-size:15.5px;color:var(--ink-soft);margin-top:8px;text-wrap:pretty;">{lesson.done.line}</div>
            {song.mention && <div style="font-size:14px;color:var(--ink-mid);margin-top:10px;text-wrap:pretty;">{song.mention}</div>}
            <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-top:22px;">
              <button class="btn-primary" onClick={onReplay}>Play it again</button>
              <button class="btn-quiet" onClick={onHome} style="padding:12px 20px;font-size:14px;">Back to my course</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
