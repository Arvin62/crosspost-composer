import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><body><div id="editor"></div></body>', { url: 'https://app.example/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, Node: dom.window.Node,
  Element: dom.window.Element, HTMLTemplateElement: dom.window.HTMLTemplateElement,
  getSelection: () => dom.window.getSelection() });
const { sanitizeImportedHtml, htmlToBody } = await import('../src/core/sanitize.ts');
const { pendingImages, REMOTE_SOURCE, REMOTE_ERROR, clearRemoteState } = await import('../src/core/remote-image-state.ts');
const { saveRemoteImages, downloadRemoteImage, validateImageService, MAX_REMOTE_BYTES } = await import('../src/core/remote-images.ts');
const { clipboardArticle, insertPastedHTML, isWholeEditorSelection } = await import('../src/core/paste.ts');
const { preparePlatformContent } = await import('../src/core/platform.ts');
const { getTheme } = await import('../src/themes/presets.ts');
const { DEFAULT_IMAGE_OPTIONS, fileToDataURL, recompressDataURL } = await import('../src/core/image.ts');
const imageOptions = { maxWidth: 1280, quality: 0.85 };
const data = 'data:image/png;base64,aGVsbG8=';
const sample = '<section><p>Before</p><figure><img src="https://images.example/photo.png?a=1&amp;b=2" alt="Photo" style="width:70%"><figcaption>Caption</figcaption></figure><p>After</p></section>';
function editorWith(source = sample): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = sanitizeImportedHtml(source, { preserveExternalImages: true }).html;
  document.body.append(root);
  return root;
}

test('default quality is 4K and original mode never changes image bytes', async () => {
  assert.equal(DEFAULT_IMAGE_OPTIONS.maxWidth, 3840);
  assert.equal(DEFAULT_IMAGE_OPTIONS.quality, 0.95);
  Object.assign(globalThis, { FileReader: dom.window.FileReader });
  const file = new dom.window.File(['original image bytes'], 'photo.jpg', { type: 'image/jpeg' });
  const result = await fileToDataURL(file, { ...DEFAULT_IMAGE_OPTIONS, preserveOriginal: true });
  assert.equal(Buffer.from(result.split(',')[1], 'base64').toString(), 'original image bytes');
  assert.equal(await recompressDataURL(result, { ...DEFAULT_IMAGE_OPTIONS, preserveOriginal: true }), result);
});

test('imports preserve inert image positions, formatting, caption and URL without remote loading', () => {
  const root = editorWith();
  const image = pendingImages(root)[0];
  assert.ok(image.src.startsWith('data:image/'));
  assert.equal(image.getAttribute(REMOTE_SOURCE), 'https://images.example/photo.png?a=1&b=2');
  assert.equal(image.style.width, '70%');
  assert.equal(root.querySelector('figcaption')?.textContent, 'Caption');
  assert.deepEqual([...root.querySelector('section')!.children].map((el) => el.tagName), ['P', 'FIGURE', 'P']);
  assert.equal(pendingImages(editorWith(htmlToBody(root.innerHTML))).length, 0); // Untrusted reimport cannot spoof internal state.
  const restored = document.createElement('div'); restored.innerHTML = htmlToBody(root.innerHTML);
  assert.equal(pendingImages(restored).length, 1);
  assert.ok(restored.querySelector('img')!.src.startsWith('data:image/'));
});

test('foreign imports cannot forge pending attributes to replace an unrelated local image', () => {
  const root = editorWith(`<img src="${data}" ${REMOTE_SOURCE}="https://evil.example/pixel" ${REMOTE_ERROR}="fake">`);
  assert.equal(pendingImages(root).length, 0);
  assert.equal(root.querySelector('img')?.hasAttribute(REMOTE_ERROR), false);
});

test('legacy saved documents retain image positions and become inert pending images', () => {
  const root = document.createElement('div');
  root.innerHTML = htmlToBody(sample + `<img src="${data}" alt="Local">`);
  const pending = pendingImages(root);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].getAttribute(REMOTE_SOURCE), 'https://images.example/photo.png?a=1&b=2');
  assert.ok(pending[0].src.startsWith('data:image/'));
  assert.equal(pending[0].style.width, '70%');
  assert.equal(root.querySelector('figcaption')?.textContent, 'Caption');
  assert.equal(root.querySelectorAll('img').length, 2);
  assert.equal(root.querySelector('img[alt="Local"]')?.getAttribute('src'), data);
});

test('batch saves at original positions, deduplicates identical sources and preserves local images', async () => {
  const root = editorWith(sample + sample + `<img src="${data}" alt="Local">`);
  let calls = 0;
  const progress: number[] = [];
  const result = await saveRemoteImages(root, { imageOptions, service: '',
    download: async () => { calls++; return new Blob(['image'], { type: 'image/png' }); },
    convert: async () => data, onProgress: (done) => progress.push(done) });
  assert.deepEqual(result, { saved: 2, failed: 0, cancelled: false });
  assert.equal(calls, 1);
  assert.deepEqual(progress, [1, 2]);
  assert.equal(pendingImages(root).length, 0);
  assert.equal(root.querySelectorAll('figcaption').length, 2);
  assert.equal(root.querySelector('img')?.style.width, '70%');
  assert.equal(root.querySelectorAll('img').length, 3);
});

