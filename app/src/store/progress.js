/**
 * Local-first progress store (SR-STO-01..03), keyed by profile.
 * All functions take the opened db handle from db.js (or a fake in tests).
 */

export const MAX_PROFILES = 5

export async function listProfiles(db) {
  const all = await db.getAll('profiles')
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export async function createProfile(db, name, now = Date.now()) {
  const existing = await db.getAll('profiles')
  if (existing.length >= MAX_PROFILES) throw new Error(`at most ${MAX_PROFILES} profiles`)
  const profile = { id: crypto.randomUUID(), name: name.trim(), createdAt: now }
  await db.put('profiles', profile)
  return profile
}

/** Delete removes the profile and all of its data (SR-STO-03). */
export async function deleteProfile(db, profileId) {
  await resetProgress(db, profileId)
  await db.delete('app', `settings:${profileId}`)
  await db.delete('profiles', profileId)
}

export async function resetProgress(db, profileId) {
  const rows = await db.getAll('progress')
  for (const r of rows) {
    if (r.profileId === profileId) await db.delete('progress', [r.profileId, r.lessonId])
  }
}

/** Map of lessonId -> {completed, bestCount, stepIndex, lastPlayedAt}. */
export async function getProgress(db, profileId) {
  const rows = await db.getAll('progress')
  return new Map(rows.filter(r => r.profileId === profileId).map(r => [r.lessonId, r]))
}

async function patchLesson(db, profileId, lessonId, patch) {
  const prev = (await db.get('progress', [profileId, lessonId])) ?? { profileId, lessonId, completed: false }
  const next = { ...prev, ...patch }
  await db.put('progress', next)
  return next
}

export function markComplete(db, profileId, lessonId, now = Date.now()) {
  return patchLesson(db, profileId, lessonId, { completed: true, stepIndex: undefined, lastPlayedAt: now })
}

/** Song completion keeps the best clean-note count for the parent's glimpse. */
export async function recordSongRun(db, profileId, lessonId, noteCount, now = Date.now()) {
  const prev = await db.get('progress', [profileId, lessonId])
  const bestCount = Math.max(prev?.bestCount ?? 0, noteCount)
  return patchLesson(db, profileId, lessonId, { completed: true, bestCount, lastPlayedAt: now })
}

/** Mid-drill position so leaving and returning resumes the lesson (SR-STO-01). */
export function savePosition(db, profileId, lessonId, stepIndex, now = Date.now()) {
  return patchLesson(db, profileId, lessonId, { stepIndex, lastPlayedAt: now })
}

export async function getSettings(db, profileId) {
  return (await db.get('app', `settings:${profileId}`))?.value ?? {}
}

export async function saveSettings(db, profileId, value) {
  await db.put('app', { key: `settings:${profileId}`, value })
}

export async function getActiveProfileId(db) {
  return (await db.get('app', 'activeProfile'))?.value ?? null
}

export async function setActiveProfileId(db, profileId) {
  await db.put('app', { key: 'activeProfile', value: profileId })
}
