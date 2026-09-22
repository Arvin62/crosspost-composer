import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

import {
  applyParagraphFormat,
  applyParagraphFormatToRange,
  captureParagraphFormat,
  findFormatBlock,
  findFormatBlocksInRange,
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
  assert.equal(applied.style.color, 'rgb(36, 87, 166)');
  assert.equal(applied.style.textAlign, 'center');
  assert.equal(applied.getAttribute('align'), 'center');
  assert.equal(applied.textContent, '保留这段目标文字');
  assert.equal(applied.querySelector('strong span')?.textContent, '保留这段目标文字');
  assert.equal(applied.querySelector<HTMLElement>('strong span')?.style.fontSize, '22px');
});

test('format painter preserves target links but replaces their old inline presentation', () => {
  const { editor, document } = editorWith(
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
  assert.equal(applied?.style.textAlign, '');
});

test('format painter does not turn a list item into a heading', () => {
  const { editor, document } = editorWith(
    '<h3 style="color:blue">来源标题</h3><ul><li style="color:red">目标项目</li></ul>',
  );
  const source = editor.querySelector('h3')!;
  const target = editor.querySelector('li')!;
  const format = captureParagraphFormat(editor, source.firstChild);
  assert.ok(format);

  const applied = applyParagraphFormat(editor, target.firstChild, format);

  assert.equal(applied?.tagName, 'LI');
  assert.equal(applied?.style.color, 'rgb(0, 0, 255)');
  assert.equal(editor.querySelector('ul')?.textContent, '目标项目');
});

test('format painter recognizes leaf div paragraphs without selecting the article wrapper', () => {
  const { editor } = editorWith('<section><div>没有段落标签</div></section>');
  const text = editor.querySelector('div')!.firstChild;

  assert.equal(findFormatBlock(editor, text), editor.querySelector('div'));
  assert.equal(findFormatBlock(editor, editor.querySelector('section')), null);
  assert.equal(captureParagraphFormat(editor, text)?.tagName, 'div');
});

test('a partial selection across three paragraphs formats each whole paragraph exactly once', () => {
  const { editor, document } = editorWith(
    '<h2 style="color:blue"><strong>来源</strong></h2><section>' +
    '<p>第一段</p><p><em>第二段</em></p><p>第三段</p><p>不应改变</p></section>',
  );
  const paragraphs = editor.querySelectorAll('p');
  const format = captureParagraphFormat(editor, editor.querySelector('strong')!.firstChild)!;
  const range = document.createRange();
  range.setStart(paragraphs[0].firstChild!, 1);
  range.setEnd(paragraphs[2].firstChild!, 2);
  const applied = applyParagraphFormatToRange(editor, range, format);
  assert.deepEqual(applied.map((block) => block.textContent), ['第一段', '第二段', '第三段']);
  for (const block of applied) {
    assert.equal(block.tagName, 'H2');
    assert.equal(block.style.color, 'rgb(0, 0, 255)');
    assert.equal(block.querySelectorAll('strong').length, 1);
    assert.equal(block.querySelector('em'), null);
  }
  assert.equal(paragraphs[3].outerHTML, '<p>不应改变</p>');
});

test('select all from the editor root preserves wrappers, list structure, links and images', () => {
  const { editor, document } = editorWith(
    '<p style="text-align:center"><b>来源</b></p><section style="padding:12px">' +
    '<blockquote style="border-left:2px solid blue">\n<p>引用一</p>\n<p>引用二</p>\n</blockquote>' +
    '<ul><li>列表一<ul><li><i>嵌套项目</i></li></ul></li><li><p>列表二</p></li></ul>' +
    '<p><a href="https://example.com">链接</a><img src="data:image/png;base64,AA==" style="width:30px" alt="图片"></p>' +
    '<p><br></p><p></p></section>',
  );
  const textBefore = editor.textContent;
  const imageBefore = editor.querySelector('img')!.outerHTML;
  const format = captureParagraphFormat(editor, editor.querySelector('b')!.firstChild)!;
  const range = document.createRange();
  range.selectNodeContents(editor);
  const applied = applyParagraphFormatToRange(editor, range, format);
  assert.equal(applied.length, 9);
  assert.equal(editor.textContent, textBefore);
  assert.equal(editor.querySelector('img')!.outerHTML, imageBefore);
  assert.equal(editor.querySelector('a')!.getAttribute('href'), 'https://example.com');
  assert.equal(editor.querySelector('section')!.getAttribute('style'), 'padding:12px');
  assert.equal(editor.querySelector('blockquote')!.getAttribute('style'), 'border-left:2px solid blue');
  assert.equal(editor.querySelectorAll('ul').length, 2);
  assert.equal(editor.querySelectorAll('li').length, 3);
  assert.equal(editor.querySelector('b ul, b p, b li'), null);
  for (const block of applied) assert.equal(block.style.textAlign, 'center');
});

test('selection boundaries do not include adjacent unselected paragraphs', () => {
  const { editor, document } = editorWith('<p>之前</p><p>选中</p><p><b>之后</b></p>');
  const paragraphs = editor.querySelectorAll('p');
  const range = document.createRange();
  range.setStart(paragraphs[0].firstChild!, 2);
  range.setEnd(paragraphs[2].querySelector('b')!.firstChild!, 0);
  assert.deepEqual(findFormatBlocksInRange(editor, range), [paragraphs[1]]);
  range.setStart(editor, 1);
  range.setEnd(editor, 2);
  assert.deepEqual(findFormatBlocksInRange(editor, range), [paragraphs[1]]);
});

test('collapsed selection still formats a single paragraph and ranges outside the editor are ignored', () => {
  const { editor, document } = editorWith('<p>来源</p><p>目标</p>');
  const target = editor.querySelectorAll('p')[1];
  const range = document.createRange();
  range.setStart(target.firstChild!, 1);
  range.collapse(true);
  assert.deepEqual(findFormatBlocksInRange(editor, range), [target]);
  range.selectNodeContents(document.body);
  const before = editor.innerHTML;
  const format = captureParagraphFormat(editor, editor.querySelector('p')!.firstChild)!;
  assert.deepEqual(applyParagraphFormatToRange(editor, range, format), []);
  assert.equal(editor.innerHTML, before);
});

test('formatting an outer list item leaves unselected nested paragraph styles intact', () => {
  const { editor, document } = editorWith(
    '<h2><b>来源</b></h2><ul><li><em>目标</em><ul><li><p style="color:red"><i>保留</i></p></li></ul></li></ul>',
  );
  const format = captureParagraphFormat(editor, editor.querySelector('b')!.firstChild)!;
  const nested = editor.querySelector('p')!;
  const before = nested.outerHTML;
  const range = document.createRange();
  range.selectNodeContents(editor.querySelector('em')!);
  const applied = applyParagraphFormatToRange(editor, range, format);
  assert.equal(applied.length, 1);
  assert.equal(nested.outerHTML, before);
  assert.equal(applied[0].firstElementChild!.tagName, 'B');
  assert.equal(applied[0].firstElementChild!.textContent, '目标');
});

test('copies a pale WeChat section box onto all selected paragraphs without copying its layout or content', () => {
  const { editor, document } = editorWith(
    '<section id="source-card" style="background-color:#f4f7fa;padding:16px;border:1px solid #ddd;border-radius:8px;width:400px">' +
    '<p><strong>加粗卡片</strong></p></section><p>目标一</p><p>目标二</p><p>目标三</p>',
  );
  const source = editor.querySelector('p')!;
  const format = captureParagraphFormat(editor, source, 0)!;
  const range = document.createRange();
  range.setStart(editor, 1);
  range.setEnd(editor, 4);
  const applied = applyParagraphFormatToRange(editor, range, format);
  assert.equal(applied.length, 3);
  for (const block of applied) {
    assert.equal(block.style.backgroundColor, 'rgb(244, 247, 250)');
    assert.equal(block.style.paddingTop, '16px');
    assert.equal(block.style.borderLeftStyle, 'solid');
    assert.equal(block.style.borderLeftWidth, '1px');
    assert.equal(block.style.borderRadius, '8px');
    assert.equal(block.style.width, '');
    assert.equal(block.id, '');
    assert.ok(block.querySelector('strong'));
  }
  assert.equal(editor.querySelector('#source-card')?.textContent, '加粗卡片');
});

test('snapshots class-based background and font weight, including an element-boundary caret', () => {
  const { editor, document } = editorWith(
    '<p class="source"><span class="heavy">样式来源</span></p><div>目标</div>',
  );
  const stylesheet = document.createElement('style');
  stylesheet.textContent = '.source{background-color:#eef5fd;padding:12px;border-radius:6px}.heavy{font-weight:700;font-size:19px;color:#123456}';
  document.head.appendChild(stylesheet);
  const format = captureParagraphFormat(editor, editor.querySelector('p'), 0)!;
  const applied = applyParagraphFormat(editor, editor.querySelector('div')!.firstChild, format)!;
  assert.equal(applied.style.backgroundColor, 'rgb(238, 245, 253)');
  assert.equal(applied.style.paddingTop, '12px');
  const span = applied.querySelector('span')!;
  assert.equal(span.style.fontWeight, '700');
  assert.equal(span.style.fontSize, '19px');
  assert.equal(span.style.color, 'rgb(18, 52, 86)');
  assert.equal(span.className, '');
});

test('copies the supplied article gradient section title and its bold font onto three paragraphs', () => {
  // jsdom 对 background 简写与 border-radius 的组合解析有缺陷，单测使用等价展开属性；
  // 浏览器样例 fixtures/format-painter-review.html 保留文章里的原始简写。
  const { editor, document } = editorWith(
    '<section style="background-image:linear-gradient(to right,#dfe3ff,#eef0ff,#ffffff);border-radius:6px;padding:3px 18px;margin:40px 0 20px 0;font-size:19px;font-weight:700;color:#0a0cb9">01 来源标题</section>' +
    '<p>目标一</p><p>目标二</p><p>目标三</p>',
  );
  const format = captureParagraphFormat(editor, editor.querySelector('section')!.firstChild)!;
  assert.ok(format);
  const range = document.createRange();
  range.setStart(editor, 1);
  range.setEnd(editor, 4);
  const applied = applyParagraphFormatToRange(editor, range, format);
  assert.equal(applied.length, 3);
  for (const block of applied) {
    assert.equal(block.tagName, 'SECTION');
    assert.match(block.style.backgroundImage, /linear-gradient/);
    assert.equal(block.style.borderRadius, '6px');
    assert.equal(block.style.paddingLeft, '18px');
    assert.equal(block.style.fontSize, '19px');
    assert.equal(block.style.fontWeight, '700');
  }
});

test('select all does not duplicate a source card background and padding inside itself', () => {
  const { editor, document } = editorWith(
    '<section style="background-color:#f6f7fb;border-radius:6px;padding:14px 16px">\n' +
    '<p>\n<strong style="font-weight:700">来源标题</strong></p>\n<p>卡片第二段</p>\n</section><p>外部目标</p>',
  );
  const card = editor.querySelector('section')!;
  const source = card.querySelector('p')!;
  const format = captureParagraphFormat(editor, source, 0)!;
  const range = document.createRange();
  range.selectNodeContents(editor);
  const applied = applyParagraphFormatToRange(editor, range, format);
  assert.equal(applied.length, 3);
  assert.equal(source.style.paddingTop, '');
  assert.equal(source.style.backgroundColor, 'rgba(0, 0, 0, 0)');
  assert.equal(applied[2].style.backgroundColor, 'rgb(246, 247, 251)');
  assert.equal(applied[2].style.paddingTop, '14px');
  assert.ok(applied[2].querySelector('strong'));
});

test('select all skips empty decorative section dividers from WeChat articles', () => {
  const { editor, document } = editorWith('<p>正文</p><section style="border-top:1px dashed #c9c9c9;margin:32px 0"></section>');
  const range = document.createRange();
  range.selectNodeContents(editor);
  assert.deepEqual(findFormatBlocksInRange(editor, range), [editor.querySelector('p')]);
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
