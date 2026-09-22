import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

// 使用应用自身的模块解析加载工具栏，不为测试改变浏览器端的导入方式。
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: 'custom',
});
after(() => server.close());
const { initToolbar } = await server.ssrLoadModule('/src/ui/toolbar.ts');

function setup() {
  const dom = new JSDOM('<header></header><div id="editor" contenteditable="true">' +
    '<p style="background-color:#eef5fd"><strong>来源</strong></p>' +
    '<p>目标一</p><p>目标二</p><p>目标三</p><p>不选中</p></div><input>');
  const document = dom.window.document;
  Object.assign(globalThis, { document });
  const editor = document.querySelector<HTMLElement>('#editor')!;
  const paragraphs = [...editor.querySelectorAll('p')];
  let changes = 0;
  const notices: string[] = [];
  initToolbar(editor, () => changes++, undefined, (message: string) => notices.push(message));
  const button = document.querySelector<HTMLButtonElement>('.tb-format-painter')!;
  const select = (first: Node, firstOffset: number, last = first, lastOffset = firstOffset) => {
    const range = document.createRange();
    range.setStart(first, firstOffset);
    range.setEnd(last, lastOffset);
    const selection = document.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  };
  select(paragraphs[0], 0);
  button.click();
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  return { dom, document, editor, paragraphs, button, select, notices, changes: () => changes };
}

test('drag completion formats all three selected paragraphs and saves only once', () => {
  const context = setup();
  const { dom, editor, paragraphs, select, button } = context;
  select(paragraphs[1].firstChild!, 1, paragraphs[3].firstChild!, 2);
  // 跨段拖选的事件目标是公共容器，不能依赖 event.target 定位段落。
  editor.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true, button: 0 }));
  assert.equal(context.changes(), 1);
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  assert.equal(context.notices.at(-1), '已应用格式到 3 个段落');
  for (const paragraph of paragraphs.slice(1, 4)) {
    assert.equal(paragraph.style.backgroundColor, 'rgb(238, 245, 253)');
    assert.ok(paragraph.querySelector('strong'));
  }
  assert.equal(paragraphs[4].outerHTML, '<p>不选中</p>');
});

for (const modifier of ['metaKey', 'ctrlKey']) {
  test(`${modifier} select-all applies all paragraphs once, including a root-boundary selection`, () => {
    const context = setup();
    const { editor, dom, select, paragraphs } = context;
    select(editor, 0, editor, editor.childNodes.length);
    editor.dispatchEvent(new dom.window.KeyboardEvent('keyup', { key: 'a', [modifier]: true, bubbles: true }));
    assert.equal(context.changes(), 1);
    assert.equal(context.notices.at(-1), '已应用格式到 5 个段落');
    for (const paragraph of paragraphs) assert.ok(paragraph.querySelector('strong'));
  });
}

test('reverse keyboard selection is applied with Enter without inserting a line break', () => {
  const context = setup();
  const { editor, dom, paragraphs, document } = context;
  document.getSelection()!.setBaseAndExtent(paragraphs[3].firstChild!, 2, paragraphs[1].firstChild!, 0);
  const event = new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  editor.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(context.notices.at(-1), '已应用格式到 3 个段落');
  assert.equal(editor.querySelector('br'), null);
});

test('button applies a keyboard selection; Escape cancels without a content change', () => {
  const context = setup();
  context.select(context.paragraphs[1], 0, context.paragraphs[3], 1);
  context.button.click();
  assert.equal(context.changes(), 1);
  assert.equal(context.notices.at(-1), '已应用格式到 3 个段落');
  context.select(context.paragraphs[0], 0);
  context.button.click();
  context.document.dispatchEvent(new context.dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.equal(context.button.getAttribute('aria-pressed'), 'false');
  assert.equal(context.changes(), 1);
});

test('single click remains supported and selections extending outside the editor are ignored', () => {
  const context = setup();
  const { editor, dom, paragraphs, select, document } = context;
  select(document.body, 0, editor, editor.childNodes.length);
  editor.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true, button: 0 }));
  assert.equal(context.changes(), 0);
  select(paragraphs[2].firstChild!, 1);
  paragraphs[2].dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true, button: 0 }));
  assert.equal(context.changes(), 1);
  assert.equal(context.notices.at(-1), '已应用格式到 1 个段落');
});
