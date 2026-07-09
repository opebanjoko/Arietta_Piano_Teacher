/**
 * Beta diagnostics log (SR-PLT-04-safe): a single capped record in the
 * existing 'app' store — on-device only, shared only when a parent copies
 * the export from Settings. Logged kinds are limited to app boots, unhandled
 * errors, and mic interruption/recovery/loss; never usage or progress.
 * Writes are serialized through a promise chain and never reject — a
 * failing write is dropped so diagnostics can never take the app down
 * or feed back into the error hooks.
 */
export const DIAG_CAP = 200
const KEY = 'diagLog'

async function append(db, kind, detail, now) {
  const rec = (await db.get('app', KEY)) ?? { key: KEY, entries: [] }
  rec.entries.push({ t: now, kind, detail: String(detail).slice(0, 300) })
  if (rec.entries.length > DIAG_CAP) rec.entries = rec.entries.slice(-DIAG_CAP)
  await db.put('app', rec)
}

let queue = Promise.resolve()

export function logDiag(db, kind, detail = '', now = Date.now()) {
  queue = queue.then(() => append(db, kind, detail, now)).catch(() => {})
  return queue
}

export async function listDiag(db) {
  return (await db.get('app', KEY))?.entries ?? []
}

export function clearDiag(db) {
  queue = queue.then(() => db.put('app', { key: KEY, entries: [] })).catch(() => {})
  return queue
}
