/** The listening pill (SR-AUD-08 UI): the student always knows the teacher's ears are on. */

const BARS = [0, 1, 2, 3, 4].map(i => ({
  h: [9, 14, 17, 12, 8][i], dur: 1.1 + (i % 3) * 0.28, delay: i * 0.16
}))

export function ListeningPill({ text, active = false }) {
  return (
    <div style="display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid #E4D9C2;border-radius:999px;padding:8px 16px 8px 13px;box-shadow:0 2px 10px rgba(80,60,20,.06);">
      <div style="position:relative;width:10px;height:10px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:var(--accent);animation:breath 2.2s ease-out infinite;"></div>
        <div style="position:absolute;inset:0;border-radius:50%;background:var(--accent-ink);"></div>
      </div>
      <div style="display:flex;align-items:center;gap:2.5px;height:16px;">
        {BARS.map(b => (
          <div style={`width:3px;height:${b.h}px;border-radius:2px;background:var(--accent);transform-origin:center;animation:eq ${b.dur}s ease-in-out ${b.delay}s infinite;`}></div>
        ))}
      </div>
      <div role="status" aria-live="polite" style={`font-size:13px;font-weight:800;min-width:92px;color:${active ? 'var(--accent-ink)' : 'var(--ink-soft)'};transition:color .2s;`}>{text}</div>
    </div>
  )
}
