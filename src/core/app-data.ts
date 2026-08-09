import { htmlToBody } from './sanitize';
import { openComposerDB, STORES, transactionDone } from './database';
import {
  getActiveDocumentId,
  listDocuments,
  listSnapshots,
  type ComposerDocument,
  type DocumentSnapshot,
  type SnapshotKind,
} from './documents';
import { DEFAULT_IMAGE_OPTIONS, type ImageOptions } from './image';
import { APP_VERSION, BACKUP_FORMAT, BACKUP_VERSION } from './app-info';

export interface AppBackup {
  format: typeof BACKUP_FORMAT;
  backupVersion: typeof BACKUP_VERSION;
  appVersion: string;
  exportedAt: string;
  activeDocumentId: string;
  themeId: string;
  settings: ImageOptions;
  documents: ComposerDocument[];
  snapshots: DocumentSnapshot[];
}

const LOCAL_KEYS = [
  'active-document-id',
  'document-fallback',
  'draft',
  'draft-fallback-active',
  'settings',
  'theme',
] as const;

const SNAPSHOT_KINDS = new Set<SnapshotKind>([
  'auto',
  'manual',
  'before-import',
  'before-restore',
  'before-clear',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown, field: string, maxLength = 200): string {
  if (typeof value !== 'string') throw new Error(`备份中的 ${field} 格式不正确`);
  return value.slice(0, maxLength);
}

function timestamp(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`备份中的 ${field} 格式不正确`);
  }
  return value;
}

function normalizeSettings(value: unknown): ImageOptions {
  if (!isRecord(value)) return { ...DEFAULT_IMAGE_OPTIONS };
  const maxWidth = Number(value.maxWidth);
  const quality = Number(value.quality);
  return {
    maxWidth:
      Number.isFinite(maxWidth) && maxWidth >= 200 && maxWidth <= 4096
        ? Math.round(maxWidth)
        : DEFAULT_IMAGE_OPTIONS.maxWidth,
    quality:
      Number.isFinite(quality) && quality >= 0.4 && quality <= 1
        ? quality
        : DEFAULT_IMAGE_OPTIONS.quality,
  };
}

function normalizeDocument(value: unknown): ComposerDocument {
  if (!isRecord(value)) throw new Error('备份中包含无效文档');
  return {
    id: text(value.id, '文档 ID', 180),
    title: text(value.title, '文档标题', 100) || '未命名文章',
    html: htmlToBody(text(value.html, '文档内容', Number.MAX_SAFE_INTEGER)),
    themeId: text(value.themeId, '文档主题', 80) || 'minimal',
    createdAt: timestamp(value.createdAt, '文档创建时间'),
    updatedAt: timestamp(value.updatedAt, '文档更新时间'),
  };
}

function normalizeSnapshot(value: unknown, documentIds: Set<string>): DocumentSnapshot {
  if (!isRecord(value)) throw new Error('备份中包含无效历史版本');
  const kind = text(value.kind, '历史版本类型', 40) as SnapshotKind;
  const documentId = text(value.documentId, '历史版本文档 ID', 180);
  if (!SNAPSHOT_KINDS.has(kind) || !documentIds.has(documentId)) {
    throw new Error('备份中的历史版本无法对应到文档');
  }
  return {
    id: text(value.id, '历史版本 ID', 180),
    documentId,
    title: text(value.title, '历史版本标题', 100) || '未命名文章',
    html: htmlToBody(text(value.html, '历史版本内容', Number.MAX_SAFE_INTEGER)),
    themeId: text(value.themeId, '历史版本主题', 80) || 'minimal',
    kind,
    createdAt: timestamp(value.createdAt, '历史版本创建时间'),
  };
}

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readSettings(): ImageOptions {
  try {
    return normalizeSettings(JSON.parse(readLocal('settings') || '{}'));
  } catch {
    return { ...DEFAULT_IMAGE_OPTIONS };
  }
}

