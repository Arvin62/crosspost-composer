/**
 * 图片处理：把本地图片文件压缩并转成 base64 data URL。
 * 跨端复用（网页版 / 未来的插件版 / 桌面版共用）。
 */

export interface ImageOptions {
  /** 最大宽度（px），超过则等比缩小。 */
  maxWidth: number;
  /** JPEG 压缩质量，0~1。 */
  quality: number;
}

export const DEFAULT_IMAGE_OPTIONS: ImageOptions = {
  maxWidth: 1280,
  quality: 0.85,
};

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片解码失败'));
    };
    im.src = url;
  });
}

function loadImageSource(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (/^https?:\/\//i.test(src)) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片解码失败或外链图片不允许跨域处理'));
    image.src = src;
  });
}

function canvasHasAlpha(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  const data = ctx.getImageData(0, 0, width, height).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

function canvasDataURL(
  canvas: HTMLCanvasElement,
  source: string,
  quality: number,
): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器不支持 Canvas');
  const sourcePrefersPNG = /^data:image\/(?:png|gif|svg\+xml)/i.test(source);
  const keepPNG = sourcePrefersPNG && canvasHasAlpha(ctx, canvas.width, canvas.height);
  return keepPNG ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality);
}

/**
 * 把图片文件转成 data URL。
 * - GIF / SVG 原样保留（动图不能走 canvas，会丢帧）。
 * - 其余格式按 maxWidth 等比缩放；含透明像素的 PNG 保留 PNG，否则转 JPEG 减小体积。
 */
export async function fileToDataURL(
  file: File,
  opts: ImageOptions = DEFAULT_IMAGE_OPTIONS,
): Promise<string> {
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return readAsDataURL(file);
  }

  const im = await loadImage(file);
  const scale = Math.min(1, opts.maxWidth / im.naturalWidth);
  const w = Math.max(1, Math.round(im.naturalWidth * scale));
  const h = Math.max(1, Math.round(im.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    URL.revokeObjectURL(im.src);
    return readAsDataURL(file);
  }
  ctx.drawImage(im, 0, 0, w, h);
  URL.revokeObjectURL(im.src);

  const hasAlpha = file.type === 'image/png' && canvasHasAlpha(ctx, w, h);

  return hasAlpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', opts.quality);
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 把图片顺时针旋转 90 度；外链图片需要服务器允许 CORS。 */
export async function rotateDataURL(
  source: string,
  quality = DEFAULT_IMAGE_OPTIONS.quality,
): Promise<string> {
  const image = await loadImageSource(source);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalHeight;
  canvas.height = image.naturalWidth;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器不支持 Canvas');
  ctx.translate(canvas.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(image, 0, 0);
  return canvasDataURL(canvas, source, quality);
}

/** 按原图像素坐标裁剪图片。 */
export async function cropDataURL(
  source: string,
  crop: CropRect,
  quality = DEFAULT_IMAGE_OPTIONS.quality,
): Promise<string> {
  const image = await loadImageSource(source);
  const x = Math.max(0, Math.min(image.naturalWidth - 1, Math.round(crop.x)));
  const y = Math.max(0, Math.min(image.naturalHeight - 1, Math.round(crop.y)));
  const width = Math.max(1, Math.min(image.naturalWidth - x, Math.round(crop.width)));
  const height = Math.max(1, Math.min(image.naturalHeight - y, Math.round(crop.height)));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器不支持 Canvas');
  ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
  return canvasDataURL(canvas, source, quality);
}

/** 重新按当前设置压缩一张 data URL 图片。 */
export async function recompressDataURL(
  source: string,
  opts: ImageOptions = DEFAULT_IMAGE_OPTIONS,
): Promise<string> {
  if (!source.startsWith('data:image/') || /^data:image\/(?:gif|svg\+xml)/i.test(source)) {
    return source;
  }
  const image = await loadImageSource(source);
  const scale = Math.min(1, opts.maxWidth / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器不支持 Canvas');
  ctx.drawImage(image, 0, 0, width, height);
  return canvasDataURL(canvas, source, opts.quality);
}
