import { createServer } from 'node:http';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { pathToFileURL } from 'node:url';

export const MAX_IMAGE_BYTES = 48 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/bmp', 'image/x-icon']);
export class ImageServiceError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/** Reject local, private, link-local, documentation, multicast, and transition networks. */
export function isPublicAddress(address) {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) || (a === 192 && b === 88 && c === 99) ||
      (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113));
  }
  if (isIP(address) !== 6 || address.includes('.')) return false;
  const parts = address.toLowerCase().split(':');
  const first = parseInt(parts[0] || '0', 16);
  const second = parseInt(parts[1] || '0', 16);
  return first >= 0x2000 && first <= 0x3fff && first !== 0x2002 &&
    !(first === 0x2001 && (second < 0x200 || second === 0xdb8)) &&
    !(first === 0x3fff && second < 0x1000);
}

export async function resolveImageURL(source, { allowedHosts = [], resolve = lookup, signal } = {}) {
  let url;
  try { url = new URL(source); } catch { throw new ImageServiceError(400, 'Invalid image URL'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash ||
      (url.port && url.port !== '80' && url.port !== '443')) throw new ImageServiceError(400, 'Unsupported image URL');
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (allowedHosts.length && !allowedHosts.includes(host)) throw new ImageServiceError(403, 'Image host is not enabled');
  let addresses;
  let abort;
  try {
    const resolution = isIP(host) ? Promise.resolve([{ address: host, family: isIP(host) }]) : resolve(host, { all: true, verbatim: true });
    const cancelled = new Promise((_resolve, reject) => {
      abort = () => reject(new ImageServiceError(504, 'Image host lookup timed out'));
      if (signal?.aborted) abort();
      else signal?.addEventListener('abort', abort, { once: true });
    });
    addresses = await Promise.race([resolution, cancelled]);
  }
  catch { throw new ImageServiceError(502, 'Image host lookup failed'); }
  finally { if (abort) signal?.removeEventListener('abort', abort); }
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw new ImageServiceError(403, 'Private network destinations are blocked');
  return { url, address: addresses[0] };
}

function requestPinned(url, address, signal, maxBytes) {
  return new Promise((resolve, reject) => {
    const send = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const req = send(url, {
      signal, agent: false,
      // Pin the validated DNS result for this connection; do not resolve a second time.
      lookup(_hostname, options, callback) {
        if (options?.all) callback(null, [address]);
        else callback(null, address.address, address.family);
      },
      headers: { Accept: 'image/*', 'Accept-Encoding': 'identity', 'User-Agent': 'CrosspostComposer-ImageService/1.0' },
    }, (res) => {
      const status = res.statusCode ?? 502;
      if ([301, 302, 303, 307, 308].includes(status)) {
        res.destroy(); resolve({ redirect: res.headers.location }); return;
      }
      if (status !== 200) { res.destroy(); reject(new ImageServiceError(status === 404 ? 404 : 502, 'Image source returned an error')); return; }
      const type = (res.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
      if (!IMAGE_TYPES.has(type)) { res.destroy(); reject(new ImageServiceError(415, 'Unsupported image content type')); return; }
      if (Number(res.headers['content-length']) > maxBytes) { res.destroy(); reject(new ImageServiceError(413, 'Image is too large')); return; }
      const chunks = [];
      let size = 0;
      res.on('data', (chunk) => {
        size += chunk.length;
        if (size > maxBytes) {
          reject(new ImageServiceError(413, 'Image is too large'));
          res.destroy(); req.destroy();
        } else chunks.push(chunk);
      });
      res.on('error', reject);
      res.on('end', () => size ? resolve({ bytes: Buffer.concat(chunks), type }) : reject(new ImageServiceError(502, 'Empty image')));
    });
    req.on('error', reject);
    req.setTimeout(15_000, () => req.destroy(new ImageServiceError(504, 'Image source timed out')));
    req.end();
  });
}

export async function downloadImage(source, options = {}) {
  const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(120_000)]) : AbortSignal.timeout(120_000);
  let current = source;
  for (let count = 0; count <= 4; count++) {
    if (signal.aborted) throw new ImageServiceError(504, 'Image source timed out');
    const { url, address } = await resolveImageURL(current, { ...options, signal });
    const result = await (options.transport ?? requestPinned)(url, address, signal, options.maxBytes ?? MAX_IMAGE_BYTES);
    if (!('redirect' in result)) return result;
    if (!result.redirect) throw new ImageServiceError(502, 'Invalid image redirect');
    current = new URL(result.redirect, url).href;
    // Each redirect is independently checked for host permission and public DNS.
  }
  throw new ImageServiceError(502, 'Too many image redirects');
}

