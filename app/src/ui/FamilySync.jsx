/** Family sync settings card (SR-STO-04, SR-BCK-02 interim code+PIN). */
import { useState } from 'preact/hooks'
import { VOICE } from '../content/voice.js'
import { fill } from './util.js'

const PIN_RE = /^\d{4,8}$/

export function FamilySync({ sync, onCreate, onJoin, onLeave, onDeleteEverywhere, onSyncNow }) {
  const v = VOICE.settings.sync
  const cancelText = VOICE.settings.cancel
  const [mode, setMode] = useState(null) // null | 'create' | 'join' | 'delete'
  const [pin, setPin] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [shownCode, setShownCode] = useState(null)

  const input = (label, props) => (
    <label style="display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:var(--ink-soft);">
      <span>{label}</span>
      <input {...props} class="hit" style="border:1px solid var(--line-strong);border-radius:10px;padding:9px 12px;font-size:15px;background:var(--card-warm);width:170px;" />
    </label>
  )

  const submit = async (fn, failText) => {
    setError(null)
    try { await fn(); setMode(null); setPin(''); setCode('') }
    catch { setError(failText) }
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
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
            {mode === 'join' && input(v.codeLabel, { value: code, maxLength: 6, onInput: e => setCode(e.currentTarget.value.toUpperCase()) })}
            {input(v.pinLabel, { value: pin, inputMode: 'numeric', maxLength: 8, onInput: e => setPin(e.currentTarget.value.replace(/\D/g, '')) })}
            <button class="btn-primary" disabled={!PIN_RE.test(pin) || (mode === 'join' && code.length !== 6)}
              onClick={() => submit(async () => {
                if (mode === 'create') setShownCode((await onCreate(pin)).code)
                else await onJoin(code, pin)
              }, mode === 'create' ? v.wrongCreate : v.wrongJoin)}>
              {mode === 'create' ? v.createButton : v.joinButton}
            </button>
            <button class="btn-quiet" onClick={() => { setMode(null); setError(null) }}>{cancelText}</button>
          </div>
        )}
        {error && <div role="alert" style="font-size:13.5px;color:var(--hint);">{error}</div>}
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
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
          {input(v.pinLabel, { value: pin, inputMode: 'numeric', maxLength: 8, onInput: e => setPin(e.currentTarget.value.replace(/\D/g, '')) })}
          <button class="btn-primary" style="background:var(--danger);" disabled={!PIN_RE.test(pin)}
            onClick={() => submit(() => onDeleteEverywhere(pin), v.wrongPin)}>{v.confirm}</button>
          <button class="btn-quiet" onClick={() => { setMode(null); setError(null) }}>{cancelText}</button>
        </div>
      ) : (
        <div><button class="btn-quiet" onClick={() => setMode('delete')}>{v.deleteButton}</button></div>
      )}
      {error && <div role="alert" style="font-size:13.5px;color:var(--hint);">{error}</div>}
    </>
  )
}
