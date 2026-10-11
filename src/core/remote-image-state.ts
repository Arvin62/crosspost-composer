/** Pending images carry an inert preview; their original URLs are never loaded by <img>. */
export const REMOTE_SOURCE = 'data-cpc-remote-src';
export const REMOTE_ERROR = 'data-cpc-remote-error';
export const IMAGE_PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="180" viewBox="0 0 640 180"><rect width="640" height="180" rx="8" fill="#eef2f7"/><text x="320" y="94" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#53647a">配图待保存 · 可原位替换</text></svg>',
);

export function pendingImages(root: ParentNode): HTMLImageElement[] {
  return [...root.querySelectorAll<HTMLImageElement>(`img[${REMOTE_SOURCE}]`)];
}

export function clearRemoteState(image: HTMLImageElement): void {
  image.removeAttribute(REMOTE_SOURCE);
  image.removeAttribute(REMOTE_ERROR);
}
