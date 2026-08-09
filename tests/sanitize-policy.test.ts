import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasExternalStyleResource,
  isExternalImageSource,
  isLocalImageSource,
  stripExternalStyleResources,
} from '../src/core/sanitize.ts';

test('classifies image sources without treating embedded images as external', () => {
  assert.equal(isExternalImageSource('https://images.example.com/pixel.png'), true);
  assert.equal(isExternalImageSource('//images.example.com/pixel.png'), true);
  assert.equal(isExternalImageSource('data:image/png;base64,abc'), false);
  assert.equal(isLocalImageSource('data:image/png;base64,abc'), true);
  assert.equal(isLocalImageSource('blob:https://app.example/id'), true);
  assert.equal(isLocalImageSource('/relative/image.png'), false);
});

test('detects styles that can load external resources', () => {
  assert.equal(hasExternalStyleResource('color:#333'), false);
  assert.equal(hasExternalStyleResource('background:url(https://tracker.example/pixel)'), true);
  assert.equal(hasExternalStyleResource('background-image:image-set("//img.example/a" 1x)'), true);
  assert.equal(hasExternalStyleResource('@import "https://fonts.example/css"'), true);
});

test('removes only resource-loading declarations from inline styles', () => {
  assert.deepEqual(
    stripExternalStyleResources(
      'color:#333; background-image:url(https://tracker.example/pixel); margin:0 auto',
    ),
    { value: 'color:#333;margin:0 auto', removed: 1 },
  );
});
