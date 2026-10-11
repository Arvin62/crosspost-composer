import { fileToDataURL, type ImageOptions } from './image.ts';
import { clearRemoteState, pendingImages, REMOTE_ERROR, REMOTE_SOURCE } from './remote-image-state.ts';

export const MAX_REMOTE_BYTES = 48 * 1024 * 1024;
// High-resolution originals can take several minutes on a bandwidth-limited server.
const TIMEOUT_MS = 600_000;
type DownloadProgress = (received: number, total: number | null) => void;

export function validateImageService(value: string): string {
  if (!value.trim()) return '';
  const url = new URL(value.trim());
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.hash || url.search) {
    throw new Error('图片下载服务请填写 HTTPS 地址；本机服务可使用 http://localhost。');
  }
  return url.href;
}

async function responseImage(response: Response, progress?: DownloadProgress): Promise<Blob> {
  if (!response.ok) {
    if (response.status === 404) throw new Error('图片链接失效（404），请原位替换');
    if (response.status === 413) throw new Error('图片超过 48 MB，请下载后压缩并原位替换');
    if (response.status === 403) throw new Error('图源不允许读取，或下载服务未启用此图源；请原位替换');
    if (response.status === 429) throw new Error('下载服务繁忙，请稍后重试');
    throw new Error(`图片下载失败（${response.status}），请重试或原位替换`);
  }
  const type = response.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
  if (!/^image\/(?:jpeg|png|webp|gif|avif|bmp|x-icon)$/i.test(type)) {
    throw new Error('链接未返回支持的图片文件，请原位替换');
  }
  if (Number(response.headers.get('content-length')) > MAX_REMOTE_BYTES) {
    void response.body?.cancel();
    throw new Error('图片超过 48 MB，请下载后压缩并原位替换');
  }
  if (!response.body) throw new Error('没有收到图片数据');
  const reader = response.body.getReader();
  const length = Number(response.headers.get('content-length'));
  const total = length > 0 ? length : null;
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_REMOTE_BYTES) throw new Error('图片超过 48 MB，请下载后压缩并原位替换');
      chunks.push(new Uint8Array(value));
      progress?.(bytes, total);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  if (!bytes) throw new Error('图片文件为空');
  return new Blob(chunks, { type });
}

export async function downloadRemoteImage(source: string, service: string, signal?: AbortSignal, progress?: DownloadProgress): Promise<Blob> {
  const url = new URL(source.startsWith('//') ? `https:${source}` : source);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('图片地址不受支持');
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const endpoint = validateImageService(service);
  try {
    const response = endpoint
      ? await fetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.href }), credentials: 'omit', referrerPolicy: 'no-referrer', signal: requestSignal,
        })
      : await fetch(url.href, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: requestSignal });
    return await responseImage(response, progress);
  } catch (error) {
    if (requestSignal.aborted) throw new Error(signal?.aborted ? '已停止，可重试' : '下载超时，请重试');
    if (error instanceof TypeError) throw new Error(endpoint
      ? '无法连接图片下载服务，请检查设置或原位替换'
      : '网页无法读取此图片，请在设置中配置图片下载服务，或原位替换');
    throw error;
  }
}

export interface RemoteBatchOptions {
  imageOptions: ImageOptions;
  service: string;
  signal?: AbortSignal;
  images?: HTMLImageElement[];
  download?: typeof downloadRemoteImage;
  convert?: typeof fileToDataURL;
  onProgress?: (completed: number, total: number, received?: number, imageBytes?: number | null) => void;
  onChange?: () => void;
}

/** Process sequentially to keep high-resolution originals from exhausting memory. */
export async function saveRemoteImages(root: HTMLElement, options: RemoteBatchOptions): Promise<{ saved: number; failed: number; cancelled: boolean }> {
  const images = options.images ?? pendingImages(root);
  const cache = new Map<string, string>();
  let saved = 0;
  let failed = 0;
  let completed = 0;
  for (const image of images) {
    if (options.signal?.aborted) break;
    const source = image.getAttribute(REMOTE_SOURCE);
    if (!source || !root.contains(image)) continue;
    const originalPreview = image.getAttribute('src');
    image.removeAttribute(REMOTE_ERROR);
    try {
      let data = cache.get(source);
      if (!data) {
        const blob = await (options.download ?? downloadRemoteImage)(source, options.service, options.signal,
          (received, imageBytes) => options.onProgress?.(completed, images.length, received, imageBytes));
        if (options.signal?.aborted) break;
        data = await (options.convert ?? fileToDataURL)(new File([blob], 'remote-image', { type: blob.type }), options.imageOptions);
        cache.set(source, data);
      }
      if (options.signal?.aborted) break;
      // A user may replace/delete an image or switch documents while the request runs.
      if (!root.contains(image) || image.getAttribute(REMOTE_SOURCE) !== source || image.getAttribute('src') !== originalPreview) continue;
      image.src = data;
      clearRemoteState(image);
      saved++;
      options.onChange?.();
    } catch (error) {
      if (options.signal?.aborted) break;
      if (root.contains(image) && image.getAttribute(REMOTE_SOURCE) === source && image.getAttribute('src') === originalPreview) {
        image.setAttribute(REMOTE_ERROR, error instanceof Error ? error.message : '保存失败，请重试');
        failed++;
        options.onChange?.();
      }
    }
    options.onProgress?.(++completed, images.length);
  }
  return { saved, failed, cancelled: options.signal?.aborted ?? false };
}
