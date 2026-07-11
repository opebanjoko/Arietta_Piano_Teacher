/**
 * Verdicts for recorded takes. Runs the SAME pipeline functions CI scoring
 * uses (processBuffer / processBufferPoly) so what the operator attests at
 * the piano is exactly the math that scores the corpus later.
 */
import { processBuffer, processBufferPoly } from '../lib/pipeline.js';
import { midiName } from './tasks.js';

const setText = (midis) => midis.map(midiName).join(' + ');
const sameSet = (a, b) => a.length === b.length && a.every((m, i) => m === b[i]);
const sorted = (a) => [...a].sort((x, y) => x - y);

export function analyzeTake(samples, sampleRate, task) {
  if (task.mode === 'noise') {
    const { events } = processBuffer(samples, sampleRate, {});
    const heard = events.length
      ? `${events.length} note event${events.length === 1 ? '' : 's'}: ${events.map(e => midiName(e.pitch)).join(', ')}`
      : 'nothing at all';
    return { heard, match: events.length === 0, events };
  }

  if (task.mode === 'mono') {
    const { events } = processBuffer(samples, sampleRate, {});
    const pitches = [...new Set(events.map(e => e.pitch))];
    const heard = pitches.length ? pitches.map(midiName).join(', ') : 'nothing at all';
    return { heard, match: pitches.length === 1 && pitches[0] === task.expect.midi, events };
  }

  const { events } = processBufferPoly(samples, sampleRate, {});
  if (task.expectSeq) {
    const heard = events.length ? events.map(e => setText(e.midis)).join(' | ') : 'nothing at all';
    const match =
      events.length === task.expectSeq.length &&
      events.every((e, i) => sameSet(e.midis, sorted(task.expectSeq[i])));
    return { heard, match, events };
  }

  const heard = events.length ? events.map(e => setText(e.midis)).join(' | ') : 'nothing at all';
  const want = sorted(task.expect.midis);
  const match = events.length === 1 && sameSet(events[0].midis, want);
  return { heard, match, events };
}
