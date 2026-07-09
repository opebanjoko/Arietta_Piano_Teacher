/**
 * Free play (SR-UI-02): no matching, no goals, no completion state. Arietta
 * listens, names what she hears, and occasionally offers a spark.
 */
import { PlayHeader } from './PlayHeader.jsx'
import { letter } from '../core/notes.js'
import { VOICE } from '../content/voice.js'

const fill = (t, vals) => t.replace(/\{(\w+)\}/g, (_, k) => vals[k])

export function FreePlay({ heard, noteCount, pill, onHome }) {
  const v = VOICE.freePlay
  const spark = noteCount > 0 && noteCount % 7 === 0
    ? v.sparks[(noteCount / 7 - 1) % v.sparks.length]
    : null

  return (
    <section style="flex:1;min-height:0;display:flex;flex-direction:column;animation:fadeUp .4s ease;">
      <PlayHeader kicker={v.kicker} title={v.title} pillText={pill.text} pillActive={pill.active} onHome={onHome} />
      <div style="flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:0 30px;">
        <div style={`font-family:var(--serif);font-weight:600;font-size:${heard !== null ? 54 : 24}px;color:${heard !== null ? 'var(--accent-ink)' : 'var(--ink-soft)'};transition:all .2s ease;text-align:center;`}>
          {heard !== null ? fill(v.heard, { note: letter(heard) }) : v.idle}
        </div>
        <div style="height:26px;font-family:var(--serif);font-style:italic;font-size:15.5px;color:#7A9070;text-align:center;">
          {spark ?? ''}
        </div>
      </div>
    </section>
  )
}
