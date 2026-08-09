import { cropDataURL, type CropRect } from '../core/image';
import { toast } from './toast';

export interface ImageCropper {
  open(source: string, quality: number): Promise<string | null>;
}

interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function initImageCropper(): ImageCropper {
  const dlg = document.querySelector<HTMLDialogElement>('#cropDlg')!;
  const canvas = document.querySelector<HTMLCanvasElement>('#cropCanvas')!;
  const ctx = canvas.getContext('2d')!;
  const applyButton = document.querySelector<HTMLButtonElement>('#cropApply')!;
  const resetButton = document.querySelector<HTMLButtonElement>('#cropReset')!;
  const cancelButton = document.querySelector<HTMLButtonElement>('#cropCancel')!;
  let image: HTMLImageElement | null = null;
  let selection: Selection = { x: 0, y: 0, width: 1, height: 1 };
  let start: { x: number; y: number } | null = null;
  let resolver: ((value: string | null) => void) | null = null;
  let source = '';
  let quality = 0.85;

  function resetSelection(): void {
    selection = {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    };
    draw();
  }

  function draw(): void {
    if (!image) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(0, 0, canvas.width, selection.y);
    ctx.fillRect(0, selection.y, selection.x, selection.height);
    ctx.fillRect(
      selection.x + selection.width,
      selection.y,
      canvas.width - selection.x - selection.width,
      selection.height,
    );
    ctx.fillRect(
      0,
      selection.y + selection.height,
      canvas.width,
      canvas.height - selection.y - selection.height,
    );
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
    ctx.setLineDash([]);
  }

  function point(event: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(canvas.width, ((event.clientX - rect.left) / rect.width) * canvas.width)),
      y: Math.max(0, Math.min(canvas.height, ((event.clientY - rect.top) / rect.height) * canvas.height)),
    };
  }

  canvas.addEventListener('pointerdown', (event) => {
    start = point(event);
    selection = { x: start.x, y: start.y, width: 1, height: 1 };
    canvas.setPointerCapture(event.pointerId);
    draw();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!start) return;
    const current = point(event);
    selection = {
      x: Math.min(start.x, current.x),
      y: Math.min(start.y, current.y),
      width: Math.max(1, Math.abs(current.x - start.x)),
      height: Math.max(1, Math.abs(current.y - start.y)),
    };
    draw();
  });
  canvas.addEventListener('pointerup', () => {
    start = null;
  });
  canvas.addEventListener('pointercancel', () => {
    start = null;
  });

  function finish(value: string | null): void {
    if (dlg.open) dlg.close();
    const resolve = resolver;
    resolver = null;
    resolve?.(value);
  }

  resetButton.addEventListener('click', resetSelection);
  cancelButton.addEventListener('click', () => finish(null));
  dlg.addEventListener('cancel', (event) => {
    event.preventDefault();
    finish(null);
  });
  applyButton.addEventListener('click', async () => {
    if (!image || selection.width < 4 || selection.height < 4) {
      toast('请拖动鼠标框选需要保留的区域');
      return;
    }
    applyButton.disabled = true;
    try {
      const scaleX = image.naturalWidth / canvas.width;
      const scaleY = image.naturalHeight / canvas.height;
      const crop: CropRect = {
        x: selection.x * scaleX,
        y: selection.y * scaleY,
        width: selection.width * scaleX,
        height: selection.height * scaleY,
      };
      finish(await cropDataURL(source, crop, quality));
    } catch (error) {
      toast(error instanceof Error ? error.message : '图片裁剪失败');
    } finally {
      applyButton.disabled = false;
    }
  });

  return {
    open(nextSource, nextQuality) {
      if (resolver) resolver(null);
      source = nextSource;
      quality = nextQuality;
      return new Promise((resolve) => {
        resolver = resolve;
        const nextImage = new Image();
        if (/^https?:\/\//i.test(source)) nextImage.crossOrigin = 'anonymous';
        nextImage.onload = () => {
          image = nextImage;
          const maxWidth = 680;
          const maxHeight = 420;
          const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight, 1);
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          resetSelection();
          dlg.showModal();
        };
        nextImage.onerror = () => {
          resolver = null;
          resolve(null);
          toast('外链图片不允许跨域裁剪，请先替换为本地图片');
        };
        nextImage.src = source;
      });
    },
  };
}
