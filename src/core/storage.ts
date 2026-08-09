/**
 * 草稿自动保存：优先 IndexedDB（能装下含 base64 图片的大文档），
 * 失败时退回 localStorage。所有数据只留在本机浏览器。
 */

import { openComposerDB, requestResult, STORES, transactionDone } from './database';

const KEY = 'current';
const LS_KEY = 'draft';
const LS_ACTIVE_KEY = 'draft-fallback-active';

async function idbSet(value: string): Promise<void> {
  const db = await openComposerDB();
  const tx = db.transaction(STORES.drafts, 'readwrite');
  const done = transactionDone(tx);
  tx.objectStore(STORES.drafts).put(value, KEY);
  await done;
}

async function idbGet(): Promise<string | undefined> {
  const db = await openComposerDB();
  return requestResult(
    db.transaction(STORES.drafts, 'readonly').objectStore(STORES.drafts).get(KEY),
  ) as Promise<string | undefined>;
}

/** 保存草稿并明确返回是否成功，供界面显示可信的保存状态。 */
export async function saveDraft(html: string): Promise<boolean> {
  try {
    await idbSet(html);
    try {
      localStorage.removeItem(LS_ACTIVE_KEY);
      localStorage.removeItem(LS_KEY);
    } catch {
      /* IndexedDB 已保存成功，清理旧回退副本失败不影响结果 */
    }
    return true;
  } catch {
    try {
      localStorage.setItem(LS_KEY, html);
      localStorage.setItem(LS_ACTIVE_KEY, '1');
      return true;
    } catch {
      return false;
    }
  }
}

export async function loadDraft(): Promise<string | null> {
  try {
    if (localStorage.getItem(LS_ACTIVE_KEY) === '1') {
      const fallback = localStorage.getItem(LS_KEY);
      if (fallback != null) return fallback;
    }
  } catch {
    /* localStorage 不可用时继续尝试 IndexedDB */
  }

  let html: string | null = null;
  try {
    html = (await idbGet()) ?? null;
  } catch {
    html = null;
  }
  if (html == null) {
    try {
      html = localStorage.getItem(LS_KEY);
    } catch {
      html = null;
    }
  }
  return html;
}

export async function clearDraft(): Promise<void> {
  try {
    await idbSet('');
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(LS_ACTIVE_KEY);
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}
