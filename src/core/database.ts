const DB_NAME = 'composer-db';
const DB_VERSION = 2;

export const STORES = {
  drafts: 'drafts',
  documents: 'documents',
  snapshots: 'snapshots',
} as const;

let openPromise: Promise<IDBDatabase> | null = null;

/** 打开应用数据库，并把 v1 的单草稿结构平滑升级为多文档结构。 */
export function openComposerDB(): Promise<IDBDatabase> {
  if (openPromise) return openPromise;

  openPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.drafts)) {
        db.createObjectStore(STORES.drafts);
      }
      if (!db.objectStoreNames.contains(STORES.documents)) {
        db.createObjectStore(STORES.documents, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.snapshots)) {
        const store = db.createObjectStore(STORES.snapshots, { keyPath: 'id' });
        store.createIndex('documentId', 'documentId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        openPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      openPromise = null;
      reject(req.error);
    };
    req.onblocked = () => {
      openPromise = null;
      reject(new Error('数据库升级被其他页面阻止，请关闭旧页面后重试'));
    };
  });

  return openPromise;
}

export function requestResult<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('数据库事务被中止'));
  });
}
