import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MIGRATIONS } from '../src/store/db.js'
import {
  MAX_PROFILES, listProfiles, createProfile, deleteProfile, resetProgress,
  getProgress, markComplete, recordSongRun, savePosition,
  getPracticeProgress, recordPracticeRun,
  getSettings, saveSettings, getActiveProfileId, setActiveProfileId
} from '../src/store/progress.js'

/** In-memory fake of the db.js handle interface. */
function memDb() {
  const stores = { profiles: new Map(), progress: new Map(), practice: new Map(), app: new Map() }
  const keyOf = (store, v) => store === 'profiles' ? v.id
    : store === 'progress' ? `${v.profileId}\0${v.lessonId}`
    : store === 'practice' ? `${v.profileId}\0${v.packId}`
    : v.key
  const norm = (k) => Array.isArray(k) ? k.join('\0') : k
  return {
    get: async (s, k) => stores[s].get(norm(k)),
    getAll: async (s) => [...stores[s].values()],
    put: async (s, v) => { stores[s].set(keyOf(s, v), structuredClone(v)) },
    delete: async (s, k) => { stores[s].delete(norm(k)) }
  }
}

test('schema has a forward migration list (SR-STO-02)', () => {
  assert.ok(MIGRATIONS.length >= 1)
  MIGRATIONS.forEach(m => assert.equal(typeof m, 'function'))
})

test('profiles: create by name only, capped at 5, listed in creation order', async () => {
  const db = memDb()
  await createProfile(db, 'Ava', 1)
  await createProfile(db, ' Leo ', 2)
  const profiles = await listProfiles(db)
  assert.deepEqual(profiles.map(p => p.name), ['Ava', 'Leo'])
  assert.ok(profiles[0].id)

  for (const i of [3, 4, 5]) await createProfile(db, `P${i}`, i)
  await assert.rejects(() => createProfile(db, 'One too many'), new RegExp(`${MAX_PROFILES}`))
})

test('lesson progress: completion, song best counts, mid-lesson position', async () => {
  const db = memDb()
  const p = await createProfile(db, 'Ava')

  await savePosition(db, p.id, 'meet-e', 2, 10)
  let prog = await getProgress(db, p.id)
  assert.equal(prog.get('meet-e').stepIndex, 2)
  assert.equal(prog.get('meet-e').completed, false)

  await markComplete(db, p.id, 'meet-e', 20)
  prog = await getProgress(db, p.id)
  assert.equal(prog.get('meet-e').completed, true)
  assert.equal(prog.get('meet-e').stepIndex, undefined)
  assert.equal(prog.get('meet-e').lastPlayedAt, 20)

  await recordSongRun(db, p.id, 'ode-to-joy', 15, 30)
  await recordSongRun(db, p.id, 'ode-to-joy', 12, 40)
  prog = await getProgress(db, p.id)
  assert.equal(prog.get('ode-to-joy').bestCount, 15)
  assert.equal(prog.get('ode-to-joy').lastPlayedAt, 40)
})

test('progress is isolated per profile', async () => {
  const db = memDb()
  const a = await createProfile(db, 'Ava')
  const b = await createProfile(db, 'Leo')
  await markComplete(db, a.id, 'meet-e')
  assert.equal((await getProgress(db, b.id)).size, 0)
})

test('practice progress: recency and completed count are stored per profile', async () => {
  const db = memDb()
  const a = await createProfile(db, 'Ava')
  const b = await createProfile(db, 'Leo')

  await recordPracticeRun(db, a.id, 'practice-meet-e-little-hill', 10)
  await recordPracticeRun(db, a.id, 'practice-meet-e-little-hill', 20)
  await recordPracticeRun(db, b.id, 'practice-meet-e-little-hill', 30)

  const ap = await getPracticeProgress(db, a.id)
  const bp = await getPracticeProgress(db, b.id)
  assert.equal(ap.get('practice-meet-e-little-hill').completedCount, 2)
  assert.equal(ap.get('practice-meet-e-little-hill').lastPracticedAt, 20)
  assert.equal(bp.get('practice-meet-e-little-hill').completedCount, 1)
  assert.equal(bp.get('practice-meet-e-little-hill').lastPracticedAt, 30)
})

test('reset clears progress; delete removes profile, progress and settings', async () => {
  const db = memDb()
  const p = await createProfile(db, 'Ava')
  await markComplete(db, p.id, 'meet-e')
  await recordPracticeRun(db, p.id, 'practice-meet-e-little-hill', 20)
  await saveSettings(db, p.id, { accent: '#7C8A55' }, 50)

  await resetProgress(db, p.id)
  assert.equal((await getProgress(db, p.id)).size, 0)
  assert.equal((await getPracticeProgress(db, p.id)).size, 0)
  assert.deepEqual(await getSettings(db, p.id), { accent: '#7C8A55', updatedAt: 50 })

  await recordPracticeRun(db, p.id, 'practice-meet-e-little-hill', 30)
  await deleteProfile(db, p.id)
  assert.deepEqual(await listProfiles(db), [])
  assert.equal((await getPracticeProgress(db, p.id)).size, 0)
  assert.deepEqual(await getSettings(db, p.id), {})
})

test('saveSettings stamps an injected updatedAt so a settings-only change has its own clock (Finding 1)', async () => {
  const db = memDb()
  const p = await createProfile(db, 'Ava')
  await saveSettings(db, p.id, { accent: '#7C8A55' }, 500)
  assert.deepEqual(await getSettings(db, p.id), { accent: '#7C8A55', updatedAt: 500 })
  await saveSettings(db, p.id, { accent: '#6F8C5A' }, 900)
  assert.deepEqual(await getSettings(db, p.id), { accent: '#6F8C5A', updatedAt: 900 })
})

test('active profile survives via the app store', async () => {
  const db = memDb()
  assert.equal(await getActiveProfileId(db), null)
  await setActiveProfileId(db, 'abc')
  assert.equal(await getActiveProfileId(db), 'abc')
})
