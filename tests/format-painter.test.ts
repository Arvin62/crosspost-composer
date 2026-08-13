import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

import {
  applyParagraphFormat,
  captureParagraphFormat,
  findFormatBlock,
} from '../src/editor/format-painter.ts';

function editorWith(html: string): { editor: HTMLElement; document: Document } {
  const dom = new JSDOM(`<div id="editor">${html}</div>`);
  const document = dom.window.document;
  return { editor: document.querySelector<HTMLElement>('#editor')!, document };
}

test('format painter copies paragraph and caret-level inline formatting without copying text', () => {
  const { editor, document } = editorWith(
    '<h2 style="color:#2457a6;text-align:center" align="center"><strong><span style="font-size:22px">来源</span></strong></h2>' +
      '<p style="color:red"><em>保留这段目标文字</em></p>',
  );
  const sourceText = document.querySelector('span')!.firstChild!;
  const targetText = document.querySelector('em')!.firstChild!;

  const format = captureParagraphFormat(editor, sourceText);
  assert.ok(format);
  const applied = applyParagraphFormat(editor, targetText, format);

  assert.ok(applied);
  assert.equal(applied.tagName, 'H2');
  assert.equal(applied.getAttribute('style'), 'color:#2457a6;text-align:center');
  assert.equal(applied.getAttribute('align'), 'center');
  assert.equal(applied.textContent, '保留这段目标文字');
  assert.equal(
    applied.innerHTML,
    '<strong><span style="font-size:22px">保留这段目标文字</span></strong>',
  );
});

test('format painter preserves target links but replaces their old inline presentation', () => {
  const { editor } = editorWith(
    '<p>普通来源</p><p style="text-align:right"><a href="https://example.com" style="color:red"><b>目标链接</b></a></p>',
  );
  const paragraphs = editor.querySelectorAll('p');
  const format = captureParagraphFormat(editor, paragraphs[0].firstChild);
  assert.ok(format);

  const applied = applyParagraphFormat(editor, paragraphs[1].querySelector('b')!.firstChild, format);
  const link = applied?.querySelector('a');

  assert.ok(link);
  assert.equal(link.getAttribute('href'), 'https://example.com');
  assert.equal(link.hasAttribute('style'), false);
  assert.equal(link.innerHTML, '目标链接');
  assert.equal(applied?.hasAttribute('style'), false);
});

test('format painter does not copy source content attributes or event handlers', () => {
  const { editor } = editorWith(
    '<h2 id="source" data-secret="hidden" onclick="alert(1)" style="text-align:center">' +
      '<strong data-secret="inline" onclick="alert(2)">来源</strong></h2>' +
      '<p id="target" data-owner="kept"><a href="https://example.com">目标链接</a></p>',
  );
  const source = editor.querySelector('strong')!;
  const target = editor.querySelector('a')!;
  const format = captureParagraphFormat(editor, source.firstChild);
  assert.ok(format);

  const applied = applyParagraphFormat(editor, target.firstChild, format);

  assert.ok(applied);
  assert.equal(applied.id, 'target');
  assert.equal(applied.getAttribute('data-owner'), 'kept');
  assert.equal(applied.hasAttribute('data-secret'), false);
  assert.equal(applied.hasAttribute('onclick'), false);
  assert.equal(applied.querySelector('strong')?.hasAttribute('data-secret'), false);
  assert.equal(applied.querySelector('strong')?.hasAttribute('onclick'), false);
  assert.equal(applied.querySelector('a')?.getAttribute('href'), 'https://example.com');
});

test('format painter does not turn a list item into a heading', () => {
  const { editor } = editorWith(
    '<h3 style="color:blue">来源标题</h3><ul><li style="color:red">目标项目</li></ul>',
  );
  const source = editor.querySelector('h3')!;
  const target = editor.querySelector('li')!;
  const format = captureParagraphFormat(editor, source.firstChild);
  assert.ok(format);

  const applied = applyParagraphFormat(editor, target.firstChild, format);

  assert.equal(applied?.tagName, 'LI');
  assert.equal(applied?.getAttribute('style'), 'color:blue');
  assert.equal(editor.querySelector('ul')?.textContent, '目标项目');
});

test('format painter ignores article wrappers that are not text paragraphs', () => {
  const { editor } = editorWith('<section><div>没有段落标签</div></section>');
  const text = editor.querySelector('div')!.firstChild;

  assert.equal(findFormatBlock(editor, text), null);
  assert.equal(captureParagraphFormat(editor, text), null);
});
