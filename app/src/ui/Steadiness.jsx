/** Number-free steadiness timeline (SR-CRS-09 / §9.2): dots against the pulse line. */
import { VOICE } from '../content/voice.js'

const COLOR = { on: 'var(--accent-ink)', early: 'var(--hint)', late: 'var(--hint)' }

export function Steadiness({ points, width = 520, height = 96 }) {
  if (points.length < 4) return null
  const v = VOICE.timing.steadiness
  const midY = height / 2
  const x = (k) => 24 + (k / (points.length - 1)) * (width - 48)
  const y = (off) => midY - off * (height / 2 - 14) / 0.6 * -1 // late (positive) sits below the line
  return (
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
      <svg width={width} height={height} role="img" aria-label={v.label} style="max-width:100%;">
        <line x1="16" y1={midY} x2={width - 16} y2={midY} stroke="var(--line-strong)" stroke-width="1.5" stroke-dasharray="1 5" stroke-linecap="round" />
        {points.map((p, k) => (
          <circle key={p.i} cx={x(k)} cy={y(p.off)} r="5" fill={COLOR[p.verdict]} opacity={p.verdict === 'on' ? 1 : 0.85} />
        ))}
      </svg>
      <div style="display:flex;justify-content:space-between;width:100%;max-width:520px;font-size:11.5px;color:var(--ink-mid);font-style:italic;">
        <span>{v.eager}</span><span>{v.pulseWord}</span><span>{v.dreamy}</span>
      </div>
    </div>
  )
}
