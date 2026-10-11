import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), { url: 'https://app.example/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, location: dom.window.location,
  HTMLImageElement: dom.window.HTMLImageElement, requestAnimationFrame: (callback: () => void) => callback() });
const { initRemoteImages } = await import('../src/ui/remote-images.ts');
const { REMOTE_SOURCE, REMOTE_ERROR } = await import('../src/core/remote-image-state.ts');
const editor = document.querySelector<HTMLElement>('#editor')!;
const dialog = document.querySelector<HTMLDialogElement>('#remoteImageDlg')!;
dialog.showModal = () => dialog.setAttribute('open', '');
dialog.close = () => dialog.removeAttribute('open');
const ui = initRemoteImages(editor, () => {}, () => ({ maxWidth: 3840, quality: 0.95 }), () => '');
function image(width: number, height: number, alt = '测试图片'): HTMLImageElement {
  const img = document.createElement('img');
  img.src = 'data:image/png;base64,aGVsbG8=';
  img.alt = alt;
  Object.defineProperties(img, { naturalWidth: { value: width }, naturalHeight: { value: height } });
  editor.append(img);
  return img;
}
function reset(): void { dialog.close(); editor.replaceChildren(); ui.refresh(); }
function review(): void { document.querySelector<HTMLButtonElement>('#remoteImageReview')!.click(); }

test('image status sits outside the article and stays hidden for empty documents', () => {
  reset();
  const bar = document.querySelector<HTMLElement>('#remoteImageBanner')!;
  assert.equal(bar.closest('main'), null);
  assert.equal(bar.hidden, true);
  image(3840, 2160);
  ui.refresh();
  assert.equal(bar.hidden, false);
  assert.equal(bar.dataset.state, 'ready');
  assert.equal(document.querySelector<HTMLElement>('#remoteImageBadge')!.hidden, true);
  assert.equal(document.querySelector('#remoteImageSummary')!.textContent, '1 张已保存');
  assert.equal(document.querySelector<HTMLButtonElement>('#remoteImageSave')!.hidden, true);
  review();
  assert.match(document.querySelector('#remoteImageList')!.textContent!, /没有待处理/);
  assert.equal(document.querySelector<HTMLElement>('#remoteImagePrivacy')!.hidden, true);
});

test('saved low-resolution images remain actionable through details, without a top banner', () => {
  reset();
  const img = image(1280, 720, '低清配图');
  image(2160, 3840, '高清竖图');
  let positioned = false;
  let selected = false;
  img.scrollIntoView = () => { positioned = true; };
  img.addEventListener('click', () => { selected = true; });
  ui.refresh();
  assert.equal(document.querySelector('#remoteImageBadge')!.textContent, '1 张需检查');
  assert.equal(document.querySelector<HTMLElement>('#remoteImageBanner')!.dataset.state, 'attention');
  review();
  assert.equal(dialog.open, true);
  const row = document.querySelector('.remote-image-row')!;
  assert.match(row.textContent!, /1280 × 720 px/);
  assert.match(row.textContent!, /原位换图/);
  assert.equal(document.querySelector<HTMLElement>('#remoteImagePrivacy')!.hidden, true);
  assert.equal(document.querySelectorAll('#remoteImageList img, #remoteImageList a').length, 0);
  [...row.querySelectorAll('button')].find(button => button.textContent === '定位')!.click();
  assert.equal(dialog.open, false);
  assert.equal(positioned, true);
  assert.equal(selected, true);
  // Details never modify the original article or its image dimensions.
  assert.equal(img.getAttribute('src'), 'data:image/png;base64,aGVsbG8=');
});

test('failed images retain safe original links and are grouped separately from resolution advice', () => {
  reset();
  image(1000, 600, '已保存');
  const failed = image(0, 0, '待保存');
  failed.setAttribute(REMOTE_SOURCE, 'https://source.example/original.jpg?a=1');
  failed.setAttribute(REMOTE_ERROR, '图源需要验证');
  ui.refresh();
  assert.equal(document.querySelector('#remoteImageBadge')!.textContent, '2 张需检查');
  assert.equal(document.querySelector<HTMLElement>('#remoteImageBanner')!.dataset.state, 'failed');
  review();
  const list = document.querySelector('#remoteImageList')!;
  const rows = [...list.querySelectorAll('.remote-image-row')];
  assert.equal(rows.length, 2);
  assert.match(rows[0].textContent!, /2. 待保存/);
  assert.match(rows[0].textContent!, /图源需要验证/);
  assert.match(rows[0].textContent!, /重试/);
  const link = rows[0].querySelector('a')!;
  assert.equal(link.href, 'https://source.example/original.jpg?a=1');
  assert.equal(link.target, '_blank');
  assert.equal(link.rel, 'noopener noreferrer');
  assert.equal(document.querySelector<HTMLElement>('#remoteImagePrivacy')!.hidden, false);
  failed.setAttribute(REMOTE_SOURCE, 'javascript:alert(1)');
  ui.refresh();
  assert.equal(list.querySelectorAll('a').length, 0);
  editor.replaceChildren();
  ui.refresh();
  assert.equal(document.querySelector<HTMLElement>('#remoteImageBanner')!.hidden, true);
  assert.equal(document.querySelector<HTMLElement>('#remoteImagePrivacy')!.hidden, true);
});
