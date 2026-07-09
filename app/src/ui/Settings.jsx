/**
 * Settings (SR-UI-01): small and calm — mic check, accent colour, key labels,
 * parent's glimpse (SR-UI-03), and per-player reset / removal (SR-STO-03).
 */
import { useState } from 'preact/hooks'
import { VOICE } from '../content/voice.js'

const fill = (t, vals) => t.replace(/\{(\w+)\}/g, (_, k) => vals[k])

export const ACCENTS = ['#B7813A', '#6F8C5A', '#5E7E9E', '#96608A']

function Card({ title, children }) {
  return (
    <div style="background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px 24px;display:flex;flex-direction:column;gap:10px;">
      <div style="font-family:var(--serif);font-weight:600;font-size:20px;">{title}</div>
      {children}
    </div>
  )
}

export function Settings({ profile, micEnabled, settings, glimpse, diagInfo,
  onHome, onMicCheck, onAccent, onLabels, onReset, onDelete, onCopyDiag, onClearDiag, canDelete }) {
  const v = VOICE.settings
  const [confirming, setConfirming] = useState(null)
  const [copied, setCopied] = useState(false)
  const accent = settings.accent ?? ACCENTS[0]
  const labels = settings.labels !== false

  return (
    <section style="flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;animation:fadeUp .4s ease;">
      <header style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:16px 30px 6px;">
        <div><button class="btn-quiet" onClick={onHome} style="padding:9px 16px;">← My course</button></div>
        <div style="text-align:center;">
          <div class="kicker">{v.kicker}</div>
          <div style="font-family:var(--serif);font-weight:600;font-size:23px;">{v.title}</div>
        </div>
        <div></div>
      </header>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:14px 36px 30px;max-width:1100px;margin:0 auto;width:100%;">
        <Card title={v.earsTitle}>
          <div style="font-size:14px;color:var(--ink-soft);text-wrap:pretty;">{micEnabled ? v.earsOn : v.earsOff}</div>
          <div><button class="btn-quiet" onClick={onMicCheck}>{v.earsButton}</button></div>
        </Card>

        <Card title={v.lookTitle}>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;">
            <div style="font-size:14px;color:var(--ink-soft);">{v.accentLine}</div>
            <div style="display:flex;gap:9px;">
              {ACCENTS.map(c => (
                <div key={c} onClick={() => onAccent(c)}
                  style={`width:30px;height:30px;border-radius:50%;background:${c};cursor:pointer;box-shadow:${accent === c ? '0 0 0 3px var(--card), 0 0 0 5.5px ' + c : 'inset 0 0 0 1px rgba(0,0,0,.12)'};transition:box-shadow .15s ease;`}></div>
              ))}
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;">
            <div style="font-size:14px;color:var(--ink-soft);">{v.labelsLine}</div>
            <button class="btn-quiet" onClick={() => onLabels(!labels)}>{labels ? v.labelsOn : v.labelsOff}</button>
          </div>
        </Card>

        <Card title={v.glimpseTitle}>
          <div style="font-size:13px;color:var(--ink-mid);">{v.glimpseLine}</div>
          <div style="background:var(--accent-soft);border:1px solid var(--line-strong);border-radius:14px;padding:14px 18px;display:flex;flex-direction:column;gap:5px;">
            {glimpse.map(line => (
              <div style="font-family:var(--serif);font-size:15.5px;color:var(--ink);text-wrap:pretty;">{line}</div>
            ))}
          </div>
        </Card>

        <Card title={v.playerTitle}>
          <div style="font-size:14px;color:var(--ink-soft);text-wrap:pretty;">{fill(v.resetLine, { name: profile.name })}</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            {confirming === 'reset' ? (
              <>
                <button class="btn-primary" style="background:var(--hint);" onClick={() => { setConfirming(null); onReset() }}>{v.resetConfirm}</button>
                <button class="btn-quiet" onClick={() => setConfirming(null)}>{v.cancel}</button>
              </>
            ) : (
              <button class="btn-quiet" onClick={() => setConfirming('reset')}>{v.resetButton}</button>
            )}
          </div>
          {canDelete && (
            <>
              <div style="font-size:14px;color:var(--ink-soft);text-wrap:pretty;border-top:1px dashed var(--line);padding-top:10px;">{fill(v.deleteLine, { name: profile.name })}</div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                {confirming === 'delete' ? (
                  <>
                    <button class="btn-primary" style="background:var(--hint);" onClick={() => { setConfirming(null); onDelete() }}>{fill(v.deleteConfirm, { name: profile.name })}</button>
                    <button class="btn-quiet" onClick={() => setConfirming(null)}>{v.cancel}</button>
                  </>
                ) : (
                  <button class="btn-quiet" onClick={() => setConfirming('delete')}>{v.deleteButton}</button>
                )}
              </div>
            </>
          )}
        </Card>

        <Card title={v.diagTitle}>
          <div style="font-size:14px;color:var(--ink-soft);text-wrap:pretty;">{v.diagLine}</div>
          <div style="font-family:var(--mono);font-size:11px;color:var(--ink-mono);line-height:1.7;">
            <div>Arietta {diagInfo.version} — screen {diagInfo.screen}</div>
            <div>Ears: {diagInfo.mic?.enabled ? `on (${diagInfo.mic.detector ?? 'mpm'})` : 'off'}{diagInfo.detectorAvgMs != null ? ` — ${diagInfo.detectorAvgMs.toFixed(1)}ms/frame` : ''}</div>
          </div>
          <div style="max-height:120px;overflow:auto;background:var(--card-warm);border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-family:var(--mono);font-size:11px;color:var(--ink-soft);line-height:1.8;">
            {diagInfo.entries.length === 0
              ? <div>{v.diagEmpty}</div>
              : diagInfo.entries.slice(-12).reverse().map(e => (
                  <div key={e.t}>{new Date(e.t).toLocaleString()} — {e.kind}{e.detail ? `: ${e.detail}` : ''}</div>
                ))}
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn-quiet" onClick={async () => { if (await onCopyDiag()) { setCopied(true); setTimeout(() => setCopied(false), 2500) } }}>
              {copied ? v.diagCopied : v.diagCopy}
            </button>
            {diagInfo.entries.length > 0 && <button class="btn-quiet" onClick={onClearDiag}>{v.diagClear}</button>}
          </div>
        </Card>
      </div>
    </section>
  )
}
