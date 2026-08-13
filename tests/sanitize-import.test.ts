import assert from 'node:assert/strict';
import test from 'node:test';

import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://app.example/',
});

Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  Node: dom.window.Node,
  Element: dom.window.Element,
  HTMLTemplateElement: dom.window.HTMLTemplateElement,
});

const { htmlToBody, sanitizeImportedHtml } = await import('../src/core/sanitize.ts');

test('hostile imports cannot execute active content or silently load resources', () => {
  const imported = sanitizeImportedHtml(`
    <html><body>
      <style>@import "https://tracker.example/style.css"</style>
      <script>globalThis.compromised = true</script>
      <iframe src="https://tracker.example/frame"></iframe>
      <p onclick="alert(1)" style="color:#333;background:url(https://tracker.example/pixel)">
        Safe text
      </p>
      <img src="https://tracker.example/pixel.png" onerror="alert(1)" srcset="https://tracker.example/2x.png 2x">
    </body></html>
  `);

  assert.match(imported.html, /Safe text/);
  assert.match(imported.html, /style="color:#333"/);
  assert.doesNotMatch(imported.html, /script|iframe|onclick|onerror|srcset/i);
  assert.doesNotMatch(imported.html, /tracker\.example/);
  assert.equal(imported.report.externalImagesRemoved, 1);
  assert.equal(imported.report.resourceStylesRemoved, 1);
});

test('nested active and auto-loading tags cannot reappear after neutralization', () => {
  const imported = sanitizeImportedHtml(`
    <scr<script>globalThis.compromised = true</script>ipt>
      globalThis.compromisedAgain = true
    </script>
    <ifr<iframe src="https://tracker.example/inner"></iframe>ame
      src="https://tracker.example/reintroduced">tracking</iframe>
    <p>Safe nested text</p>
  `);

  assert.match(imported.html, /Safe nested text/);
  assert.doesNotMatch(imported.html, /script|iframe|tracker\.example|compromised/i);
});

test('encoded image schemes are classified after pure entity decoding', () => {
  const encodedRemote = sanitizeImportedHtml(
    '<img src="&#x68;ttps&#58;//images.example/article.png">',
  );
  const encodedLocal = sanitizeImportedHtml(
    '<img src="d&#x61;ta:image/png;base64,AAAA">',
  );
  const encodedScript = sanitizeImportedHtml(
    '<img src="j&#x61;vascript:alert(1)">',
    { allowExternalImages: true },
  );

  assert.equal(encodedRemote.report.externalImagesRemoved, 1);
  assert.match(encodedLocal.html, /src="data:image\/png;base64,AAAA"/);
  assert.equal(encodedScript.report.invalidImagesRemoved, 1);
  assert.doesNotMatch(encodedScript.html, /javascript|img/i);
});

test('remote images require opt-in and receive privacy attributes', () => {
  const source = '<p>Text</p><img src="https://images.example/article.png" alt="Example">';
  const blocked = sanitizeImportedHtml(source);
  const allowed = sanitizeImportedHtml(source, { allowExternalImages: true });

  assert.doesNotMatch(blocked.html, /images\.example/);
  assert.equal(blocked.report.externalImagesRemoved, 1);
  assert.match(allowed.html, /src="https:\/\/images\.example\/article\.png"/);
  assert.match(allowed.html, /referrerpolicy="no-referrer"/);
  assert.match(allowed.html, /loading="lazy"/);
  assert.equal(allowed.report.externalImagesKept, 1);
});

test('persisted HTML is sanitized again before restoration', () => {
  const restored = htmlToBody(
    '<p onmouseover="alert(1)">Draft</p><object data="https://evil.example/file"></object>',
  );

  assert.equal(restored, '<p>Draft</p>');
});
