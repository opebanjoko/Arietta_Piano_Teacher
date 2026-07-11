import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeWav } from '../gate/wav.js';
import { encodeZip, crc32 } from '../gate/zip.js';

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
