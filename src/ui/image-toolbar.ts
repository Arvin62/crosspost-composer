import { fileToDataURL, rotateDataURL, type ImageOptions } from '../core/image';
import type { ImageCropper } from './image-cropper';
import type { ImageMetadataDialog } from './image-metadata';
import { toast } from './toast';

export interface ImageToolbar {
  deselect(): void;
}

export function initImageToolbar(
  editor: HTMLElement,
  onChange: () => void,
  getOptions: () => ImageOptions,
  cropper: ImageCropper,
  metadataDialog: ImageMetadataDialog,
): ImageToolbar {
  const bar = document.querySelector<HTMLElement>('#imgBar')!;
  const delBtn = document.querySelector<HTMLButtonElement>('#imgDel')!;
  const replaceInput = document.querySelector<HTMLInputElement>('#replaceImageInput')!;
  let selected: HTMLImageElement | null = null;
  let dragged: HTMLElement | null = null;
  let dropTarget: HTMLElement | null = null;

  function position(): void {
    if (!selected) return;
    const rect = selected.getBoundingClientRect();
    const barWidth = bar.offsetWidth || 560;
    bar.style.left = `${Math.max(8, Math.min(window.innerWidth - barWidth - 8, rect.left))}px`;
    bar.style.top = `${Math.max(8, rect.top - bar.offsetHeight - 8)}px`;
  }

  function select(image: HTMLImageElement): void {
    deselect();
    selected = image;
    image.draggable = true;
    image.setAttribute('data-sel', '1');
    bar.hidden = false;
    requestAnimationFrame(position);
  }

  function deselect(): void {
    if (selected) {
      selected.removeAttribute('data-sel');
      selected = null;
    }
    bar.hidden = true;
  }

  function wrapperOf(image: HTMLImageElement): HTMLElement | null {
    const wrapper = image.closest('figure,p,section,div');
    return wrapper && wrapper !== editor && editor.contains(wrapper) ? (wrapper as HTMLElement) : null;
  }

  function movableOf(image: HTMLImageElement): HTMLElement {
    const wrapper = wrapperOf(image);
    if (wrapper?.tagName === 'FIGURE') return wrapper;
    if (
      wrapper &&
      (wrapper.textContent ?? '').trim() === '' &&
      wrapper.querySelectorAll('img').length === 1
    ) {
      return wrapper;
    }
    return image;
  }

  function ensureFigure(image: HTMLImageElement): HTMLElement {
    const current = image.closest('figure');
    if (current && editor.contains(current)) return current;

    const figure = document.createElement('figure');
    figure.style.cssText = 'margin:1.2em 0;text-align:center;';
    const wrapper = wrapperOf(image);
    if (
      wrapper &&
      (wrapper.textContent ?? '').trim() === '' &&
      wrapper.querySelectorAll('img').length === 1
    ) {
      figure.style.textAlign = wrapper.style.textAlign || 'center';
      wrapper.replaceWith(figure);
      figure.appendChild(image);
    } else {
      image.replaceWith(figure);
      figure.appendChild(image);
    }
    return figure;
  }

  async function replaceSelected(file: File): Promise<void> {
    if (!selected || !file.type.startsWith('image/')) return;
    const current = selected;
    toast('正在替换图片…', 0);
    try {
      current.src = await fileToDataURL(file, getOptions());
      current.alt = current.alt || file.name.replace(/\.[^.]+$/, '');
      select(current);
      onChange();
      toast('图片已替换');
    } catch {
      toast('图片替换失败');
    }
  }

  window.addEventListener('scroll', position, { passive: true });
  window.addEventListener('resize', position, { passive: true });

  bar.addEventListener('mousedown', (event) => event.preventDefault());
  bar.addEventListener('click', async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button || !selected) return;
    const current = selected;

    if (button.id === 'imgDel') {
      const wrapper = wrapperOf(current);
      const removeWrapper =
        wrapper &&
        (wrapper.tagName === 'FIGURE' ||
          ((wrapper.textContent ?? '').trim() === '' &&
            wrapper.querySelectorAll('img').length === 1));
      (removeWrapper ? wrapper : current).remove();
      deselect();
      onChange();
      return;
    }
    if (button.id === 'imgReplace') {
      replaceInput.click();
      return;
    }
    if (button.id === 'imgRotate') {
      toast('正在旋转图片…', 0);
      try {
        current.src = await rotateDataURL(current.src, getOptions().quality);
        select(current);
        onChange();
        toast('图片已旋转');
      } catch (error) {
        toast(error instanceof Error ? error.message : '图片旋转失败');
      }
      return;
    }
    if (button.id === 'imgCrop') {
      const result = await cropper.open(current.src, getOptions().quality);
      if (result) {
        current.src = result;
        select(current);
        onChange();
        toast('图片已裁剪');
      }
      return;
    }
    if (button.id === 'imgAlt' || button.id === 'imgCaption') {
      const existingFigure = current.closest('figure');
      const existingCaption = existingFigure?.querySelector<HTMLElement>('figcaption') ?? null;
      const result = await metadataDialog.open(
        {
          alt: current.alt,
          caption: existingCaption?.textContent ?? '',
        },
        button.id === 'imgAlt' ? 'alt' : 'caption',
      );
      if (result) {
        current.alt = result.alt;
        if (result.caption) {
          const figure = ensureFigure(current);
          const caption = existingCaption ?? document.createElement('figcaption');
          caption.textContent = result.caption;
          caption.style.cssText = 'margin-top:8px;color:#8a8f98;font-size:13px;line-height:1.6;text-align:center;';
          if (!caption.parentElement) figure.appendChild(caption);
        } else {
          existingCaption?.remove();
        }
        select(current);
        onChange();
        toast('图片信息已保存');
      }
      return;
    }
    if (button.id === 'imgUp' || button.id === 'imgDown') {
      const movable = movableOf(current);
      const sibling =
        button.id === 'imgUp' ? movable.previousElementSibling : movable.nextElementSibling;
      if (!sibling) {
        toast(button.id === 'imgUp' ? '图片已经在当前层级最前面' : '图片已经在当前层级最后面');
        return;
      }
      if (button.id === 'imgUp') sibling.before(movable);
      else sibling.after(movable);
      select(current);
      position();
      onChange();
      toast(button.id === 'imgUp' ? '图片已上移' : '图片已下移');
      return;
    }
    if (button.dataset.a) {
      const wrapper = wrapperOf(current);
      if (wrapper) wrapper.style.textAlign = button.dataset.a;
      position();
      onChange();
      return;
    }
    if ('w' in button.dataset) {
      current.style.width = button.dataset.w || '';
      position();
      onChange();
    }
  });

  replaceInput.addEventListener('change', () => {
    const file = replaceInput.files?.[0];
    replaceInput.value = '';
    if (file) void replaceSelected(file);
  });

  editor.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'IMG') select(target as HTMLImageElement);
    else deselect();
  });

  document.addEventListener('click', (event) => {
    const target = event.target as Node;
    if (selected && !editor.contains(target) && !bar.contains(target) && target !== replaceInput) {
      deselect();
    }
  });

  document.addEventListener('keydown', (event) => {
    const tag = document.activeElement?.tagName ?? '';
    if (selected && (event.key === 'Backspace' || event.key === 'Delete') && !/^(INPUT|TEXTAREA)$/.test(tag)) {
      event.preventDefault();
      delBtn.click();
    }
  });

  function clearDropTarget(): void {
    dropTarget?.classList.remove('image-drop-target');
    dropTarget = null;
  }

  editor.addEventListener('dragstart', (event) => {
    const target = event.target as HTMLElement;
    if (target.tagName !== 'IMG') return;
    const image = target as HTMLImageElement;
    dragged = movableOf(image);
    select(image);
    event.dataTransfer?.setData('text/x-composer-image', image.src.slice(0, 80));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    dragged.classList.add('image-dragging');
  });

  editor.addEventListener('dragover', (event) => {
    if (!dragged) return;
    event.preventDefault();
    const target = (event.target as HTMLElement).closest<HTMLElement>(
      'p,figure,h1,h2,h3,h4,blockquote,ul,ol,table,section,div',
    );
    clearDropTarget();
    if (target && target !== dragged && target !== editor && editor.contains(target)) {
      dropTarget = target;
      dropTarget.classList.add('image-drop-target');
    }
  });

  editor.addEventListener('drop', (event) => {
    if (!dragged) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (dropTarget && dropTarget !== dragged) {
      const rect = dropTarget.getBoundingClientRect();
      const after = event.clientY > rect.top + rect.height / 2;
      dropTarget.insertAdjacentElement(after ? 'afterend' : 'beforebegin', dragged);
      onChange();
      toast('图片位置已调整');
    }
    dragged.classList.remove('image-dragging');
    dragged = null;
    clearDropTarget();
  });

  editor.addEventListener('dragend', () => {
    dragged?.classList.remove('image-dragging');
    dragged = null;
    clearDropTarget();
  });

  return { deselect };
}
