import assert from 'node:assert/strict';
import test from 'node:test';

import { countMarkupTextCharacters } from '../src/core/text-metrics.ts';

test('counts rendered text without treating tags as content', () => {
  assert.equal(countMarkupTextCharacters('<p>你好<strong>!</strong>&amp;</p>'), 4);
});

test('ignores angle brackets inside quoted tag attributes', () => {
  assert.equal(
    countMarkupTextCharacters('<p title="1 > 0">正文</p><img alt="<hidden>">'),
    2,
  );
});

test('counts an incomplete entity as literal text', () => {
  assert.equal(countMarkupTextCharacters('<p>A & B</p>'), 5);
});
