import { toast } from './toast';

export type ImportFormat = 'html' | 'markdown';

export interface ImportOptions {
  saveExternalImages: boolean;
}

/**
 * 导入弹窗：支持「选择本地文件（HTML / Markdown）」与「粘贴源码」两种方式。
 * 粘贴时按单选项决定格式；选文件时按扩展名自动判断。
 * 实际导入逻辑（确认覆盖、转换、清洗、写入）由 onImport 回调负责；
 * 回调返回 true 表示已导入，弹窗随之关闭。
 */
export function initImportDialog(
  onImport: (
    src: string,
    format: ImportFormat,
    options: ImportOptions,
  ) => boolean | Promise<boolean>,
): { open(): void } {
  const dlg = document.querySelector<HTMLDialogElement>('#importDlg')!;
  const srcEl = document.querySelector<HTMLTextAreaElement>('#importSrc')!;
  const htmlInput = document.querySelector<HTMLInputElement>('#htmlInput')!;
  const saveExternalImages = document.querySelector<HTMLInputElement>('#saveExternalImages')!;
  let busy = false;
  async function load(src: string, format: ImportFormat): Promise<void> {
    if (busy) return;
    busy = true;
    const buttons = [...dlg.querySelectorAll<HTMLButtonElement>('button')];
    buttons.forEach((button) => { button.disabled = true; });
    try {
      if (await onImport(src, format, { saveExternalImages: saveExternalImages.checked }) && dlg.open) dlg.close();
    } catch { toast('导入失败，请重试'); }
    finally { busy = false; buttons.forEach((button) => { button.disabled = false; }); }
  }

  const pastedFormat = (): ImportFormat =>
    dlg.querySelector<HTMLInputElement>('input[name="fmt"]:checked')?.value === 'markdown'
      ? 'markdown'
      : 'html';

  document.querySelector<HTMLButtonElement>('#dlgCancel')!.addEventListener('click', () => dlg.close());

  document.querySelector<HTMLButtonElement>('#dlgLoad')!.addEventListener('click', async () => {
    const v = srcEl.value.trim();
    if (!v) {
      toast('先粘贴内容，或点上面的按钮选文件');
      return;
    }
    await load(v, pastedFormat());
  });

  document.querySelector<HTMLButtonElement>('#dlgFile')!.addEventListener('click', () => htmlInput.click());

  htmlInput.addEventListener('change', async () => {
    const f = htmlInput.files?.[0];
    htmlInput.value = '';
    if (!f) return;
    const format: ImportFormat = /\.(md|markdown)$/i.test(f.name) ? 'markdown' : 'html';
    await load(await f.text(), format);
  });

  return {
    open() {
      srcEl.value = '';
      saveExternalImages.checked = false;
      dlg.showModal();
      srcEl.focus();
    },
  };
}
