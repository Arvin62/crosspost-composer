import { toast } from './toast';
import { DEFAULT_IMAGE_OPTIONS } from '../core/image';
import type { ImageOptions } from '../core/image';

/** 用户设置，持久化在本机浏览器。目前即图片处理参数。 */
export type Settings = ImageOptions;

const KEY = 'settings';

function clamp(n: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

export function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<Settings>;
    return {
      maxWidth: clamp(Number(s.maxWidth), 200, 4096, DEFAULT_IMAGE_OPTIONS.maxWidth),
      quality: clamp(Number(s.quality), 0.4, 1, DEFAULT_IMAGE_OPTIONS.quality),
    };
  } catch {
    return { ...DEFAULT_IMAGE_OPTIONS };
  }
}

function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** 装配设置弹窗。apply 在保存时回调（用于把新参数写回运行时的 imageOptions）。 */
export function initSettings(apply: (s: Settings) => void): { open(): void } {
  const dlg = document.querySelector<HTMLDialogElement>('#settingsDlg')!;
  const widthEl = document.querySelector<HTMLInputElement>('#setMaxWidth')!;
  const qualityEl = document.querySelector<HTMLInputElement>('#setQuality')!;

  document.querySelector<HTMLButtonElement>('#setCancel')!.addEventListener('click', () => dlg.close());

  document.querySelector<HTMLButtonElement>('#setSave')!.addEventListener('click', () => {
    const s: Settings = {
      maxWidth: clamp(parseInt(widthEl.value, 10), 200, 4096, DEFAULT_IMAGE_OPTIONS.maxWidth),
      quality: clamp(Math.round(Number(qualityEl.value)) / 100, 0.4, 1, DEFAULT_IMAGE_OPTIONS.quality),
    };
    saveSettings(s);
    apply(s);
    dlg.close();
    toast('设置已保存');
  });

  return {
    open() {
      const s = loadSettings();
      widthEl.value = String(s.maxWidth);
      qualityEl.value = String(Math.round(s.quality * 100));
      dlg.showModal();
    },
  };
}
