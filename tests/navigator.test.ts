import assert from 'node:assert/strict';
import test from 'node:test';

import { findTextOccurrences } from '../src/ui/navigator.ts';

test('findTextOccurrences is case-insensitive and returns stable offsets', () => {
  assert.deepEqual(findTextOccurrences('Alpha beta ALPHA', 'alpha'), [
    { start: 0, end: 5 },
    { start: 11, end: 16 },
  ]);
});

test('findTextOccurrences returns non-overlapping matches', () => {
  assert.deepEqual(findTextOccurrences('aaaa', 'aa'), [
    { start: 0, end: 2 },
    { start: 2, end: 4 },
  ]);
});

test('findTextOccurrences treats blank queries as no-op', () => {
  assert.deepEqual(findTextOccurrences('正文内容', '  '), []);
});
