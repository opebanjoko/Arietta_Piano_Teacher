/** Note-name helpers and clip-level corpus scoring (SR-VER-01, recorded clips). */

const PITCH_CLASS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteNameToMidi(name) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) return null;
  const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return PITCH_CLASS[m[1]] + accidental + 12 * (Number(m[3]) + 1);
}

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi) {
  return NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
}

/**
 * Score one-note-per-clip recordings plus noise-only clips against the
 * Phase 0 gate. A note clip counts as detected if at least one event has the
 * expected pitch; every other event anywhere is a false event, normalized
 * per 10 minutes over the corpus's total duration.
 */
export function scoreClips(clips) {
  let noteClips = 0;
  let detected = 0;
  let falseEvents = 0;
  let totalMs = 0;

  for (const clip of clips) {
    totalMs += clip.durationMs;
    if (clip.expectedMidi === null) {
      falseEvents += clip.events.length;
      continue;
    }
    noteClips++;
    const hits = clip.events.filter((e) => e.pitch === clip.expectedMidi).length;
    if (hits >= 1) detected++;
    falseEvents += clip.events.length - Math.min(hits, 1);
  }

  const detectionRate = noteClips === 0 ? 1 : detected / noteClips;
  const falsePer10Min = totalMs > 0 ? (falseEvents * 600000) / totalMs : 0;
  return {
    noteClips,
    detected,
    detectionRate,
    falseEvents,
    falsePer10Min,
    pass: detectionRate >= 0.95 && falsePer10Min <= 1,
  };
}
