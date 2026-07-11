/**
 * Setlist screen (§9.4 lessons 42-43): the student picks their pieces for a
 * make-it-beautiful pass or for recital day, then plays them one by one
 * through the normal Song screen (recital mode keeps Arietta quiet there).
 */
import { useState } from 'preact/hooks'
import { PlayHeader } from './PlayHeader.jsx'
import { VOICE } from '../content/voice.js'

export function Setlist({ lesson, candidates, pill, onBegin, onHome }) {
  const [picked, setPicked] = useState([])
  const v = VOICE.recital
  const toggle = (id) => setPicked(p =>
    p.includes(id) ? p.filter(x => x !== id) : p.length < lesson.pick ? [...p, id] : p)

  return (
    <section style="flex:1;min-height:0;display:flex;flex-direction:column;animation:fadeUp .4s ease;">
      <PlayHeader kicker={`${lesson.unitTag} · ${lesson.unitTitle.toUpperCase()}`} title={lesson.title}
        pillText={pill.text} pillActive={pill.active} onHome={onHome} />
      <div style="flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:0 30px;overflow:auto;">
        <div class="kicker">{v.pickKicker}</div>
        <div style="font-size:15px;color:var(--ink-soft);text-align:center;max-width:560px;">
          {lesson.recital ? v.pickLineRecital : v.pickLinePolish}
        </div>
        <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:12px;max-width:900px;">
          {candidates.map(c => {
            const on = picked.includes(c.id)
            const order = picked.indexOf(c.id)
            return (
              <button key={c.id} class="hit" onClick={() => toggle(c.id)} aria-pressed={on}
                style={`text-align:left;max-width:260px;background:${on ? 'var(--accent-soft)' : 'var(--card)'};border:1px solid ${on ? 'var(--line-strong)' : 'var(--line)'};border-radius:14px;padding:13px 16px;cursor:pointer;transition:all .15s ease;`}>
                <div style="display:flex;align-items:center;gap:8px;">
                  <div style={`width:20px;height:20px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:${on ? 'var(--card)' : 'var(--ink-faint)'};background:${on ? 'var(--accent-ink)' : 'var(--line)'};`}>{on ? order + 1 : '♪'}</div>
                  <div style="font-family:var(--serif);font-weight:600;font-size:16px;">{c.title}</div>
                </div>
                {c.card && <div style="font-size:12.5px;color:var(--ink-soft);margin-top:6px;">{c.card}</div>}
              </button>
            )
          })}
        </div>
        <button class="btn-primary" disabled={picked.length < lesson.pick}
          onClick={() => onBegin(picked)}
          style={picked.length < lesson.pick ? 'opacity:.45;cursor:default;' : ''}>
          {v.begin}
        </button>
      </div>
    </section>
  )
}
