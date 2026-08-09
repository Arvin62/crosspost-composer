import {
  clearAppData,
  countAppData,
  createAppBackup,
  restoreAppBackup,
  type AppBackup,
} from '../core/app-data';
import { APP_NAME, APP_RELEASE } from '../core/app-info';
import { formatBytes } from '../core/bytes';
import { toast } from './toast';

export interface HelpDataDialog {
  open(): void;
}

interface HelpDataOptions {
  beforeBackup(): Promise<boolean>;
}

function backupFilename(prefix = 'crosspost-composer-backup'): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.json`;
}

function downloadBackup(backup: AppBackup, filename: string): void {
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function initHelpDataDialog(options: HelpDataOptions): HelpDataDialog {
  const dlg = document.querySelector<HTMLDialogElement>('#helpDataDlg')!;
  const importInput = document.querySelector<HTMLInputElement>('#backupInput')!;
  const summary = document.querySelector<HTMLElement>('#localDataSummary')!;
  const version = document.querySelector<HTMLElement>('#appVersion')!;
  const exportButton = document.querySelector<HTMLButtonElement>('#backupExport')!;
  const importButton = document.querySelector<HTMLButtonElement>('#backupImport')!;
  const clearButton = document.querySelector<HTMLButtonElement>('#localDataClear')!;
  const actionButtons = [exportButton, importButton, clearButton];
  version.textContent = `${APP_NAME} ${APP_RELEASE}`;

  function setBusy(busy: boolean): void {
    for (const button of actionButtons) button.disabled = busy;
  }

  async function refreshSummary(): Promise<void> {
    try {
      const counts = await countAppData();
      const estimate = await navigator.storage?.estimate?.();
      const usage = estimate?.usage ? ` · 站点存储 ${formatBytes(estimate.usage)}` : '';
      summary.textContent = `${counts.documents} 篇文档 · ${counts.snapshots} 个历史版本${usage}`;
    } catch {
      summary.textContent = '无法读取本机数据统计';
    }
  }

  async function makeSafetyBackup(prefix?: string): Promise<AppBackup> {
    const saved = await options.beforeBackup();
    if (!saved) throw new Error('当前文档未能安全保存，请先导出当前 HTML 备份');
    const backup = await createAppBackup();
    if (!backup.documents.length) throw new Error('当前没有可备份的文档');
    downloadBackup(backup, backupFilename(prefix));
    return backup;
  }

  document.querySelector<HTMLButtonElement>('#helpDataClose')!.addEventListener('click', () => dlg.close());

  exportButton.addEventListener('click', async () => {
    setBusy(true);
    try {
      const backup = await makeSafetyBackup();
      toast(`已备份 ${backup.documents.length} 篇文档和 ${backup.snapshots.length} 个历史版本`);
    } catch (error) {
      toast(error instanceof Error ? error.message : '备份失败', 5000);
    } finally {
      setBusy(false);
    }
  });

  importButton.addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    importInput.value = '';
    if (!file) return;
    if (!confirm('恢复备份会替换当前浏览器里的全部文档和历史版本。工具会先自动下载一份当前数据，继续？')) return;

    setBusy(true);
    toast('正在校验备份…', 0);
    try {
      await makeSafetyBackup('before-restore');
      const restored = await restoreAppBackup(JSON.parse(await file.text()) as unknown);
      toast(`已恢复 ${restored.documents.length} 篇文档，正在重新载入…`, 0);
      window.setTimeout(() => location.reload(), 500);
    } catch (error) {
      toast(error instanceof Error ? error.message : '恢复失败，未替换当前数据', 6000);
      setBusy(false);
    }
  });

  clearButton.addEventListener('click', async () => {
    if (!confirm('确定清除当前浏览器里的所有文档、历史版本和设置？工具会先自动下载备份。')) return;
    setBusy(true);
    try {
      await makeSafetyBackup('before-clear-all');
      await clearAppData();
      toast('本机数据已清除，正在重新载入…', 0);
      window.setTimeout(() => location.reload(), 500);
    } catch (error) {
      toast(error instanceof Error ? error.message : '清除失败', 6000);
      setBusy(false);
    }
  });

  return {
    open() {
      void refreshSummary();
      dlg.showModal();
    },
  };
}
