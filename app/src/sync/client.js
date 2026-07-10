/**
 * Sync client (SR-STO-04): state-based push/pull of per-profile progress
 * documents. Fully additive — with no linked family every call is inert,
 * and failures are silent ('fail' return, never a throw from syncNow).
 * Docs merge via merge.js on pull; the server merges again on push.
 *
 * Deletion: the server is the arbiter of tombstones. The client always
 * pushes its local docs (including any it thinks are ghosts of a
 * server-side tombstone — the server's updatedAt > deleted_at rule decides
 * whether that revives the tombstone or is dropped). After the PUT, the
 * client applies the server's response as ground truth: docs are upserted,
 * and any profileId in the response's `deleted` list has its local profile,
 * progress rows, and settings removed.
 */
import { mergeDocs, emptyDoc } from './merge.js'

const DEBOUNCE_MS = 3000
const BACKOFF_MS = [30_000, 120_000, 480_000]

export function createSyncClient({ db, url, fetchFn = (...a) => globalThis.fetch(...a), onChange = () => {}, now = () => Date.now() }) {
  let timer = null
  let failStreak = 0
  let inflight = null

  const getCfg = async () => (await db.get('app', 'sync'))?.value ?? null
  const putCfg = (value) => db.put('app', { key: 'sync', value })

  async function call(method, path, body, token) {
    const res = await fetchFn(url + path, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const err = new Error(body.error ?? `sync ${res.status}`)
      err.status = res.status
      throw err
    }
    return res.status === 204 ? {} : res.json()
  }

  async function buildDocs() {
    const profiles = await db.getAll('profiles')
    const rows = await db.getAll('progress')
    const docs = []
    for (const p of profiles) {
      const doc = emptyDoc(p)
      for (const r of rows.filter(r => r.profileId === p.id)) {
        const e = { completed: !!r.completed }
        if (r.bestCount != null) e.bestCount = r.bestCount
        if (!e.completed && r.stepIndex != null) e.stepIndex = r.stepIndex
        if (r.lastPlayedAt != null) e.lastPlayedAt = r.lastPlayedAt
        doc.lessons[r.lessonId] = e
        doc.updatedAt = Math.max(doc.updatedAt, r.lastPlayedAt ?? 0)
      }
      doc.settings = (await db.get('app', `settings:${p.id}`))?.value ?? {}
      // settings can be the only thing that changed (accent, labels) — a doc
      // whose clock ignores that ties the server copy and a merge tie keeps
      // the stored side, silently reverting the settings-only change
      doc.updatedAt = Math.max(doc.updatedAt, doc.settings.updatedAt ?? 0)
      docs.push(doc)
    }
    return docs
  }

  async function applyDoc(doc) {
    const existing = await db.get('profiles', doc.profileId)
    if (!existing) await db.put('profiles', { id: doc.profileId, name: doc.name, createdAt: doc.createdAt })
    for (const [lessonId, e] of Object.entries(doc.lessons)) {
      await db.put('progress', { profileId: doc.profileId, lessonId, ...e })
    }
    if (Object.keys(doc.settings ?? {}).length) {
      await db.put('app', { key: `settings:${doc.profileId}`, value: doc.settings })
    }
  }

  async function removeLocal(profileId) {
    await db.delete('profiles', profileId)
    const rows = await db.getAll('progress')
    for (const r of rows.filter(r => r.profileId === profileId)) await db.delete('progress', [r.profileId, r.lessonId])
    const packs = await db.getAll('practice')
    for (const r of packs.filter(r => r.profileId === profileId)) await db.delete('practice', [r.profileId, r.packId])
    await db.delete('app', `settings:${profileId}`)
  }

  async function run() {
    const cfg = await getCfg()
    if (!cfg?.token) return 'off'
    try {
      const remote = await call('GET', '/sync', undefined, cfg.token)
      const local = await buildDocs()
      const byId = new Map(local.map(d => [d.profileId, d]))
      const merged = []
      for (const rd of remote.docs) merged.push(mergeDocs(byId.get(rd.profileId) ?? null, rd))
      for (const ld of local) if (!remote.docs.some(rd => rd.profileId === ld.profileId)) merged.push(ld)
      const deleted = cfg.deleted ?? []
      const keep = merged.filter(d => !deleted.includes(d.profileId))
      for (const d of keep) await applyDoc(d)
      const pushed = await call('PUT', '/sync', { docs: keep, deleted }, cfg.token)
      for (const d of pushed.docs) await applyDoc(d)
      for (const pid of pushed.deleted ?? []) await removeLocal(pid)
      failStreak = 0
      // re-read cfg: leave() during the round trips must stay left, and
      // tombstones queued mid-sync must survive for the next push
      const fresh = await getCfg()
      if (fresh?.token === cfg.token) {
        await putCfg({ ...fresh, deleted: (fresh.deleted ?? []).filter(p => !deleted.includes(p)), lastSyncAt: now() })
      }
      onChange()
      return 'ok'
    } catch (err) {
      // another device deleted the household (or the token was otherwise
      // revoked) — retrying forever would just show a permanent, false
      // "having trouble reaching home base"; unlink instead, keeping local data
      if (err.status === 401) {
        clearTimeout(timer)
        await db.delete('app', 'sync')
        failStreak = 0
        onChange()
        return 'off'
      }
      failStreak += 1
      clearTimeout(timer)
      timer = setTimeout(syncNow, BACKOFF_MS[Math.min(failStreak - 1, BACKOFF_MS.length - 1)])
      timer.unref?.() // node timers must not hold the test process open; no-op in browsers
      onChange()
      return 'fail'
    }
  }

  // collapses concurrent callers (debounced schedule() racing a manual sync) into one round trip
  function syncNow() {
    if (inflight) return inflight
    inflight = run().finally(() => { inflight = null })
    return inflight
  }

  async function leave() {
    clearTimeout(timer)
    failStreak = 0
    await db.delete('app', 'sync')
    onChange()
  }

  return {
    async getState() {
      const cfg = await getCfg()
      return { linked: !!cfg?.token, code: cfg?.code ?? null, lastSyncAt: cfg?.lastSyncAt ?? null, failing: failStreak > 0 }
    },
    async create(pin) {
      const { code, token } = await call('POST', '/households', { pin })
      await putCfg({ token, code, deleted: [], lastSyncAt: null })
      await syncNow()
      return { code }
    },
    async join(code, pin) {
      const { token } = await call('POST', '/households/link', { code: code.toUpperCase(), pin })
      await putCfg({ token, code: code.toUpperCase(), deleted: [], lastSyncAt: null })
      await syncNow()
    },
    leave,
    async deleteEverywhere(pin) {
      const cfg = await getCfg()
      if (!cfg?.token) return
      await call('DELETE', '/households', { pin }, cfg.token)
      await leave()
    },
    async noteProfileDeleted(profileId) {
      const cfg = await getCfg()
      if (!cfg?.token) return
      await putCfg({ ...cfg, deleted: [...(cfg.deleted ?? []), profileId] })
    },
    schedule() {
      clearTimeout(timer)
      timer = setTimeout(syncNow, DEBOUNCE_MS)
      timer.unref?.()
    },
    syncNow
  }
}
