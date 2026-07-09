/** Drill lesson screen (SR-UI-01): steps, staff with fingering, hints, completion. */
import { PlayHeader } from './PlayHeader.jsx'
import { Staff } from './Staff.jsx'

export function Lesson({ lesson, drill, pill, onHome, onContinue, onNextSong }) {
  const step = lesson.steps[Math.min(drill.stepIndex, lesson.steps.length - 1)]
  const working = drill.phase !== 'done'

  const staffNotes = step.kind === 'play'
    ? step.targets.map((t, i) => ({
        ...t,
        status: i < drill.seqPos ? 'played'
          : (i === drill.seqPos && drill.phase === 'working') ? 'current' : 'up'
      }))
    : []

  const feedback = drill.feedback
  const feedbackColor = feedback?.kind === 'good' ? 'var(--sage-ink)' : feedback?.kind === 'hint' ? 'var(--hint)' : 'transparent'

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
              return <div style={`width:8px;height:8px;border-radius:50%;background:${bg};transition:background .3s;`}></div>
            })}
          </div>
          <div style="font-family:var(--serif);font-weight:600;font-size:28px;text-align:center;max-width:720px;text-wrap:pretty;line-height:1.2;">{step.prompt}</div>
          <div style="font-size:15px;color:var(--ink-soft);text-align:center;max-width:600px;">{step.sub}</div>
          {step.kind === 'play' ? (
            <div style="margin-top:8px;">
              <Staff notes={staffNotes} />
            </div>
          ) : (
            <button class="btn-primary" onClick={onContinue} style="margin-top:18px;">Ready — next →</button>
          )}
          <div style={`height:26px;font-size:16px;font-weight:700;text-align:center;color:${feedbackColor};transition:color .2s;`}>{feedback?.text || ' '}</div>
        </div>
      )}

      {!working && (
        <div style="flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;padding:0 30px;text-align:center;animation:fadeUp .45s ease;">
          <div style="font-size:34px;color:var(--accent-ink);line-height:1;">♪</div>
          <div style="font-family:var(--serif);font-weight:600;font-size:34px;">{lesson.done.title}</div>
          <div style="font-size:15.5px;color:var(--ink-soft);max-width:520px;text-wrap:pretty;">{lesson.done.line}</div>
          <div style="display:flex;align-items:center;gap:14px;margin-top:12px;">
            {lesson.done.nextSongId
              ? <button class="btn-primary" onClick={() => onNextSong(lesson.done.nextSongId)}>Try it in a song →</button>
              : <button class="btn-primary" onClick={onHome}>Back to my course</button>}
            {lesson.done.nextSongId && <button class="btn-quiet" onClick={onHome} style="padding:12px 20px;font-size:14px;">Back to my course</button>}
          </div>
        </div>
      )}
    </section>
  )
}
