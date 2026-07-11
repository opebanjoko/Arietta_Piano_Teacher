/** First-run and new-profile flow: a name is all we ever ask for (§2). */
import { useState } from 'preact/hooks'
import { VOICE } from '../content/voice.js'

export function FirstRun({ onCreate, onCancel = null }) {
  const [name, setName] = useState('')
  const v = VOICE.firstRun
  const isNew = onCancel !== null
  const submit = (e) => {
    e.preventDefault()
    if (name.trim()) onCreate(name.trim())
  }

  return (
    <div class="screen" style="align-items:center;justify-content:center;animation:fadeUp .4s ease;">
      <div class="card-modal" style="padding:clamp(28px,6vw,44px) clamp(28px,7vw,54px);box-shadow:var(--shadow-card);max-width:min(560px,92vw);">
        <div class="kicker">{v.kicker}</div>
        <div style="font-family:var(--serif);font-weight:600;font-size:34px;margin-top:8px;">{isNew ? v.newProfileTitle : v.title}</div>
        <div style="font-size:15.5px;color:var(--ink-soft);margin-top:10px;text-wrap:pretty;">{isNew ? v.newProfileLine : v.line}</div>
        <form onSubmit={submit} style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:24px;">
          <input
            value={name}
            onInput={e => setName(e.currentTarget.value)}
            placeholder={v.placeholder}
            aria-label={v.placeholder}
            autofocus
            style="font-family:var(--sans);font-size:17px;font-weight:700;color:var(--ink);background:var(--card-warm);border:1.5px solid var(--btn-border);border-radius:999px;padding:12px 22px;width:200px;text-align:center;"
          />
          <button type="submit" class="btn-primary" disabled={!name.trim()}>
            {isNew ? v.newProfileButton : v.button}
          </button>
        </form>
        {isNew && <button class="btn-quiet" onClick={onCancel} style="margin-top:18px;">← Back</button>}
      </div>
    </div>
  )
}