export function createImageService({ origins, allowedHosts, download = downloadImage, maxActive = 2 } = {}) {
  if (!origins?.length || !allowedHosts?.length) throw new Error('Explicit allowed origins and image hosts are required');
  let active = 0;
  const rates = new Map();
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Origin');
    const fail = (status, message) => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: message }));
    };
    if (req.url === '/health' && req.method === 'GET') { res.end('ok'); return; }
    if (req.url !== '/api/image') { fail(404, 'Not found'); return; }
    const origin = req.headers.origin;
    if (!origin || !origins.includes(origin)) { fail(403, 'Origin is not enabled'); return; }
    res.setHeader('Access-Control-Allow-Origin', origin);
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' });
      res.end(); return;
    }
    if (req.method !== 'POST') { fail(405, 'Use POST'); return; }
    if (req.headers['content-type']?.split(';')[0] !== 'application/json') { fail(415, 'Use application/json'); return; }
    const now = Date.now();
    for (const [key, value] of rates) if (now - value.start > 60_000) rates.delete(key);
    const key = req.socket.remoteAddress ?? 'unknown';
    const rate = rates.get(key) ?? { start: now, count: 0 };
    if (active >= maxActive || rate.count >= 60 || rates.size > 2000) { fail(429, 'Please retry later'); return; }
    rate.count++; rates.set(key, rate);
    active++;
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 130_000);
    const disconnect = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', disconnect);
    const readAbort = () => req.destroy();
    controller.signal.addEventListener('abort', readAbort, { once: true });
    try {
      let body = '';
      let bodyBytes = 0;
      for await (const chunk of req) {
        bodyBytes += chunk.length;
        if (bodyBytes > 8192) throw new ImageServiceError(413, 'Request is too large');
        body += chunk.toString('utf8');
      }
      controller.signal.removeEventListener('abort', readAbort);
      let parsed;
      try { parsed = JSON.parse(body); } catch { throw new ImageServiceError(400, 'Invalid JSON'); }
      if (typeof parsed?.url !== 'string' || parsed.url.length > 4096) throw new ImageServiceError(400, 'An image URL is required');
      const result = await download(parsed.url, { allowedHosts, signal: controller.signal });
      if (controller.signal.aborted || res.destroyed) return;
      res.writeHead(200, { 'Content-Type': result.type, 'Content-Length': result.bytes.length });
      res.end(result.bytes);
    } catch (error) {
      fail(error instanceof ImageServiceError ? error.status : controller.signal.aborted ? 504 : 502, error instanceof ImageServiceError ? error.message : 'Image download failed');
    } finally {
      controller.signal.removeEventListener('abort', readAbort);
      clearTimeout(deadline); active--;
    }
  });
  server.headersTimeout = 10_000;
  server.requestTimeout = 15_000;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const csv = (name) => (process.env[name] ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  const origins = csv('IMAGE_ALLOWED_ORIGINS');
  const allowedHosts = csv('IMAGE_ALLOWED_HOSTS').map((host) => host.toLowerCase());
  const server = createImageService({ origins, allowedHosts });
  const host = process.env.IMAGE_HOST ?? '127.0.0.1';
  const port = Number(process.env.IMAGE_PORT ?? '8787');
  server.listen(port, host, () => console.log(`Image download service listening on ${host}:${port}`));
}
