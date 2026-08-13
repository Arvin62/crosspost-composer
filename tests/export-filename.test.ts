import assert from 'node:assert/strict';
import test from 'node:test';

import { articleExportFilename, safeFilenameTitle } from '../src/core/export-filename.ts';

test('article export filename puts the unpadded local date before the document title', () => {
  const date = new Date(2026, 7, 12, 9, 30);

  assert.equal(articleExportFilename('文档标题', date), '2026-8-12-文档标题.html');
});

test('article export filename replaces filesystem-reserved title characters', () => {
  const date = new Date(2026, 0, 3);

  assert.equal(
    articleExportFilename('新能源/电机：测试? <终稿>', date),
    '2026-1-3-新能源-电机：测试- -终稿-.html',
  );
});

test('article export filename falls back when the sanitized title is empty', () => {
  const date = new Date(2026, 10, 9);

  assert.equal(articleExportFilename('  ...  ', date), '2026-11-9-文章.html');
});

test('safe filename title keeps the existing 60-character limit', () => {
  assert.equal(safeFilenameTitle('标题'.repeat(40)).length, 60);
});
