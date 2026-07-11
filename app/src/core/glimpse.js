/**
 * Parent's glimpse (SR-UI-03): a per-profile summary in Arietta's own voice,
 * rendered from the progress store. Words, not charts; never comparative;
 * no digits anywhere.
 */
import { letter, nameToMidi } from './notes.js'
import { VOICE } from '../content/voice.js'

const fill = (t, vals) => t.replace(/\{(\w+)\}/g, (_, k) => vals[k])

function joinWords(items, and) {
  if (items.length === 1) return items[0]
  return `${items.slice(0, -1).join(', ')} ${and} ${items.at(-1)}`
}

function whenWords(ms, g) {
  const day = 24 * 60 * 60 * 1000
  if (ms < day) return g.today
  if (ms < 2 * day) return g.yesterday
  if (ms < 7 * day) return g.thisWeek
  return g.aWhile
}

/** Sentences for the glimpse card. lessons from allLessons(), progress from the store. */
export function glimpseText({ name, lessons, progress, now = Date.now() }, voice = VOICE) {
  const g = voice.glimpse
  const completed = lessons.filter(l => progress.get(l.id)?.completed)
  if (!completed.length) return [fill(g.fresh, { name })]

  const sentences = []

  const notes = []
  for (const l of completed.filter(l => l.kind === 'drill')) {
    for (const s of l.steps ?? []) {
      for (const t of s.targets ?? []) {
        for (const n of t.notes ?? [t.note]) { // chord targets carry { notes }
          const L = letter(nameToMidi(n))
          if (!notes.includes(L)) notes.push(L)
        }
      }
    }
  }
  if (notes.length) sentences.push(fill(g.notes, { name, notes: joinWords(notes, g.and) }))

  const songs = completed.filter(l => l.kind === 'song').map(l => l.title)
  if (songs.length) sentences.push(fill(g.songs, { songs: joinWords(songs, g.and) }))

  const last = Math.max(...[...progress.values()].map(r => r.lastPlayedAt ?? 0))
  if (last > 0) sentences.push(fill(g.last, { when: whenWords(now - last, g) }))

  const next = lessons.find(l => !l.comingSoon && !progress.get(l.id)?.completed)
  sentences.push(next ? fill(g.next, { lesson: next.title }) : g.courseDone)
  return sentences
}
