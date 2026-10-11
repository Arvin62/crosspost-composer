import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { createImageService, isPublicAddress, resolveImageURL, downloadImage } from '../server/image-service.mjs';

test('service rejects private and special addresses including alternate IPv4 and IPv6 forms', async () => {
  for (const address of ['127.0.0.1', '0.0.0.0', '10.2.3.4', '172.20.1.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '198.18.0.1', '192.0.2.1', '224.0.0.1', '::1', '::ffff:127.0.0.1', 'fe80::1', 'fc00::1', '2001:db8::1', '2001::1', '2002:7f00:1::', '3fff::1']) {
    assert.equal(isPublicAddress(address), false, address);
  }
  assert.equal(isPublicAddress('8.8.8.8'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
  for (const source of ['http://2130706433/a', 'http://0x7f000001/a', 'http://127.1/a', 'http://[::1]/a', 'file:///etc/passwd', 'https://name:password@images.example/a', 'http://images.example:8080/a']) {
    await assert.rejects(resolveImageURL(source));
  }
});

test('all DNS answers and every permitted hostname must pass before connecting', async () => {
  const options = { allowedHosts: ['images.example'], resolve: async () => [{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.1', family: 4 }] };
  await assert.rejects(resolveImageURL('https://images.example/a', options), /Private/);
  await assert.rejects(resolveImageURL('https://other.example/a', options), /not enabled/);
  const approved = await resolveImageURL('https://images.example/a', { ...options, resolve: async () => [{ address: '8.8.8.8', family: 4 }] });
  assert.equal(approved.address.address, '8.8.8.8');
});

test('service requires explicit deployment origins and image hosts', () => {
  assert.throws(() => createImageService(), /required/);
  assert.throws(() => createImageService({ origins: ['https://app.example'] }), /required/);
});

test('redirects recheck host permission and DNS before the next connection', async () => {
  let connections = 0;
  await assert.rejects(downloadImage('https://images.example/a', {
    allowedHosts: ['images.example', 'private.example'],
    resolve: async (host) => [{ address: host === 'private.example' ? '127.0.0.1' : '8.8.8.8', family: 4 }],
    transport: async (_url, address) => { connections++; assert.equal(address.address, '8.8.8.8'); return { redirect: 'https://private.example/a' }; },
  }), /Private/);
  assert.equal(connections, 1);
  await assert.rejects(downloadImage('https://images.example/a', {
    allowedHosts: ['images.example'], resolve: async () => [{ address: '8.8.8.8', family: 4 }],
    transport: async () => ({ redirect: 'https://other.example/a' }),
  }), /not enabled/);
});

test('an aborted DNS lookup cannot hold the batch open indefinitely', async () => {
  await assert.rejects(resolveImageURL('https://images.example/a', {
    signal: AbortSignal.abort(), resolve: async () => new Promise(() => {}),
  }));
});

test('HTTP endpoint enforces origin, request shape and returns only image bytes', async () => {
  let calls = 0;
  const server = createImageService({ origins: ['https://app.example'], allowedHosts: ['images.example'], download: async (url) => {
    calls++; assert.equal(url, 'https://images.example/a'); return { bytes: Buffer.from('image'), type: 'image/png' };
  } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const endpoint = `http://127.0.0.1:${server.address().port}/api/image`;
  const headers = { Origin: 'https://app.example', 'Content-Type': 'application/json' };
  try {
    assert.equal((await fetch(endpoint, { method: 'POST', body: '{}', headers: { ...headers, Origin: 'https://evil.example' } })).status, 403);
    assert.equal(calls, 0);
    assert.equal((await fetch(endpoint, { method: 'POST', body: '{}', headers })).status, 400);
    assert.equal((await fetch(endpoint, { method: 'POST', body: '{', headers })).status, 400);
    assert.equal((await fetch(endpoint, { method: 'POST', body: 'a'.repeat(9000), headers })).status, 413);
    const preflight = await fetch(endpoint, { method: 'OPTIONS', headers });
    assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://app.example');
    const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ url: 'https://images.example/a' }) });
    assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'image/png');
    assert.equal(response.headers.get('cache-control'), 'no-store'); assert.equal(await response.text(), 'image');
    assert.equal(calls, 1);
  } finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
});
