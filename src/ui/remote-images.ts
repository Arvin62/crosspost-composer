import { saveRemoteImages } from '../core/remote-images';
import { clearRemoteState, pendingImages, REMOTE_SOURCE, REMOTE_ERROR } from '../core/remote-image-state';
import { fileToDataURL, type ImageOptions } from '../core/image';
import { toast } from './toast';

export function initRemoteImages(editor: HTMLElement, onChange: () => void, getOptions: () => ImageOptions, getService: () => string) {
  const banner = document.querySelector<HTMLElement>('#remoteImageBanner')!;
  const summary = document.querySelector<HTMLElement>('#remoteImageSummary')!;
  const save = document.querySelector<HTMLButtonElement>('#remoteImageSave')!;
  const stop = document.querySelector<HTMLButtonElement>('#remoteImageStop')!;
  const review = document.querySelector<HTMLButtonElement>('#remoteImageReview')!;
  const dialog = document.querySelector<HTMLDialogElement>('#remoteImageDlg')!;
  const list = document.querySelector<HTMLElement>('#remoteImageList')!;
  const replaceInput = document.querySelector<HTMLInputElement>('#remoteReplaceInput')!;
  let controller: AbortController | null = null;
  let replacing: HTMLImageElement | null = null;

  function renderList(): void {
    list.replaceChildren();
    pendingImages(editor).forEach((image, index) => {
      const row = document.createElement('div');
      row.className = 'remote-image-row';
      const description = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = `${index + 1}. ${image.alt || '未命名配图'}`;
      const status = document.createElement('p');
      status.textContent = image.getAttribute(REMOTE_ERROR) || '待下载并保存';
      const source = document.createElement('small');
      // Show only the hostname; the original URL opens only on an explicit user click.
      try { source.textContent = new URL(image.getAttribute(REMOTE_SOURCE)!, location.href).hostname; } catch { source.textContent = '图片地址无效'; }
      description.append(title, status, source);
      const retry = document.createElement('button');
      retry.textContent = '重试';
      retry.disabled = controller !== null;
      retry.addEventListener('click', () => void start([image]));
      const replace = document.createElement('button');
      replace.textContent = '原位换图';
      replace.addEventListener('click', () => { replacing = image; replaceInput.click(); });
      const open = document.createElement('a');
      open.textContent = '打开原图';
      try {
        const url = new URL(image.getAttribute(REMOTE_SOURCE)!, location.href);
        if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) {
          open.href = url.href;
          open.target = '_blank';
          open.rel = 'noopener noreferrer';
          row.append(description, open, retry, replace);
        } else row.append(description, retry, replace);
      } catch { row.append(description, retry, replace); }
      list.append(row);
    });
    if (!list.childElementCount) list.textContent = '全部配图已处理。';
  }

  function refresh(): void {
    const images = pendingImages(editor);
    const lowResolution = [...editor.querySelectorAll<HTMLImageElement>('img')].filter((image) =>
      !image.hasAttribute(REMOTE_SOURCE) && image.naturalWidth > 0 &&
      (Math.max(image.naturalWidth, image.naturalHeight) < 1920 || Math.min(image.naturalWidth, image.naturalHeight) < 1080),
    );
    banner.hidden = !images.length && !controller && !lowResolution.length;
    if (!controller) {
      const failures = images.filter((image) => image.hasAttribute(REMOTE_ERROR)).length;
      summary.textContent = images.length
        ? `检测到 ${images.length} 张配图待保存${failures ? `，${failures} 张上次失败` : ''}。保存后自动留在原位置。`
        : `${lowResolution.length} 张图片不足 1080P 尺寸（长边 1920、短边 1080 px），建议替换为更高清的原图。`;
    }
    save.hidden = !images.length;
    review.hidden = !images.length;
    save.disabled = controller !== null || !images.length;
    save.textContent = images.some((image) => image.hasAttribute(REMOTE_ERROR)) ? '重试并保存配图' : '下载并保存配图';
    stop.hidden = controller === null;
    if (dialog.open) renderList();
  }

  async function start(images?: HTMLImageElement[]): Promise<void> {
    if (controller || !(images ?? pendingImages(editor)).length) return;
    const run = new AbortController();
    controller = run;
    refresh();
    summary.textContent = '正在下载并保存配图…高清原图较大时可能需要几分钟，可随时停止。';
    try {
      const result = await saveRemoteImages(editor, {
        imageOptions: { ...getOptions() }, service: getService(), signal: run.signal, images,
        onChange,
        onProgress(completed, total, received, imageBytes) {
          if (controller !== run) return;
          const bytes = (value: number) => `${(value / 1024 / 1024).toFixed(1)} MB`;
          summary.textContent = received === undefined
            ? `已处理 ${completed} / ${total} 张，正在处理后续配图…`
            : `正在下载第 ${completed + 1} / ${total} 张：${bytes(received)}${imageBytes ? ` / ${bytes(imageBytes)}` : ''}。高清原图较大，请稍候。`;
        },
      });
      if (controller !== run) return;
      toast(`配图${result.cancelled ? '处理已停止' : '处理完成'}：${result.saved} 张已嵌入文章` + (result.failed ? `，${result.failed} 张失败，可重试或原位换图` : ''), 6000);
    } finally {
      if (controller === run) {
        controller = null;
        refresh();
        onChange();
      }
    }
  }

  save.addEventListener('click', () => void start());
  editor.addEventListener('load', (event) => { if (event.target instanceof HTMLImageElement) refresh(); }, true);
  stop.addEventListener('click', () => controller?.abort());
  document.querySelector('#remoteImageReview')!.addEventListener('click', () => { renderList(); dialog.showModal(); });
  document.querySelector('#remoteImageClose')!.addEventListener('click', () => dialog.close());
  replaceInput.addEventListener('change', async () => {
    const image = replacing;
    const file = replaceInput.files?.[0];
    replaceInput.value = '';
    replacing = null;
    if (!image || !file || !editor.contains(image)) return;
    try {
      const source = image.getAttribute('src');
      const data = await fileToDataURL(file, getOptions());
      if (!editor.contains(image) || image.getAttribute('src') !== source) return;
      image.src = data;
      clearRemoteState(image);
      onChange();
      refresh();
      toast('已在原位置替换配图');
    } catch (error) { toast(error instanceof Error ? error.message : '替换失败'); }
  });

  return {
    start, refresh,
    cancel() {
      controller?.abort();
      controller = null;
      replacing = null;
      if (dialog.open) dialog.close();
      refresh();
    },
  };
}
