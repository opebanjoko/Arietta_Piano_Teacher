/**
 * Conflict resolution for sync (SR-STO-05): per lesson, most-progress-wins —
 * completed > in-progress > untouched; within a state the higher stepIndex /
 * bestCount wins; lastPlayedAt is the max. Settings resolve whole-doc by the
 * newer updatedAt (exact ties keep the first argument; same-ms writes from
 * two devices are not worth extra machinery).
 *
 * Pure and dependency-free: the server keeps a byte-identical copy at
 * server/merge.js, guarded by server/test/merge-copy.test.js. Edit this file,
 * then re-copy.
 */

const maxDef = (x, y) => x == null ? (y ?? undefined) : y == null ? x : Math.max(x, y)

export function mergeLessonEntry(a = {}, b = {}) {
  const completed = !!(a.completed || b.completed)
  const out = { completed }
  const bestCount = maxDef(a.bestCount, b.bestCount)
  if (bestCount !== undefined) out.bestCount = bestCount
  if (!completed) {
    const stepIndex = maxDef(a.stepIndex, b.stepIndex)
    if (stepIndex !== undefined) out.stepIndex = stepIndex
  }
  const lastPlayedAt = maxDef(a.lastPlayedAt, b.lastPlayedAt)
  if (lastPlayedAt !== undefined) out.lastPlayedAt = lastPlayedAt
  return out
}

export function mergeDocs(a, b) {
  if (!a) return b
  if (!b) return a
  const newer = (b.updatedAt ?? 0) > (a.updatedAt ?? 0) ? b : a
  const ids = new Set([...Object.keys(a.lessons ?? {}), ...Object.keys(b.lessons ?? {})])
  const lessons = {}
  for (const id of [...ids].sort()) lessons[id] = mergeLessonEntry(a.lessons?.[id], b.lessons?.[id])
  return {
    profileId: a.profileId ?? b.profileId,
    name: newer.name,
    createdAt: Math.min(a.createdAt ?? Infinity, b.createdAt ?? Infinity),
    lessons,
    settings: newer.settings ?? {},
    updatedAt: Math.max(a.updatedAt ?? 0, b.updatedAt ?? 0)
  }
}

export function emptyDoc(profile) {
  return { profileId: profile.id, name: profile.name, createdAt: profile.createdAt, lessons: {}, settings: {}, updatedAt: 0 }
}