test('partial failure preserves source and position; retry processes only remaining images', async () => {
  const root = editorWith(sample + '<img src="https://images.example/missing" alt="Missing">');
  const result = await saveRemoteImages(root, { imageOptions, service: '', convert: async () => data,
    download: async (src) => { if (src.endsWith('missing')) throw new Error('404'); return new Blob(['image'], { type: 'image/png' }); } });
  assert.equal(result.saved, 1); assert.equal(result.failed, 1);
  assert.equal(pendingImages(root)[0].getAttribute(REMOTE_ERROR), '404');
  assert.equal(root.querySelectorAll('img').length, 2);
  const retry = await saveRemoteImages(root, { imageOptions, service: '', convert: async () => data,
    download: async () => new Blob(['image'], { type: 'image/png' }) });
  assert.equal(retry.saved, 1); assert.equal(pendingImages(root).length, 0);
});

test('replacement, deletion and cancellation during download never overwrite newer content', async () => {
  for (const operation of ['replace', 'delete', 'cancel']) {
    const root = editorWith();
    const image = pendingImages(root)[0];
    const controller = new AbortController();
    const result = await saveRemoteImages(root, { imageOptions, service: '', signal: controller.signal,
      download: async () => {
        if (operation === 'replace') { image.src = data; clearRemoteState(image); }
        if (operation === 'delete') image.remove();
        if (operation === 'cancel') controller.abort();
        return new Blob(['image'], { type: 'image/png' });
      }, convert: async () => 'data:image/png;base64,old' });
    assert.equal(result.saved, 0);
    if (operation === 'replace') assert.equal(image.src, data);
    if (operation === 'cancel') assert.equal(pendingImages(root).length, 1);
  }
});

test('clipboard supports rich HTML, raw source and fenced source; paste replaces the selection only', () => {
  assert.equal(clipboardArticle('<pre>highlighted</pre>', '```html\n<p>Article</p>\n```'), '<p>Article</p>');
  assert.equal(clipboardArticle('<p>Formatted</p>', 'Formatted'), '<p>Formatted</p>');
  assert.equal(clipboardArticle('', 'Plain words'), null);
  const root = document.querySelector<HTMLElement>('#editor')!;
  root.innerHTML = '<p>First</p><p>Second</p><p>Third</p>';
  const range = document.createRange(); range.selectNodeContents(root.children[1]);
  dom.window.getSelection()!.removeAllRanges(); dom.window.getSelection()!.addRange(range);
  insertPastedHTML(root, '<strong>Replacement</strong>');
  assert.equal(root.textContent, 'FirstReplacementThird');
  const whole = document.createRange(); whole.selectNodeContents(root);
  dom.window.getSelection()!.removeAllRanges(); dom.window.getSelection()!.addRange(whole);
  assert.equal(isWholeEditorSelection(root), true);
  insertPastedHTML(root, '<h2>Heading</h2><p>Paragraph</p>');
  assert.equal(root.innerHTML, '<h2>Heading</h2><p>Paragraph</p>');
});

test('preflight blocks pending placeholders and permits successfully embedded images', async () => {
  const root = editorWith();
  for (const platform of ['wechat', 'generic', 'content'] as const) {
    const prepared = preparePlatformContent(root.innerHTML, getTheme('minimal'), platform);
    assert.equal(prepared.canCopy, false);
    assert.ok(prepared.issues.some((issue) => issue.message.includes('尚未保存')));
  }
  await saveRemoteImages(root, { imageOptions, service: '', convert: async () => data,
    download: async () => new Blob(['image'], { type: 'image/png' }) });
  assert.equal(preparePlatformContent(root.innerHTML, getTheme('minimal'), 'wechat').canCopy, true);
});

test('service settings reject insecure or credential-bearing remote endpoints', () => {
  assert.equal(validateImageService(''), '');
  assert.equal(validateImageService('http://localhost:8787/api/image'), 'http://localhost:8787/api/image');
  for (const value of ['http://remote.example/api/image', 'https://name:secret@example.com', 'javascript:alert(1)', 'https://example.com/?token=x']) {
    assert.throws(() => validateImageService(value));
  }
});

