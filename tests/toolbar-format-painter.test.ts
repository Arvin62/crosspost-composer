import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

import { initFormatPainter } from '../src/editor/format-painter.ts';

function createFixture(): {
  dom: JSDOM;
  document: Document;
  editor: HTMLElement;
  painter: HTMLButtonElement;
  source: HTMLElement;
  target: HTMLElement;
} {
  const dom = new JSDOM(
    '<button class="tb-format-painter" aria-pressed="false">格式刷</button>' +
      '<div id="editor" contenteditable="true">' +
      '<h2 style="text-align:center"><strong>来源</strong></h2>' +
      '<p>目标文字</p></div>',
  );
  const document = dom.window.document;
  return {
    dom,
    document,
    editor: document.querySelector<HTMLElement>('#editor')!,
    painter: document.querySelector<HTMLButtonElement>('.tb-format-painter')!,
    source: document.querySelector<HTMLElement>('h2')!,
    target: document.querySelector<HTMLElement>('p')!,
  };
}

function selectText(document: Document, element: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(true);
  const selection = document.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

test('toolbar format painter activates and applies once to the clicked paragraph', () => {
  const { dom, document, editor, painter, source, target } = createFixture();
  let changes = 0;
  const notifications: string[] = [];

  selectText(document, source.querySelector('strong')!);
  initFormatPainter(editor, painter, () => changes++, (message) => notifications.push(message));

  painter.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(painter.getAttribute('aria-pressed'), 'true');
  assert.equal(editor.classList.contains('format-painter-active'), true);

  target.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const applied = editor.querySelector('h2:nth-of-type(2)');
  assert.ok(applied);
  assert.equal(applied.getAttribute('style'), 'text-align:center');
  assert.equal(applied.innerHTML, '<strong>目标文字</strong>');
  assert.equal(changes, 1);
  assert.equal(painter.getAttribute('aria-pressed'), 'false');
  assert.equal(editor.classList.contains('format-painter-active'), false);
  assert.deepEqual(notifications, [
    '已吸取段落格式，请点击要应用格式的段落',
    '段落格式已应用',
  ]);
});

test('Escape cancels an active toolbar format painter without changing the article', () => {
  const { dom, document, editor, painter, source, target } = createFixture();
  let changes = 0;

  selectText(document, source);
  initFormatPainter(editor, painter, () => changes++);
  painter.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

  document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
  target.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

  assert.equal(painter.getAttribute('aria-pressed'), 'false');
  assert.equal(editor.classList.contains('format-painter-active'), false);
  assert.equal(target.tagName, 'P');
  assert.equal(target.textContent, '目标文字');
  assert.equal(changes, 0);
});
