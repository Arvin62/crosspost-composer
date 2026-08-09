import { toast } from './toast';

export type ImportFormat = 'html' | 'markdown';

/**
 * 导入弹窗：支持「选择本地文件（HTML / Markdown）」与「粘贴源码」两种方式。
 * 粘贴时按单选项决定格式；选文件时按扩展名自动判断。
 * 实际导入逻辑（确认覆盖、转换、清洗、写入）由 onImport 回调负责；
 * 回调返回 true 表示已导入，弹窗随之关闭。
 */
export function initImportDialog(
  onImport: (src: string, format: ImportFormat) => boolean | Promise<boolean>,
): { open(): void } {
  const dlg = document.querySelector<HTMLDialogElement>('#importDlg')!;
  const srcEl = document.querySelector<HTMLTextAreaElement>('#importSrc')!;
  const htmlInput = document.querySelector<HTMLInputElement>('#htmlInput')!;

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
    if ((await onImport(v, pastedFormat())) && dlg.open) dlg.close();
  });

  document.querySelector<HTMLButtonElement>('#dlgFile')!.addEventListener('click', () => htmlInput.click());

  htmlInput.addEventListener('change', async () => {
    const f = htmlInput.files?.[0];
    htmlInput.value = '';
    if (!f) return;
    const format: ImportFormat = /\.(md|markdown)$/i.test(f.name) ? 'markdown' : 'html';
    if ((await onImport(await f.text(), format)) && dlg.open) dlg.close();
  });

  return {
    open() {
      srcEl.value = '';
      dlg.showModal();
      srcEl.focus();
    },
  };
}
