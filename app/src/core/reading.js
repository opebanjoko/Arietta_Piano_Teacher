/**
 * Fresh-reading snippets (SR-CRS-11): a 3-5 note phrase nobody has ever
 * played before, assembled from the learned pool, moving only by the steps
 * and skips taught so far. Seeded: the same seed is the same phrase, the
 * next seed is a fresh one — so snippets never repeat back to back.
 */
import { VOICE } from '../content/voice.js'

// mulberry32 — tiny deterministic PRNG so a seed is a phrase
function prng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const INTERVALS = [-2, -1, 1, 2] // steps and skips, never standing still

/** pool: [{note, finger}] in keyboard order. Returns 3-5 targets from it. */
export function generateSnippet({ pool, seed = 0, len }) {
  const rnd = prng(seed * 2654435761 + 1)
  const n = len ?? 3 + Math.floor(rnd() * 3)
  let at = Math.floor(rnd() * pool.length)
  const targets = [pool[at]]
  while (targets.length < n) {
    const options = INTERVALS.filter(d => at + d >= 0 && at + d < pool.length)
    at += options[Math.floor(rnd() * options.length)]
    targets.push(pool[at])
  }
  return targets
}

/**
 * Resolve a lesson's 'reading-snippet' steps into concrete play steps.
 * Returns the lesson untouched when it has none.
 */
export function resolveReading(lesson, seed, voice = VOICE) {
  if (!lesson.steps?.some(s => s.kind === 'reading-snippet')) return lesson
  let bump = 0
  return {
    ...lesson,
    steps: lesson.steps.map(s => s.kind !== 'reading-snippet' ? s : {
      kind: 'play',
      reading: true,
      prompt: s.prompt ?? voice.reading.prompt,
      sub: s.sub ?? voice.reading.sub,
      targets: generateSnippet({ pool: s.pool, seed: seed + bump++, len: s.len })
    })
  }
}

/** A tiny ephemeral warm-up lesson around one fresh snippet (§3.5). */
export function readingWarmup(pool, seed, voice = VOICE) {
  return resolveReading({
    id: 'fresh-reading',
    title: voice.reading.warmupTitle,
    kind: 'drill',
    ephemeral: true, // never persisted — it exists only for this hello
    steps: [{ kind: 'reading-snippet', pool }],
    done: { title: voice.reading.doneTitle, line: voice.reading.doneLine }
  }, seed, voice)
}
