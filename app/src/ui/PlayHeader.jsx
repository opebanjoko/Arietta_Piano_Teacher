/** Shared lesson/song header: back button, unit + title, listening pill. */
import { ListeningPill } from './ListeningPill.jsx'

export function PlayHeader({ kicker, title, pillText, pillActive, onHome }) {
  return (
    <header style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:16px 30px 6px;">
      <div>
        <button class="btn-quiet" onClick={onHome} style="padding:9px 16px;">← My course</button>
      </div>
      <div style="text-align:center;">
        <div style="font-family:var(--mono);font-size:10px;letter-spacing:1.8px;color:var(--ink-faint);">{kicker}</div>
        <div style="font-family:var(--serif);font-weight:600;font-size:23px;">{title}</div>
      </div>
      <div style="justify-self:end;">
        <ListeningPill text={pillText} active={pillActive} />
      </div>
    </header>
  )
}
