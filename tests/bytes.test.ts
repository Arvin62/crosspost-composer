import assert from 'node:assert/strict';
import test from 'node:test';

import { dataUrlByteSize, formatBytes } from '../src/core/bytes.ts';

test('dataUrlByteSize counts padded base64 payloads', () => {
  assert.equal(dataUrlByteSize('data:text/plain;base64,SGVsbG8='), 5);
  assert.equal(dataUrlByteSize('data:text/plain;base64,TQ=='), 1);
});

test('dataUrlByteSize handles encoded text and ignores URLs', () => {
  assert.equal(dataUrlByteSize('data:text/plain,%E4%BD%A0%E5%A5%BD'), 6);
  assert.equal(dataUrlByteSize('https://example.com/image.jpg'), 0);
});

test('formatBytes produces compact human-readable values', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(2 * 1024 * 1024), '2.0 MB');
});