/** 导出当前浏览器中的全部文档、历史版本和设置。 */
export async function createAppBackup(): Promise<AppBackup> {
  const documents = await listDocuments();
  const snapshots = (
    await Promise.all(documents.map((document) => listSnapshots(document.id)))
  ).flat();
  const activeDocumentId = getActiveDocumentId();
  return {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    activeDocumentId:
      activeDocumentId && documents.some((document) => document.id === activeDocumentId)
        ? activeDocumentId
        : documents[0]?.id ?? '',
    themeId: readLocal('theme') || 'minimal',
    settings: readSettings(),
    documents,
    snapshots,
  };
}

/** 校验并整体替换本机应用数据。数据库更新在同一个事务中完成。 */
export async function restoreAppBackup(value: unknown): Promise<AppBackup> {
  if (!isRecord(value) || value.format !== BACKUP_FORMAT || value.backupVersion !== BACKUP_VERSION) {
    throw new Error('这不是可识别的图文排版台备份文件');
  }
  if (!Array.isArray(value.documents) || !value.documents.length) {
    throw new Error('备份中没有可恢复的文档');
  }

  const documentsById = new Map<string, ComposerDocument>();
  for (const raw of value.documents) {
    const document = normalizeDocument(raw);
    if (!document.id) throw new Error('备份中包含空的文档 ID');
    documentsById.set(document.id, document);
  }
  const documents = [...documentsById.values()];
  const documentIds = new Set(documentsById.keys());
  const snapshotsById = new Map<string, DocumentSnapshot>();
  for (const raw of Array.isArray(value.snapshots) ? value.snapshots : []) {
    const snapshot = normalizeSnapshot(raw, documentIds);
    if (snapshot.id) snapshotsById.set(snapshot.id, snapshot);
  }
  const snapshots = [...snapshotsById.values()];
  const requestedActiveId = typeof value.activeDocumentId === 'string' ? value.activeDocumentId : '';
  const activeDocumentId = documentIds.has(requestedActiveId) ? requestedActiveId : documents[0]!.id;
  const settings = normalizeSettings(value.settings);
  const themeId = typeof value.themeId === 'string' && value.themeId ? value.themeId.slice(0, 80) : 'minimal';

  const db = await openComposerDB();
  const tx = db.transaction([STORES.drafts, STORES.documents, STORES.snapshots], 'readwrite');
  const done = transactionDone(tx);
  tx.objectStore(STORES.drafts).clear();
  tx.objectStore(STORES.documents).clear();
  tx.objectStore(STORES.snapshots).clear();
  for (const document of documents) tx.objectStore(STORES.documents).put(document);
  for (const snapshot of snapshots) tx.objectStore(STORES.snapshots).put(snapshot);
  await done;

  try {
    for (const key of LOCAL_KEYS) localStorage.removeItem(key);
    localStorage.setItem('active-document-id', activeDocumentId);
    localStorage.setItem('theme', themeId);
    localStorage.setItem('settings', JSON.stringify(settings));
  } catch {
    /* 主数据已原子恢复；重新载入时会选择第一篇文档和默认设置 */
  }

  return {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    appVersion: typeof value.appVersion === 'string' ? value.appVersion : '未知',
    exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : '',
    activeDocumentId,
    themeId,
    settings,
    documents,
    snapshots,
  };
}

/** 清除该站点中属于本应用的文档、历史版本和设置。 */
export async function clearAppData(): Promise<void> {
  const db = await openComposerDB();
  const tx = db.transaction([STORES.drafts, STORES.documents, STORES.snapshots], 'readwrite');
  const done = transactionDone(tx);
  tx.objectStore(STORES.drafts).clear();
  tx.objectStore(STORES.documents).clear();
  tx.objectStore(STORES.snapshots).clear();
  await done;
  try {
    for (const key of LOCAL_KEYS) localStorage.removeItem(key);
  } catch {
    /* IndexedDB 主数据已清除 */
  }
}

/** 读取数据库中的对象数，供数据管理界面展示。 */
export async function countAppData(): Promise<{ documents: number; snapshots: number }> {
  const documents = await listDocuments();
  const snapshots = (
    await Promise.all(documents.map((document) => listSnapshots(document.id)))
  ).reduce((total, items) => total + items.length, 0);
  return { documents: documents.length, snapshots };
}
