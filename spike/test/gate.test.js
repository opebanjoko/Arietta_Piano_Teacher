import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeWav } from '../gate/wav.js';
import { encodeZip, crc32 } from '../gate/zip.js';
import { monoCorpusTasks, polyCorpusTasks, noiseTasks, SOAK } from '../gate/tasks.js';
import { analyzeTake } from '../gate/analyze.js';
import { renderPerformance } from '../lib/pipeline.js';

const take = (notes) => renderPerformance(notes, 48000).samples;

test('encodeWav writes a valid 16-bit mono RIFF header and PCM data', () => {
  const samples = Float32Array.from([0, 0.5, -0.5, 1, -1]);
  const wav = encodeWav(samples, 48000);
  const dv = new DataView(wav.buffer);
  assert.equal(String.fromCharCode(...wav.subarray(0, 4)), 'RIFF');
  assert.equal(String.fromCharCode(...wav.subarray(8, 12)), 'WAVE');
  assert.equal(dv.getUint16(22, true), 1); // mono
  assert.equal(dv.getUint32(24, true), 48000);
  assert.equal(dv.getUint16(34, true), 16); // bits
  assert.equal(dv.getUint32(40, true), samples.length * 2);
  assert.equal(dv.getInt16(44, true), 0);
  assert.equal(dv.getInt16(46, true), 16383); // 0.5
  assert.equal(dv.getInt16(50, true), 32767); // 1 clamps to max
  assert.equal(dv.getInt16(52, true), -32768);
});

test('crc32 matches the standard check value', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

test('encodeZip writes readable stored entries and a central directory', () => {
  const a = new TextEncoder().encode('hello wav world');
  const b = new TextEncoder().encode('second entry');
  const zip = encodeZip([{ name: 'a.wav', data: a }, { name: 'b.wav', data: b }]);
  const dv = new DataView(zip.buffer);
  assert.equal(dv.getUint32(0, true), 0x04034b50); // local header signature
  assert.equal(dv.getUint16(8, true), 0); // stored, no compression
  assert.equal(dv.getUint32(14, true), crc32(a));
  assert.equal(dv.getUint32(18, true), a.length);
  const eocd = zip.length - 22;
  assert.equal(dv.getUint32(eocd, true), 0x06054b50); // EOCD signature
  assert.equal(dv.getUint16(eocd + 10, true), 2); // total entries
  const cdStart = dv.getUint32(eocd + 16, true);
  assert.equal(dv.getUint32(cdStart, true), 0x02014b50); // central dir signature
});

test('mono corpus covers chromatic C3-C6 with runbook filenames', () => {
  const tasks = monoCorpusTasks({ instrument: 'acoustic', distance: 'stand' });
  assert.equal(tasks.length, 37);
  assert.equal(tasks[0].expect.midi, 48);
  assert.equal(tasks.at(-1).expect.midi, 84);
  assert.equal(tasks[0].filename, 'acoustic-C3-stand-1.wav');
  assert.ok(tasks.some(t => t.filename === 'acoustic-Cs4-stand-1.wav'));
  for (const t of tasks) {
    assert.equal(t.mode, 'mono');
    assert.ok(t.prompt && t.recordSec > 0 && t.id, t.filename);
  }
});

test('poly corpus stays in range with distinct pitch classes per chord', () => {
  const tasks = polyCorpusTasks({ piano: 'acoustic', distance: 'near' });
  const labels = tasks.map(t => t.id);
  for (const chord of ['C3maj', 'F3maj', 'G3maj', 'C4maj', 'F4maj']) assert.ok(labels.includes(chord), chord);
  assert.ok(!labels.includes('G4maj'), 'G4maj is out of detector range by design');
  for (const t of tasks) {
    for (const m of t.expect?.midis ?? []) assert.ok(m >= 48 && m <= 72, t.id);
    if (t.expect?.midis) {
      assert.equal(new Set(t.expect.midis.map(m => m % 12)).size, t.expect.midis.length, t.id);
    }
    for (const set of t.expectSeq ?? []) for (const m of set) assert.ok(m >= 48 && m <= 72, t.id);
    assert.ok(t.filename.startsWith('poly-acoustic-') && t.filename.endsWith('-near-1.wav'), t.filename);
    assert.equal(t.mode, 'poly');
  }
  assert.ok(tasks.some(t => t.expectSeq && t.recordSec >= 8));
  assert.ok(SOAK.minutes === 10 && SOAK.passMax === 1);
});

test('noise takes follow the runbook clip list and filenames', () => {
  const tasks = noiseTasks();
  assert.deepEqual(tasks.map(t => t.id), ['noise-speech', 'noise-tv', 'noise-household', 'noise-singing']);
  for (const t of tasks) {
    assert.equal(t.mode, 'noise');
    assert.ok(t.recordSec >= 60, t.id);
    assert.ok(/^noise-[a-z]+-1\.wav$/.test(t.filename), t.filename);
  }
});

test('analyzeTake: noise clips match when quiet, report events when not', () => {
  const noise = { mode: 'noise' };
  const quiet = analyzeTake(new Float32Array(48000), 48000, noise);
  assert.equal(quiet.match, true);
  const loud = analyzeTake(take([{ midi: 60, atMs: 300, durMs: 900 }]), 48000, noise);
  assert.equal(loud.match, false);
  assert.ok(loud.heard.includes('C4'));
});

test('analyzeTake: mono right, mono wrong, silence', () => {
  const mono = { mode: 'mono', expect: { midi: 60 } };
  const right = analyzeTake(take([{ midi: 60, atMs: 300, durMs: 900 }]), 48000, mono);
  assert.equal(right.match, true);
  assert.equal(right.heard, 'C4');
  const wrong = analyzeTake(take([{ midi: 62, atMs: 300, durMs: 900 }]), 48000, mono);
  assert.equal(wrong.match, false);
  assert.ok(wrong.heard.includes('D4'));
  const quiet = analyzeTake(new Float32Array(48000), 48000, mono);
  assert.equal(quiet.match, false);
  assert.ok(quiet.heard.length > 0, 'silence still gets a human-readable heard text');
});

test('analyzeTake: chord set and onset sequence', () => {
  const chord = { mode: 'poly', expect: { midis: [60, 64, 67] } };
  const cv = analyzeTake(take([{ midis: [60, 64, 67], atMs: 300, durMs: 1200 }]), 48000, chord);
  assert.equal(cv.match, true);
  assert.ok(cv.heard.includes('C4') && cv.heard.includes('G4'));
  const missing = analyzeTake(take([{ midis: [60, 64], atMs: 300, durMs: 1200 }]), 48000, chord);
  assert.equal(missing.match, false);

  const seq = { mode: 'poly', expectSeq: [[48], [60], [62]] };
  const sv = analyzeTake(take([
    { midis: [48], atMs: 200, durMs: 3200 },
    { midis: [60], atMs: 1100, durMs: 600 },
    { midis: [62], atMs: 2000, durMs: 600 }
  ]), 48000, seq);
  assert.equal(sv.match, true, sv.heard);
  assert.ok(sv.heard.includes('|'));
});
