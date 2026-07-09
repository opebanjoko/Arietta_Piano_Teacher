import { yin, mpm, rms, midiToFreq } from './pitch.js';
import { pianoTone } from './signals.js';
import { NoteTracker } from './tracker.js';

const DETECTORS = { yin, mpm };

/**
 * Render a scripted performance to a mono buffer plus ground truth.
 * notes: [{ midi, atMs, durMs, amp? }] -> { samples, truth: [{ midi, atMs }] }
 */
export function renderPerformance(notes, sampleRate) {
  const endMs = Math.max(...notes.map((n) => n.atMs + n.durMs)) + 500;
  const samples = new Float32Array(Math.ceil((endMs / 1000) * sampleRate));
  for (const n of notes) {
    const tone = pianoTone(midiToFreq(n.midi), sampleRate, Math.floor((n.durMs / 1000) * sampleRate), n.amp ?? 0.3, {
      decay: 0.99995,
    });
    const start = Math.floor((n.atMs / 1000) * sampleRate);
    for (let i = 0; i < tone.length; i++) samples[start + i] += tone[i];
  }
  return { samples, truth: notes.map((n) => ({ midi: n.midi, atMs: n.atMs })) };
}

/**
 * Run the detector-to-tracker pipeline over a whole buffer (corpus mode).
 * Frame timestamps are end-of-frame: a strike can only be known once the
 * frame containing it is complete, so latency accounting stays honest.
 */
export function processBuffer(samples, sampleRate, { detector = 'mpm', frameSize = 2048, hopSize = 1024, tracker: trackerOpts } = {}) {
  const detect = typeof detector === 'function' ? detector : DETECTORS[detector];
  const noteTracker = new NoteTracker(trackerOpts);
  const events = [];
  for (let start = 0; start + frameSize <= samples.length; start += hopSize) {
    const frame = samples.subarray(start, start + frameSize);
    const tMs = ((start + frameSize) / sampleRate) * 1000;
    const e = noteTracker.feed(detect(frame, sampleRate), rms(frame), tMs);
    if (e) events.push(e);
  }
  return { events, durationMs: (samples.length / sampleRate) * 1000 };
}