test('downloads enforce status, MIME, declared and streamed size limits and omit credentials', async () => {
  const previousFetch = globalThis.fetch;
  try {
    for (const response of [new Response('missing', { status: 404 }), new Response('<html>', { headers: { 'content-type': 'text/html' } }),
      new Response('image', { headers: { 'content-type': 'image/jpeg', 'content-length': String(MAX_REMOTE_BYTES + 1) } })]) {
      globalThis.fetch = async () => response;
      await assert.rejects(downloadRemoteImage('https://images.example/photo', ''));
    }
    globalThis.fetch = async (_url, options) => {
      assert.equal(options?.credentials, 'omit'); assert.equal(options?.referrerPolicy, 'no-referrer');
      if (_url === 'https://images.example/photo') throw new TypeError('CORS');
      assert.equal(options?.method, 'POST'); assert.deepEqual(JSON.parse(String(options?.body)), { url: 'https://images.example/photo' });
      return new Response('image', { headers: { 'content-type': 'image/png' } });
    };
    assert.equal((await downloadRemoteImage('https://images.example/photo', 'https://service.example/api/image')).type, 'image/png');
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_REMOTE_BYTES + 1)); controller.close(); } });
    globalThis.fetch = async () => new Response(stream, { headers: { 'content-type': 'image/png' } });
    await assert.rejects(downloadRemoteImage('https://images.example/photo', ''), /48 MB/);
  } finally { globalThis.fetch = previousFetch; }
});

test('large image downloads report received bytes before the transfer completes', async () => {
  const previousFetch = globalThis.fetch;
  const progress: Array<[number, number | null]> = [];
  try {
    const stream = new ReadableStream({ start(controller) {
      controller.enqueue(new Uint8Array([1, 2]));
      controller.enqueue(new Uint8Array([3, 4, 5]));
      controller.close();
    } });
    globalThis.fetch = async () => new Response(stream, { headers: { 'content-type': 'image/jpeg', 'content-length': '5' } });
    const image = await downloadRemoteImage('https://images.example/photo', '', undefined,
      (received, total) => progress.push([received, total]));
    assert.equal(image.size, 5);
    assert.deepEqual(progress, [[2, 5], [5, 5]]);
  } finally { globalThis.fetch = previousFetch; }
});


test('a configured service does not prevent direct browser downloads', async () => {
  const previousFetch = globalThis.fetch;
  const calls: string[] = [];
  try {
    globalThis.fetch = async (url) => {
      calls.push(String(url));
      return new Response('direct', { headers: { 'content-type': 'image/jpeg' } });
    };
    const result = await downloadRemoteImage('https://new-source.example/image', 'https://service.example/api/image');
    assert.equal(await result.text(), 'direct');
    assert.deepEqual(calls, ['https://new-source.example/image']);
  } finally { globalThis.fetch = previousFetch; }
});

test('direct source errors fall back to the service; size and cancellation never do', async () => {
  const previousFetch = globalThis.fetch;
  try {
    for (const kind of ['html', 'http', 'cors']) {
      let calls = 0;
      globalThis.fetch = async () => {
        if (++calls === 1) {
          if (kind === 'cors') throw new TypeError('CORS');
          return kind === 'html' ? new Response('challenge', { headers: { 'content-type': 'text/html' } }) : new Response('forbidden', { status: 403 });
        }
        return new Response('image', { headers: { 'content-type': 'image/png' } });
      };
      await downloadRemoteImage('https://new.example/image', 'https://service.example/api/image');
      assert.equal(calls, 2);
    }
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return new Response('image', { headers: { 'content-type': 'image/png', 'content-length': String(MAX_REMOTE_BYTES + 1) } });
    };
    await assert.rejects(downloadRemoteImage('https://new.example/image', 'https://service.example/api/image'), /48 MB/);
    assert.equal(calls, 1);
    const controller = new AbortController();
    calls = 0;
    globalThis.fetch = async () => { calls++; controller.abort(); throw new DOMException('Aborted', 'AbortError'); };
    await assert.rejects(downloadRemoteImage('https://new.example/image', 'https://service.example/api/image', controller.signal), /已停止/);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = previousFetch; }
});

test('service access challenges have actionable errors rather than connection failure', async () => {
  const previousFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => {
      if (url === 'https://new.example/image') throw new TypeError('CORS');
      return new Response(JSON.stringify({ code: 'SOURCE_ACCESS_DENIED', error: 'upstream text' }), {
        status: 502, headers: { 'content-type': 'application/json' },
      });
    };
    await assert.rejects(downloadRemoteImage('https://new.example/image', 'https://service.example/api/image'), /网站验证.*打开原图/);
  } finally { globalThis.fetch = previousFetch; }
});

test('a stalled direct header request automatically falls back within eight seconds', async (t) => {
  const previousFetch = globalThis.fetch;
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const calls: string[] = [];
  try {
    globalThis.fetch = async (url, options) => {
      calls.push(String(url));
      if (calls.length === 1) return new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      });
      return new Response('image', { headers: { 'content-type': 'image/png' } });
    };
    const result = downloadRemoteImage('https://slow.example/photo', 'https://service.example/api/image');
    t.mock.timers.tick(8000);
    assert.equal((await result).type, 'image/png');
    assert.deepEqual(calls, ['https://slow.example/photo', 'https://service.example/api/image']);
  } finally { globalThis.fetch = previousFetch; t.mock.timers.reset(); }
});
