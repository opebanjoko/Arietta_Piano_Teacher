/**
 * Practice planner: pure selection over completed lessons and practice recency.
 * Practice packs themselves resolve to normal ephemeral lesson objects.
 */

function clone(v) {
  return JSON.parse(JSON.stringify(v))
}

function unit1Complete(lessons, progress) {
  const unit1 = lessons.filter(l => l.unitId === 'u1')
  return unit1.length > 0 && unit1.every(l => progress.get(l.id)?.completed)
}

function eligible(pack, progress) {
  return pack.unlocksAfter.every(id => progress.get(id)?.completed)
}

function recency(pack, practiceProgress) {
  return practiceProgress.get(pack.id)?.lastPracticedAt ?? 0
}

function hasRhythm(pack) {
  return pack.tags.includes('rhythm') || pack.lesson.tempo ||
    (pack.lesson.steps ?? []).some(s => s.kind === 'rhythm-clap' || s.timed)
}

function primaryTag(pack) {
  return pack.tags[0] ?? 'review'
}

/**
 * Returns a lesson-shaped copy that the existing drill/song screens can run.
 * The source pack is not mutated.
 */
export function practiceLesson(pack) {
  return {
    ...clone(pack.lesson),
    id: pack.id,
    practicePackId: pack.id,
    ephemeral: true,
    unitId: pack.unitId,
    unitTag: 'PRACTICE',
    unitTitle: pack.unitTitle
  }
}

/**
 * Select 1-3 short practice entries from already-completed material.
 * Missing practice progress means "not practiced yet", so it sorts first.
 */
export function planPracticeSession({ lessons, packs, progress, practiceProgress, maxEntries = 3 }) {
  if (!unit1Complete(lessons, progress)) return null

  const eligiblePacks = packs
    .filter(pack => eligible(pack, progress))
    .sort((a, b) => recency(a, practiceProgress) - recency(b, practiceProgress))
  if (!eligiblePacks.length) return null

  const entries = []
  const usedTags = new Set()
  let rhythmTaken = false

  for (const pass of ['variety', 'fill']) {
    for (const pack of eligiblePacks) {
      if (entries.length >= maxEntries) break
      if (entries.some(e => e.id === pack.id)) continue
      const rhythm = hasRhythm(pack)
      if (rhythm && rhythmTaken) continue
      const tag = primaryTag(pack)
      if (pass === 'variety' && usedTags.has(tag)) continue
      entries.push(pack)
      usedTags.add(tag)
      rhythmTaken = rhythmTaken || rhythm
    }
  }

  return entries.length ? { id: `practice-${entries.map(e => e.id).join('-')}`, entries } : null
}
