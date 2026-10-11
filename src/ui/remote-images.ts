import { saveRemoteImages } from '../core/remote-images.ts';
import { clearRemoteState, pendingImages, REMOTE_SOURCE, REMOTE_ERROR } from '../core/remote-image-state.ts';
import { fileToDataURL, type ImageOptions } from '../core/image.ts';
import { toast } from './toast.ts';

export function initRemoteImages(editor: HTMLElement, onChange: () => void, getOptions: () => ImageOptions, getService: () => string) {
  const banner = document.querySelector<HTMLElement>('#remoteImageBanner')!;
  const badge = document.querySelector<HTMLElement>('#remoteImageBadge')!;
  const overview = document.querySelector<HTMLElement>('#remoteImageOverview')!;
  const privacy = document.querySelector<HTMLElement>('#remoteImagePrivacy')!;
  const summary = document.querySelector<HTMLElement>('#remoteImageSummary')!;
  const save = document.querySelector<HTMLButtonElement>('#remoteImageSave')!;
  const stop = document.querySelector<HTMLButtonElement>('#remoteImageStop')!;
  const review = document.querySelector<HTMLButtonElement>('#remoteImageReview')!;
  const dialog = document.querySelector<HTMLDialogElement>('#remoteImageDlg')!;
  const list = document.querySelector<HTMLElement>('#remoteImageList')!;
  const replaceInput = document.querySelector<HTMLInputElement>('#remoteReplaceInput')!;
  let controller: AbortController | null = null;
  let replacing: HTMLImageElement | null = null;

  function lowResolutionImages(): HTMLImageElement[] {
    return [...editor.querySelectorAll<HTMLImageElement>('img')].filter((image) =>
      !image.hasAttribute(REMOTE_SOURCE) && image.naturalWidth > 0 && image.naturalHeight > 0 &&
      (Math.max(image.naturalWidth, image.naturalHeight) < 1920 || Math.min(image.naturalWidth, image.naturalHeight) < 1080),
    );
  }

  function renderList(): void {
    list.replaceChildren();
    const pending = pendingImages(editor);
    const lowResolution = lowResolutionImages();
    const allImages = [...editor.querySelectorAll<HTMLImageElement>('img')];
    overview.textContent = `共 ${allImages.length} 张配图，${pending.length ? `${pending.length} 张待保存` : '全部已保存'}。成功保存的图片已在正文原位，无需重新插图。`;
    privacy.hidden = !pending.length;
    function group(label: string): void {
      const heading = document.createElement('h4');
      heading.className = 'remote-image-group';
      heading.textContent = label;
      list.append(heading);
    }
    function rowFor(image: HTMLImageElement, statusText: string): { row: HTMLDivElement; description: HTMLDivElement; actions: HTMLDivElement } {
      const row = document.createElement('div');
      row.className = 'remote-image-row';
      const description = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = `${allImages.indexOf(image) + 1}. ${image.alt || '未命名配图'}`;
      const status = document.createElement('p');
      status.textContent = statusText;
      description.append(title, status);
      const actions = document.createElement('div');
      actions.className = 'remote-image-row-actions';
      const locate = document.createElement('button');
      locate.textContent = '定位';
      locate.addEventListener('click', () => {
        if (!editor.contains(image)) { refresh(); return; }
        dialog.close();
        image.scrollIntoView({ block: 'center', behavior: 'smooth' });
        editor.focus({ preventScroll: true });
        // Select after the detail button click has finished bubbling.
        requestAnimationFrame(() => { if (editor.contains(image)) image.click(); });
      });
      const replace = document.createElement('button');
      replace.textContent = '原位换图';
      replace.addEventListener('click', () => { replacing = image; replaceInput.click(); });
      actions.append(locate, replace);
      row.append(description, actions);
      list.append(row);
      return { row, description, actions };
    }
    if (pending.length) group(`待保存 · ${pending.length} 张`);
    pending.forEach((image) => {
      const { description, actions } = rowFor(image, image.getAttribute(REMOTE_ERROR) || '待下载并保存');
      const source = document.createElement('small');
      // Only an explicit click opens the original URL; rendering never requests it.
      try { source.textContent = new URL(image.getAttribute(REMOTE_SOURCE)!, location.href).hostname; } catch { source.textContent = '图片地址无效'; }
      description.append(source);
      const retry = document.createElement('button');
      retry.textContent = image.hasAttribute(REMOTE_ERROR) ? '重试' : '保存';
      retry.disabled = controller !== null;
      retry.addEventListener('click', () => void start([image]));
      actions.prepend(retry);
      const open = document.createElement('a');
      open.textContent = '打开原图';
      try {
        const url = new URL(image.getAttribute(REMOTE_SOURCE)!, location.href);
        if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) {
          open.href = url.href;
          open.target = '_blank';
          open.rel = 'noopener noreferrer';
          actions.prepend(open);
        }
      } catch { /* Invalid URLs remain available for local replacement. */ }
    });
    if (lowResolution.length) {
      group(`清晰度参考 · ${lowResolution.length} 张`);
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = '以下原图低于 1080P 参考尺寸（长边 1920、短边 1080 px）。这是清晰度建议，不影响编辑；工具不会通过放大像素提高画质。';
      list.append(hint);
      lowResolution.forEach((image) => rowFor(image, `${image.naturalWidth} × ${image.naturalHeight} px · 已保存，可换成更高清的原图`));
    }
    if (!pending.length && !lowResolution.length) {
      const message = document.createElement('p');
      message.className = 'hint';
      message.textContent = '当前没有待处理的配图。点击正文图片可调整尺寸、图注或替换。';
      list.append(message);
    }
  }

  function refresh(): void {
    const images = pendingImages(editor);
    const lowResolution = lowResolutionImages();
    const total = editor.querySelectorAll('img').length;
    const failures = images.filter((image) => image.hasAttribute(REMOTE_ERROR)).length;
    const attention = images.length + lowResolution.length;
    banner.hidden = !total && !controller;
    banner.dataset.state = controller ? 'saving' : failures ? 'failed' : attention ? 'attention' : 'ready';
    badge.hidden = !attention && !controller;
    badge.textContent = controller ? '保存中' : `${attention} 张需检查`;
    review.setAttribute('aria-label', `配图详情，共 ${total} 张${attention ? `，${attention} 张需检查` : ''}`);
    if (!controller) {
      summary.textContent = images.length
        ? `${images.length} 张待保存${failures ? ` · ${failures} 张失败` : ''}`
        : `${total} 张已保存`;
      summary.title = summary.textContent;
    }
    save.hidden = !images.length;
    save.disabled = controller !== null || !images.length;
    save.textContent = failures ? '重试保存' : '保存配图';
    stop.hidden = controller === null;
    if (dialog.open) renderList();
  }

  async function start(images?: HTMLImageElement[]): Promise<void> {
    if (controller || !(images ?? pendingImages(editor)).length) return;
    const run = new AbortController();
    controller = run;
    refresh();
    summary.textContent = '正在保存配图…';
    summary.title = '最多同时下载两张；高清原图较大时请稍候，可随时停止。';
    try {
      const result = await saveRemoteImages(editor, {
        imageOptions: { ...getOptions() }, service: getService(), signal: run.signal, images,
        onChange,
        onProgress(completed, total, received, imageBytes, imageNumber) {
          if (controller !== run) return;
          const bytes = (value: number) => `${(value / 1024 / 1024).toFixed(1)} MB`;
          summary.textContent = received === undefined
            ? `已处理 ${completed} / ${total} 张`
            : `已处理 ${completed} / ${total} 张 · 第 ${imageNumber ?? completed + 1} 张 ${bytes(received)}${imageBytes ? ` / ${bytes(imageBytes)}` : ''}`;
          summary.title = summary.textContent;
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
