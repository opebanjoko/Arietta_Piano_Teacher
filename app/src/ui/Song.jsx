/** Song play-along screen (SR-UI-01): hear-it-first, wait-mode staff, completion. */
import { PlayHeader } from './PlayHeader.jsx'
import { Staff } from './Staff.jsx'
import { Pulse } from './Pulse.jsx'
import { Steadiness } from './Steadiness.jsx'
import { songTargetIndex, TEMPO_CHOICES } from '../core/engine.js'
import { steadinessPoints } from '../core/timing.js'
import { nameToMidi } from '../core/notes.js'
import { VOICE } from '../content/voice.js'
import { fill } from './util.js'
import { Overlay } from './Overlay.jsx'

const FLOATS = [
  { glyph: '♪', left: '16%', top: '64%', size: 26, dur: 2.8, delay: 0 },
  { glyph: '♫', left: '28%', top: '72%', size: 22, dur: 3.4, delay: .6 },
  { glyph: '♩', left: '70%', top: '66%', size: 24, dur: 3, delay: .3 },
  { glyph: '♪', left: '82%', top: '74%', size: 20, dur: 3.6, delay: .9 },
  { glyph: '♫', left: '50%', top: '78%', size: 22, dur: 3.2, delay: 1.2 }
]

export function Song({ lesson, song, demo, overlay, pill, beat, letters, accompany, accompanyAvailable,
  onToggleAccompany, tempoChoice, onTempo, onHome, onHearIt, onReplay, onAcceptLoop, onDeclineLoop,
  doneAction, recital = false }) {
  const v = VOICE.song
  const total = lesson.notes.length
  const ti = songTargetIndex(song)

  const staffNotes = lesson.notes.map((t, i) => {
    let status = 'up'
    if (demo.on && i === demo.pos) status = 'demo'
    else if (song.loop) status = i === ti ? 'current' : (i >= song.loop.from && i < ti ? 'played' : 'up')
    else if (i < song.pos) status = 'played'
    else if (i === song.pos && !song.done && !demo.on) status = 'current'
    const midis = (t.notes ?? [t.note]).map(nameToMidi)
    const letter = letters === 'all' ||
      (letters !== 'none' && (midis.some(m => letters.has(m)) ||
        (status === 'current' && song.misses >= 2)))
    return { ...t, status, letter }
  })

  const target = lesson.notes[Math.min(ti, total - 1)]
  const targetText = (target.notes ?? [target.note]).map(n => n.replace(/-?\d/, '')).join(' + ')
  // recital mode (§9.4 lesson 43): Arietta introduces the piece, then goes
  // quiet and simply listens - no hints, no cheers, no interruptions
  const lead = recital
    ? (song.done ? v.leadDone : song.pos === 0 ? fill(VOICE.recital.intro, { title: lesson.title }) : ' ')
    : song.hint ?? song.say ?? (song.done ? v.leadDone : fill(v.lead, { target: targetText }))
  const cheer = recital ? '' : song.pulse ?? ([...v.cheers].reverse().find(c => song.pos / total >= c.at)?.line ?? '')

  return (
    <section style="flex:1;min-height:0;display:flex;flex-direction:column;position:relative;animation:fadeUp .4s ease;">
      <PlayHeader kicker="PLAY-ALONG · IT WAITS FOR YOU" title={lesson.title}
        pillText={pill.text} pillActive={pill.active} onHome={onHome} />

      <div style="flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:0 30px;">
        <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 16px;">
          <button class="btn-quiet" onClick={onHearIt} disabled={demo.on}>{demo.on ? 'Playing…' : '♪ Hear it first'}</button>
          {accompanyAvailable && (
            <button class="btn-quiet" onClick={onToggleAccompany}
              style={accompany ? 'background:var(--accent-soft);border-color:var(--line-strong);' : ''}>
              {accompany ? v.withMeOn : v.withMe}
            </button>
          )}
          {lesson.tempo && !song.done && (
            <div style="display:flex;gap:12px;align-items:center;" role="group" aria-label={v.tempoLine}>
              {TEMPO_CHOICES.map(({ id }) => (
                <button key={id} class="btn-quiet hit" onClick={() => onTempo(id)}
                  aria-pressed={tempoChoice === id}
                  style={`padding:7px 12px;font-size:12.5px;${tempoChoice === id ? 'background:var(--accent-soft);border-color:var(--line-strong);' : ''}`}>
                  {v.tempos[id]}
                </button>
              ))}
            </div>
          )}
          <div style="width:clamp(140px,22vw,230px);height:7px;border-radius:99px;background:var(--line);overflow:hidden;">
            <div style={`height:100%;border-radius:99px;background:var(--accent-ink);width:${Math.round(Math.min(song.pos / total, 1) * 100)}%;transition:width .3s ease;`}></div>
          </div>
          <div style="font-size:12.5px;font-weight:700;color:var(--ink-mid);">{Math.min(song.pos, total)} of {total} notes</div>
          {lesson.tempo && !song.done && <Pulse beat={beat} />}
        </div>
        <Staff notes={staffNotes} width={1060} height={170}
          clef={lesson.clef} flats={!!lesson.flats} />
        <div aria-live="polite" style="display:flex;align-items:center;justify-content:center;gap:26px;height:26px;">
          <div style={`font-size:15.5px;font-weight:800;color:${song.hint ? 'var(--hint)' : 'var(--ink-soft)'};transition:color .2s;`}>{lead}</div>
          <div style="font-family:var(--serif);font-style:italic;font-size:14.5px;color:var(--cheer);">{cheer}</div>
        </div>
      </div>

      {song.trouble && !overlay && !recital && (
        <Overlay label={VOICE.trouble.title} onDismiss={onDeclineLoop}>
            <div class="kicker">{VOICE.trouble.kicker}</div>
            <div style="font-family:var(--serif);font-weight:600;font-size:30px;margin-top:8px;">{VOICE.trouble.title}</div>
            <div style="font-size:15.5px;color:var(--ink-soft);margin-top:8px;text-wrap:pretty;">{VOICE.trouble.line}</div>
            <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-top:22px;">
              <button class="btn-primary" onClick={onAcceptLoop}>{VOICE.trouble.accept}</button>
              <button class="btn-quiet" onClick={onDeclineLoop} style="padding:12px 20px;font-size:14px;">{VOICE.trouble.skip}</button>
            </div>
        </Overlay>
      )}

      {overlay && (
        <Overlay label={lesson.done.title} maxWidth={560}
          backdrop={FLOATS.map((f, i) => (
            <div key={i} aria-hidden="true" style={`position:absolute;left:${f.left};top:${f.top};font-size:${f.size}px;color:var(--accent-ink);opacity:0;animation:floatNote ${f.dur}s ease-in-out ${f.delay}s infinite;`}>{f.glyph}</div>
          ))}>
            <div style="font-size:30px;color:var(--accent-ink);line-height:1;">♫</div>
            <div style="font-family:var(--serif);font-weight:600;font-size:33px;margin-top:8px;">{lesson.done.title}</div>
            <div style="font-size:15.5px;color:var(--ink-soft);margin-top:8px;text-wrap:pretty;">{lesson.done.line}</div>
            {song.timingMention && <div style="font-size:14px;color:var(--ink-mid);margin-top:10px;text-wrap:pretty;">{song.timingMention}</div>}
            {song.mention && <div style="font-size:14px;color:var(--ink-mid);margin-top:10px;text-wrap:pretty;">{song.mention}</div>}
            {song.done && lesson.tempo && (
              <div style="margin-top:14px;"><Steadiness points={steadinessPoints(song.verdicts, song.offsets)} /></div>
            )}
            <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-top:22px;">
              {doneAction
                ? <button class="btn-primary" onClick={doneAction.go}>{doneAction.label}</button>
                : <button class="btn-primary" onClick={onReplay}>Play it again</button>}
              <button class="btn-quiet" onClick={doneAction ? onReplay : onHome} style="padding:12px 20px;font-size:14px;">{doneAction ? 'Play it again' : 'Back to my course'}</button>
            </div>
        </Overlay>
      )}
    </section>
  )
}
