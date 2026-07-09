/**
 * Beta diagnostics log (SR-PLT-04-safe): a single capped record in the
 * existing 'app' store — on-device only, shared only when a parent copies
 * the export from Settings. Logged kinds are limited to app boots, unhandled
 * errors, and mic interruption/recovery/loss; never usage or progress.
 */
export const DIAG_CAP = 200
const KEY = 'diagLog'

export async function logDiag(db, kind, detail = '', now = Date.now()) {
  const rec = (await db.get('app', KEY)) ?? { key: KEY, entries: [] }
  rec.entries.push({ t: now, kind, detail: String(detail).slice(0, 300) })
  if (rec.entries.length > DIAG_CAP) rec.entries = rec.entries.slice(-DIAG_CAP)
  await db.put('app', rec)
}

export async function listDiag(db) {
  return (await db.get('app', KEY))?.entries ?? []
}

export async function clearDiag(db) {
  await db.put('app', { key: KEY, entries: [] })
}
