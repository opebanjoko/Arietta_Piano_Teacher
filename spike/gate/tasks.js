/**
 * Task scripts for the gate app: every prompt the runbooks ask a human to
 * play, as pure data. Filenames follow the corpus conventions verbatim
 * (GATE_RUNBOOK.md, POLY_GATE_RUNBOOK.md); '#' becomes 's' for filesystems.
 */
const LETTERS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiName(midi) {
  return LETTERS[midi % 12] + (Math.floor(midi / 12) - 1);
}

const safe = (name) => name.replace('#', 's');

export function monoCorpusTasks({ instrument, distance }) {
  const tasks = [];
  for (let midi = 48; midi <= 84; midi++) {
    const name = midiName(midi);
    tasks.push({
      id: `mono-${safe(name)}`,
      mode: 'mono',
      prompt: `Play ${name} — one clean strike, let it ring.`,
      expect: { midi },
      recordSec: 2.5,
      filename: `${instrument}-${safe(name)}-${distance}-1.wav`
    });
  }
  return tasks;
}

const TRIADS = [
  { label: 'C3maj', midis: [48, 52, 55], say: 'C major, left hand at the deep C' },
  { label: 'F3maj', midis: [53, 57, 60], say: 'F major, left hand' },
  { label: 'G3maj', midis: [55, 59, 62], say: 'G major, left hand' },
  { label: 'C4maj', midis: [60, 64, 67], say: 'C major, right hand at middle C' },
  { label: 'F4maj', midis: [65, 69, 72], say: 'F major, right hand' }
];

const DYADS = [
  { label: 'C4E4', midis: [60, 64], say: 'C and E together, right hand' },
  { label: 'E4G4', midis: [64, 67], say: 'E and G together, right hand' },
  { label: 'C3E3', midis: [48, 52], say: 'C and E together, low, left hand' }
];

export function polyCorpusTasks({ piano, distance }) {
  const file = (label) => `poly-${piano}-${label}-${distance}-1.wav`;
  const tasks = [];
  for (const t of TRIADS) {
    tasks.push({
      id: t.label,
      mode: 'poly',
      prompt: `Play the ${t.say} — all three notes landing together, let them ring.`,
      expect: { midis: t.midis },
      recordSec: 3,
      filename: file(t.label)
    });
  }
  for (const d of DYADS) {
    tasks.push({
      id: d.label,
      mode: 'poly',
      prompt: `Play ${d.say} — both notes at the same moment.`,
      expect: { midis: d.midis },
      recordSec: 3,
      filename: file(d.label)
    });
  }
  tasks.push({
    id: 'heldbass',
    mode: 'poly',
    prompt: 'Hold deep C (C3) with the left hand, and over it play C4, D4, E4, F4, G4 — one per second, while the bass keeps ringing.',
    expectSeq: [[48], [60], [62], [64], [65], [67]],
    recordSec: 8,
    filename: file('heldbass')
  });
  tasks.push({
    id: 'together',
    mode: 'poly',
    prompt: 'Land the C3-E3-G3 chord with the left hand and hold it. Over it play D4, F4, A4, F4, D4 — one per second.',
    expectSeq: [[48, 52, 55], [62], [65], [69], [65], [62]],
    recordSec: 10,
    filename: file('together')
  });
  return tasks;
}

/** Noise soak (G2/P3): count note events with nobody playing. */
export const SOAK = { minutes: 10, passMax: 1 };

/**
 * Recorded noise clips (GATE_RUNBOOK Session 1, feeds corpus G2 scoring).
 * Nobody touches the piano during these; quiet is a pass.
 */
export function noiseTasks() {
  const mk = (what, recordSec, say) => ({
    id: `noise-${what}`,
    mode: 'noise',
    prompt: say,
    recordSec,
    filename: `noise-${what}-1.wav`
  });
  return [
    mk('speech', 120, 'Two people talk right next to the piano for two minutes. Nobody touches the keys.'),
    mk('tv', 120, 'TV audible from the next room for two minutes. Nobody touches the keys.'),
    mk('household', 120, 'Normal household clatter for two minutes: kitchen sounds, footsteps, a door. No piano.'),
    mk('singing', 60, 'Someone hums or sings near the iPad for one minute — pitched non-piano sound is the hardest case. No piano.')
  ];
}
