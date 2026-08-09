import {
  PLATFORM_PROFILES,
  preparePlatformContent,
  type PlatformId,
  type PreparedPlatformContent,
} from '../core/platform';
import { formatBytes } from '../core/bytes';
import { copyHTMLViaElement, writeRich } from '../core/clipboard';
import type { Theme } from '../themes/types';
import { toast } from './toast';

export interface PlatformContext {
  html: string;
  theme: Theme;
}

export interface PlatformDialog {
  open(): void;
}

export function initPlatformDialog(getContext: () => PlatformContext): PlatformDialog {
  const dlg = document.querySelector<HTMLDialogElement>('#platformDlg')!;
  const cards = document.querySelector<HTMLElement>('#platformCards')!;
  const report = document.querySelector<HTMLElement>('#platformReport')!;
  const stats = document.querySelector<HTMLElement>('#platformStats')!;
  const copyButton = document.querySelector<HTMLButtonElement>('#platformCopy')!;
  let selected: PlatformId = 'wechat';
  let prepared: PreparedPlatformContent | null = null;

  function render(): void {
    const context = getContext();
    prepared = preparePlatformContent(context.html, context.theme, selected);
    const profile = PLATFORM_PROFILES.find((item) => item.id === selected)!;

    cards.querySelectorAll<HTMLButtonElement>('[data-platform]').forEach((button) => {
      button.classList.toggle('active', button.dataset.platform === selected);
    });
    stats.textContent =
      `${prepared.stats.characters} 字 · ${prepared.stats.images} 图 · ` +
      `图片 ${formatBytes(prepared.stats.imageBytes)} · HTML ${formatBytes(prepared.stats.htmlBytes)}`;
    report.replaceChildren();
    for (const issue of prepared.issues) {
      const row = document.createElement('div');
      row.className = `preflight-issue ${issue.severity}`;
      const icon = issue.severity === 'error' ? '×' : issue.severity === 'warning' ? '!' : 'i';
      const badge = document.createElement('span');
      badge.textContent = icon;
      const message = document.createElement('p');
      message.textContent = issue.message;
      row.append(badge, message);
      report.appendChild(row);
    }
    if (!prepared.issues.length) {
      const ok = document.createElement('div');
      ok.className = 'preflight-ok';
      ok.textContent = '✓ 未发现平台兼容问题，可以复制。';
      report.appendChild(ok);
    }
    copyButton.disabled = !prepared.canCopy;
    copyButton.textContent = `复制到${profile.name}`;
  }

  for (const profile of PLATFORM_PROFILES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.platform = profile.id;
    const name = document.createElement('strong');
    name.textContent = profile.name;
    const desc = document.createElement('span');
    desc.textContent = profile.description;
    button.append(name, desc);
    button.addEventListener('click', () => {
      selected = profile.id;
      render();
    });
    cards.appendChild(button);
  }

  document.querySelector<HTMLButtonElement>('#platformCancel')!.addEventListener('click', () => dlg.close());
  copyButton.addEventListener('click', async () => {
    if (!prepared?.canCopy) return;
    let copied = await writeRich(prepared.html, prepared.plainText);
    if (!copied) copied = copyHTMLViaElement(prepared.html);
    if (copied) dlg.close();
    toast(copied ? '已复制平台专用内容，可以直接粘贴' : '复制失败，请使用最新版 Chrome 重试');
  });

  return {
    open() {
      selected = 'wechat';
      render();
      dlg.showModal();
    },
  };
}
