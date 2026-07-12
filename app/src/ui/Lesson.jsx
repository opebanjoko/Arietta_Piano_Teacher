/** Drill lesson screen (SR-UI-01): steps, staff with fingering, hints, completion. */
import { PlayHeader } from './PlayHeader.jsx'
import { Staff } from './Staff.jsx'
import { WatchMe } from './WatchMe.jsx'
import { Pulse } from './Pulse.jsx'
import { nameToMidi } from '../core/notes.js'
import { VOICE } from '../content/voice.js'

export function Lesson({ lesson, drill, pill, earPlaying, beat, letters, onHome, onContinue, onChoice,
  onReplayEar, onReplayPattern, onNextSong, doneAction }) {
  const step = lesson.steps[Math.min(drill.stepIndex, lesson.steps.length - 1)]
  const working = drill.phase !== 'done'
  const pulsing = lesson.tempo && (step.timed || step.kind === 'rhythm-clap')

  const staffNotes = step.kind === 'play' || step.kind === 'dynamics'
    ? step.targets.map((t, i) => {
        const status = i < drill.seqPos ? 'played'
          : (i === drill.seqPos && drill.phase === 'working') ? 'current' : 'up'
        const midis = (t.notes ?? [t.note]).map(nameToMidi)
        const letter = letters === 'all' ||
          (letters !== 'none' && (midis.some(m => letters.has(m)) ||
            (status === 'current' && drill.misses >= 2))) // struggle reveal, same threshold as the key glow
        return { ...t, status, letter }
      })
    : []

  const feedback = drill.feedback
  const feedbackColor = feedback?.kind === 'good' ? 'var(--sage-ink)'
    : feedback?.kind === 'hint' ? 'var(--hint)'
    : feedback?.kind === 'pulse' ? 'var(--sage-ink)' : 'transparent'

  return (
    <section style="flex:1;min-height:0;display:flex;flex-direction:column;animation:fadeUp .4s ease;">
      <PlayHeader kicker={`${lesson.unitTag} · ${lesson.unitTitle.toUpperCase()}`} title={lesson.title}
        pillText={pill.text} pillActive={pill.active} onHome={onHome} />

      {working && (
        <div style="flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;padding:0 30px;">
          <div class="kicker">STEP {Math.min(drill.stepIndex + 1, lesson.steps.length)} OF {lesson.steps.length}</div>
          <div style="display:flex;gap:7px;">
            {lesson.steps.map((_, i) => {
              const doneDot = i < drill.stepIndex || (i === drill.stepIndex && drill.phase === 'stepdone')
              const bg = doneDot ? 'var(--sage)' : i === drill.stepIndex ? 'var(--accent-ink)' : 'var(--todo)'
              return <div key={i} style={`width:8px;height:8px;border-radius:50%;background:${bg};transition:background .3s;`}></div>
            })}
          </div>
          <div style="font-family:var(--serif);font-weight:600;font-size:28px;text-align:center;max-width:720px;text-wrap:pretty;line-height:1.2;">{step.prompt}</div>
          <div style="font-size:15px;color:var(--ink-soft);text-align:center;max-width:600px;">{step.sub}</div>
          {(step.kind === 'play' || step.kind === 'dynamics') && (
            <div style="margin-top:8px;">
              <Staff notes={staffNotes} clef={lesson.clef} flats={!!lesson.flats}
                height={lesson.clef !== 'bass' && staffNotes.some(t => (t.notes ?? [t.note]).some(n => nameToMidi(n) < 60)) ? 196 : 166} />
            </div>
          )}
          {pulsing && <Pulse beat={beat} />}
          {step.kind === 'rhythm-clap' && (
            <div style="display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:14px;">
              <div style="display:flex;gap:9px;">
                {Array.from({ length: step.pattern.length + 1 }, (_, i) => (
                  <div key={i} style={`width:11px;height:11px;border-radius:50%;background:${i < drill.seqPos ? 'var(--sage)' : 'var(--todo)'};transition:background .25s;`}></div>
                ))}
              </div>
              <button class="btn-quiet" onClick={onReplayPattern} disabled={earPlaying}>{earPlaying ? VOICE.rhythm.listen : VOICE.rhythm.again}</button>
            </div>
          )}
          {step.kind === 'watch-me' && step.anim && <WatchMe anim={step.anim} />}
          {(step.kind === 'info' || step.kind === 'watch-me') && (
            <button class="btn-primary" onClick={onContinue} style="margin-top:18px;">Ready — next →</button>
          )}
          {step.kind === 'ear-choice' && (
            <div style="display:flex;flex-direction:column;align-items:center;gap:16px;margin-top:14px;">
              <div style="display:flex;gap:14px;">
                {step.choices.map((c, i) => (
                  <button key={i} class="btn-primary" onClick={() => onChoice(i)} disabled={earPlaying}
                    style="padding:15px 34px;font-size:17px;">{c.label}</button>
                ))}
              </div>
              <button class="btn-quiet" onClick={onReplayEar} disabled={earPlaying}>{earPlaying ? VOICE.ear.playing : VOICE.ear.again}</button>
            </div>
          )}
          {step.kind === 'ear-echo' && (
            <div style="display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:14px;">
              <div style="display:flex;gap:9px;">
                {step.targets.map((_, i) => (
                  <div key={i} style={`width:11px;height:11px;border-radius:50%;background:${i < drill.seqPos ? 'var(--sage)' : 'var(--todo)'};transition:background .25s;`}></div>
                ))}
              </div>
              <button class="btn-quiet" onClick={onReplayEar} disabled={earPlaying}>{earPlaying ? VOICE.ear.playing : VOICE.ear.again}</button>
            </div>
          )}
          <div aria-live="polite" style={`height:26px;font-size:16px;font-weight:700;text-align:center;color:${feedbackColor};transition:color .2s;`}>{feedback?.text || ' '}</div>
        </div>
      )}

      {!working && (
        <div style="flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;padding:0 30px;text-align:center;animation:fadeUp .45s ease;">
          <div style="font-size:34px;color:var(--accent-ink);line-height:1;">♪</div>
          <div style="font-family:var(--serif);font-weight:600;font-size:34px;">{lesson.done.title}</div>
          <div style="font-size:15.5px;color:var(--ink-soft);max-width:520px;text-wrap:pretty;">{lesson.done.line}</div>
          <div style="display:flex;align-items:center;gap:14px;margin-top:12px;">
            {doneAction
              ? <button class="btn-primary" onClick={doneAction.go}>{doneAction.label}</button>
              : lesson.done.nextSongId
                ? <button class="btn-primary" onClick={() => onNextSong(lesson.done.nextSongId)}>Try it in a song →</button>
                : <button class="btn-primary" onClick={onHome}>Back to my course</button>}
            {(doneAction || lesson.done.nextSongId) && <button class="btn-quiet" onClick={onHome} style="padding:12px 20px;font-size:14px;">Back to my course</button>}
          </div>
        </div>
      )}
    </section>
  )
}
