/** The visible pulse (SR-OUT-04): a small dot that breathes with the metronome. */
export function Pulse({ beat }) {
  return (
    <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
      <div style={`width:10px;height:10px;border-radius:50%;background:var(--accent-ink);transform:scale(${beat ? 1.25 : 0.8});opacity:${beat ? 1 : 0.45};transition:all .18s ease;`}></div>
      <div class="kicker">THE PULSE</div>
    </div>
  )
}
