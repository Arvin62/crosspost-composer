import { openComposerDB, requestResult, STORES, transactionDone } from './database';
import { loadDraft } from './storage';

export type SnapshotKind =
  | 'auto'
  | 'manual'
  | 'before-import'
  | 'before-restore'
  | 'before-clear';

export interface ComposerDocument {
  id: string;
  title: string;
  html: string;
  themeId: string;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentSnapshot {
  id: string;
  documentId: string;
  title: string;
  html: string;
  themeId: string;
  kind: SnapshotKind;
  createdAt: number;
}

const ACTIVE_ID_KEY = 'active-document-id';
const FALLBACK_KEY = 'document-fallback';
const MAX_AUTO_SNAPSHOTS = 30;
const AUTO_SNAPSHOT_INTERVAL = 5 * 60 * 1000;

function uid(prefix: string): string {
  const random = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

function localGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function localSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 调用方会通过 IndexedDB 写入结果判断是否已安全保存 */
  }
}

function fallbackDocument(): ComposerDocument | null {
  const raw = localGet(FALLBACK_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ComposerDocument;
    return parsed && typeof parsed.id === 'string' && typeof parsed.html === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function mergeFallback(documents: ComposerDocument[]): ComposerDocument[] {
  const fallback = fallbackDocument();
  if (!fallback) return documents;
  const at = documents.findIndex((doc) => doc.id === fallback.id);
  if (at < 0) return [...documents, fallback];
  if (documents[at]!.updatedAt >= fallback.updatedAt) return documents;
  const merged = [...documents];
  merged[at] = fallback;
  return merged;
}

export function inferDocumentTitle(html: string): string {
  if (!html.trim()) return '未命名文章';
  const container = document.createElement('div');
  container.innerHTML = html;
  const heading = container.querySelector('h1,h2,h3')?.textContent?.trim();
  const text = (heading || container.textContent || '').replace(/\s+/g, ' ').trim();
  if (!text) return '未命名文章';
  return text.length > 28 ? `${text.slice(0, 28)}…` : text;
}

export function makeDocument(
  html = '',
  themeId = 'minimal',
  title = inferDocumentTitle(html),
): ComposerDocument {
  const now = Date.now();
  return {
    id: uid('doc'),
    title,
    html,
    themeId,
    createdAt: now,
    updatedAt: now,
  };
}

export async function saveDocument(doc: ComposerDocument): Promise<boolean> {
  const next = { ...doc, updatedAt: Date.now() };
  try {
    const db = await openComposerDB();
    const tx = db.transaction(STORES.documents, 'readwrite');
    const done = transactionDone(tx);
    tx.objectStore(STORES.documents).put(next);
    await done;
    const fallback = fallbackDocument();
    if (fallback?.id === next.id) {
      try {
        localStorage.removeItem(FALLBACK_KEY);
      } catch {
        /* IndexedDB 已成功写入 */
      }
    }
    Object.assign(doc, next);
    return true;
  } catch {
    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(next));
      Object.assign(doc, next);
      return true;
    } catch {
      return false;
    }
  }
}

export async function getDocument(id: string): Promise<ComposerDocument | null> {
  let stored: ComposerDocument | null = null;
  try {
    const db = await openComposerDB();
    stored = (await requestResult(
      db.transaction(STORES.documents, 'readonly').objectStore(STORES.documents).get(id),
    )) as ComposerDocument | undefined ?? null;
  } catch {
    stored = null;
  }
  const fallback = fallbackDocument();
  if (fallback?.id === id && (!stored || fallback.updatedAt > stored.updatedAt)) return fallback;
  return stored;
}

