/** Family sync settings card (SR-STO-04, SR-BCK-02 interim code+PIN). */
import { useState } from 'preact/hooks'
import { VOICE } from '../content/voice.js'

const fill = (t, vals) => t.replace(/\{(\w+)\}/g, (_, k) => vals[k])
const PIN_RE = /^\d{4,8}$/

export function FamilySync({ sync, onCreate, onJoin, onLeave, onDeleteEverywhere, onSyncNow }) {
  const v = VOICE.settings.sync
  const cancelText = VOICE.settings.cancel
  const [mode, setMode] = useState(null) // null | 'create' | 'join' | 'delete'
  const [pin, setPin] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [shownCode, setShownCode] = useState(null)

  const input = (props) => (
    <input {...props} class="hit" style="border:1px solid var(--line-strong);border-radius:10px;padding:9px 12px;font-size:15px;background:var(--card-warm);width:150px;" />
  )

  const submit = async (fn) => {
    setError(null)
    try { await fn(); setMode(null); setPin(''); setCode('') }
    catch { setError(v.wrong) }
  }

  if (!sync.linked) {
    return (
      <>
        <div style="font-size:14px;color:var(--ink-soft);text-wrap:pretty;">{v.offLine}</div>
        {shownCode && <div style="font-size:14px;color:var(--ink-mid);text-wrap:pretty;">{fill(v.codeShow, { code: shownCode })}</div>}
        {mode === null && (
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn-quiet" onClick={() => setMode('create')}>{v.createButton}</button>
            <button class="btn-quiet" onClick={() => setMode('join')}>{v.joinButton}</button>
          </div>
        )}
        {mode !== null && (
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            {mode === 'join' && input({ value: code, placeholder: v.codeLabel, maxLength: 6, onInput: e => setCode(e.currentTarget.value.toUpperCase()) })}
            {input({ value: pin, placeholder: v.pinLabel, inputMode: 'numeric', maxLength: 8, onInput: e => setPin(e.currentTarget.value.replace(/\D/g, '')) })}
            <button class="btn-primary" disabled={!PIN_RE.test(pin) || (mode === 'join' && code.length !== 6)}
              onClick={() => submit(async () => {
                if (mode === 'create') setShownCode((await onCreate(pin)).code)
                else await onJoin(code, pin)
              })}>
              {mode === 'create' ? v.createButton : v.joinButton}
            </button>
            <button class="btn-quiet" onClick={() => { setMode(null); setError(null) }}>{cancelText}</button>
          </div>
        )}
        {error && <div style="font-size:13.5px;color:var(--hint);">{error}</div>}
      </>
    )
  }

  return (
    <>
      {shownCode && <div style="font-size:14px;color:var(--ink-mid);text-wrap:pretty;">{fill(v.codeShow, { code: shownCode })}</div>}
      <div style="font-size:14px;color:var(--ink-soft);">{fill(v.onLine, { code: sync.code })}</div>
      <div style="font-size:13px;color:var(--ink-mid);">
        {sync.failing ? v.failing : sync.lastSyncAt ? fill(v.lastSync, { when: new Date(sync.lastSyncAt).toLocaleString() }) : v.neverSync}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn-quiet" onClick={onSyncNow}>{v.syncNow}</button>
        <button class="btn-quiet" onClick={onLeave}>{v.leaveButton}</button>
      </div>
      <div style="font-size:13px;color:var(--ink-mid);border-top:1px dashed var(--line);padding-top:10px;">{v.deleteLine}</div>
      {mode === 'delete' ? (
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          {input({ value: pin, placeholder: v.pinLabel, inputMode: 'numeric', maxLength: 8, onInput: e => setPin(e.currentTarget.value.replace(/\D/g, '')) })}
          <button class="btn-primary" style="background:var(--hint);" disabled={!PIN_RE.test(pin)}
            onClick={() => submit(() => onDeleteEverywhere(pin))}>{v.confirm}</button>
          <button class="btn-quiet" onClick={() => { setMode(null); setError(null) }}>{cancelText}</button>
        </div>
      ) : (
        <div><button class="btn-quiet" onClick={() => setMode('delete')}>{v.deleteButton}</button></div>
      )}
      {error && <div style="font-size:13.5px;color:var(--hint);">{error}</div>}
    </>
  )
}