export async function listDocuments(): Promise<ComposerDocument[]> {
  let documents: ComposerDocument[] = [];
  try {
    const db = await openComposerDB();
    documents = (await requestResult(
      db.transaction(STORES.documents, 'readonly').objectStore(STORES.documents).getAll(),
    )) as ComposerDocument[];
  } catch {
    documents = [];
  }
  return mergeFallback(documents).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function createDocument(doc = makeDocument()): Promise<ComposerDocument> {
  await saveDocument(doc);
  setActiveDocumentId(doc.id);
  return doc;
}

export async function duplicateDocument(source: ComposerDocument): Promise<ComposerDocument> {
  const copy = makeDocument(source.html, source.themeId, `${source.title}（副本）`);
  await saveDocument(copy);
  return copy;
}

export async function deleteDocument(id: string): Promise<void> {
  try {
    const db = await openComposerDB();
    const tx = db.transaction([STORES.documents, STORES.snapshots], 'readwrite');
    const done = transactionDone(tx);
    tx.objectStore(STORES.documents).delete(id);
    const index = tx.objectStore(STORES.snapshots).index('documentId');
    const req = index.openKeyCursor(IDBKeyRange.only(id));
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      tx.objectStore(STORES.snapshots).delete(cursor.primaryKey);
      cursor.continue();
    };
    await done;
  } finally {
    const fallback = fallbackDocument();
    if (fallback?.id === id) {
      try {
        localStorage.removeItem(FALLBACK_KEY);
      } catch {
        /* ignore */
      }
    }
  }
}

export function getActiveDocumentId(): string | null {
  return localGet(ACTIVE_ID_KEY);
}

export function setActiveDocumentId(id: string): void {
  localSet(ACTIVE_ID_KEY, id);
}

export async function initializeDocuments(themeId: string): Promise<ComposerDocument> {
  const documents = await listDocuments();
  if (!documents.length) {
    const legacy = (await loadDraft())?.trim() ?? '';
    return createDocument(makeDocument(legacy, themeId));
  }

  const activeId = getActiveDocumentId();
  const active = activeId ? documents.find((doc) => doc.id === activeId) : null;
  const selected = active ?? documents[0]!;
  setActiveDocumentId(selected.id);
  return selected;
}

export async function createSnapshot(
  doc: ComposerDocument,
  kind: SnapshotKind,
): Promise<DocumentSnapshot | null> {
  if (!doc.html.trim()) return null;
  const existing = await listSnapshots(doc.id);
  const latest = existing[0];
  if (
    latest &&
    latest.html === doc.html &&
    latest.title === doc.title &&
    latest.themeId === doc.themeId
  ) {
    return null;
  }

  const snapshot: DocumentSnapshot = {
    id: uid('snapshot'),
    documentId: doc.id,
    title: doc.title,
    html: doc.html,
    themeId: doc.themeId,
    kind,
    createdAt: Date.now(),
  };
  const db = await openComposerDB();
  const tx = db.transaction(STORES.snapshots, 'readwrite');
  const done = transactionDone(tx);
  tx.objectStore(STORES.snapshots).put(snapshot);
  await done;
  await pruneAutoSnapshots(doc.id);
  return snapshot;
}

export async function maybeCreateAutoSnapshot(doc: ComposerDocument): Promise<DocumentSnapshot | null> {
  const existing = await listSnapshots(doc.id);
  const latest = existing[0];
  if (latest && Date.now() - latest.createdAt < AUTO_SNAPSHOT_INTERVAL) return null;
  return createSnapshot(doc, 'auto');
}

export async function listSnapshots(documentId: string): Promise<DocumentSnapshot[]> {
  try {
    const db = await openComposerDB();
    const snapshots = (await requestResult(
      db
        .transaction(STORES.snapshots, 'readonly')
        .objectStore(STORES.snapshots)
        .index('documentId')
        .getAll(IDBKeyRange.only(documentId)),
    )) as DocumentSnapshot[];
    return snapshots.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

async function pruneAutoSnapshots(documentId: string): Promise<void> {
  const automatic = (await listSnapshots(documentId)).filter((item) => item.kind === 'auto');
  const remove = automatic.slice(MAX_AUTO_SNAPSHOTS);
  if (!remove.length) return;
  const db = await openComposerDB();
  const tx = db.transaction(STORES.snapshots, 'readwrite');
  const done = transactionDone(tx);
  for (const snapshot of remove) tx.objectStore(STORES.snapshots).delete(snapshot.id);
  await done;
}
