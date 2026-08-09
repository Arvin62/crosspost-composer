import {
  listDocuments,
  listSnapshots,
  type ComposerDocument,
  type DocumentSnapshot,
} from '../core/documents';
import { toast } from './toast';

export interface DocumentManagerActions {
  getActive(): ComposerDocument;
  open(doc: ComposerDocument): Promise<void>;
  create(): Promise<ComposerDocument>;
  duplicate(): Promise<ComposerDocument>;
  remove(): Promise<ComposerDocument>;
  rename(title: string): Promise<void>;
  snapshot(): Promise<boolean>;
  restore(snapshot: DocumentSnapshot): Promise<void>;
}

export interface DocumentManager {
  open(): Promise<void>;
  refresh(): Promise<void>;
  updateActiveLabel(): void;
}

function formatDate(time: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(time);
}

function snapshotLabel(snapshot: DocumentSnapshot): string {
  if (snapshot.kind === 'manual') return '手动版本';
  if (snapshot.kind === 'before-import') return '导入前';
  if (snapshot.kind === 'before-restore') return '恢复前';
  if (snapshot.kind === 'before-clear') return '清空前';
  return '自动版本';
}

export function initDocumentManager(actions: DocumentManagerActions): DocumentManager {
  const dlg = document.querySelector<HTMLDialogElement>('#documentsDlg')!;
  const listEl = document.querySelector<HTMLElement>('#documentList')!;
  const historyEl = document.querySelector<HTMLElement>('#historyList')!;
  const searchEl = document.querySelector<HTMLInputElement>('#documentSearch')!;
  const titleEl = document.querySelector<HTMLInputElement>('#documentTitle')!;
  const activeLabel = document.querySelector<HTMLElement>('#currentDocName')!;

  async function renderDocuments(): Promise<void> {
    const query = searchEl.value.trim().toLowerCase();
    const active = actions.getActive();
    const documents = (await listDocuments()).filter(
      (doc) => !query || doc.title.toLowerCase().includes(query),
    );
    listEl.replaceChildren();

    if (!documents.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = '没有匹配的文档';
      listEl.appendChild(empty);
      return;
    }

    for (const doc of documents) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'document-item';
      if (doc.id === active.id) button.classList.add('active');

      const title = document.createElement('strong');
      title.textContent = doc.title;
      const meta = document.createElement('span');
      meta.textContent = `${formatDate(doc.updatedAt)} · ${doc.html.replace(/<[^>]*>/g, '').length} 字`;
      button.append(title, meta);
      button.addEventListener('click', async () => {
        if (doc.id === actions.getActive().id) return;
        await actions.open(doc);
        updateActiveLabel();
        titleEl.value = actions.getActive().title;
        await Promise.all([renderDocuments(), renderHistory()]);
      });
      listEl.appendChild(button);
    }
  }

  async function renderHistory(): Promise<void> {
    const snapshots = await listSnapshots(actions.getActive().id);
    historyEl.replaceChildren();
    if (!snapshots.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = '编辑一段时间后会自动生成版本，也可以手动保存版本。';
      historyEl.appendChild(empty);
      return;
    }

    for (const snapshot of snapshots) {
      const row = document.createElement('div');
      row.className = 'history-item';
      const info = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = snapshotLabel(snapshot);
      const time = document.createElement('span');
      time.textContent = formatDate(snapshot.createdAt);
      info.append(name, time);

      const restore = document.createElement('button');
      restore.type = 'button';
      restore.textContent = '恢复';
      restore.addEventListener('click', async () => {
        if (!confirm(`恢复到 ${formatDate(snapshot.createdAt)} 的版本？当前内容会先自动留一份“恢复前”版本。`)) {
          return;
        }
        await actions.restore(snapshot);
        titleEl.value = actions.getActive().title;
        updateActiveLabel();
        await Promise.all([renderDocuments(), renderHistory()]);
        toast('历史版本已恢复');
      });
      row.append(info, restore);
      historyEl.appendChild(row);
    }
  }

  async function refresh(): Promise<void> {
    titleEl.value = actions.getActive().title;
    updateActiveLabel();
    await Promise.all([renderDocuments(), renderHistory()]);
  }

  function updateActiveLabel(): void {
    const title = actions.getActive().title;
    activeLabel.textContent = title;
    activeLabel.title = `当前文档：${title}`;
  }

  document.querySelector<HTMLButtonElement>('#documentsClose')!.addEventListener('click', () => dlg.close());
  document.querySelector<HTMLButtonElement>('#documentNew')!.addEventListener('click', async () => {
    await actions.create();
    await refresh();
    titleEl.focus();
    titleEl.select();
    toast('已新建文档');
  });
  document.querySelector<HTMLButtonElement>('#documentDuplicate')!.addEventListener('click', async () => {
    await actions.duplicate();
    await refresh();
    toast('已创建文档副本');
  });
  document.querySelector<HTMLButtonElement>('#documentDelete')!.addEventListener('click', async () => {
    if (!confirm(`确定删除“${actions.getActive().title}”？历史版本也会一起删除。`)) return;
    await actions.remove();
    await refresh();
    toast('文档已删除');
  });
  document.querySelector<HTMLButtonElement>('#documentSnapshot')!.addEventListener('click', async () => {
    const created = await actions.snapshot();
    await renderHistory();
    toast(created ? '已保存手动版本' : '内容没有变化，无需重复保存版本');
  });

  async function rename(): Promise<void> {
    const next = titleEl.value.trim();
    if (!next) {
      titleEl.value = actions.getActive().title;
      return;
    }
    if (next === actions.getActive().title) return;
    await actions.rename(next);
    updateActiveLabel();
    await renderDocuments();
    toast('文档标题已更新');
  }

  titleEl.addEventListener('change', () => void rename());
  titleEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void rename().then(() => titleEl.blur());
    }
  });
  searchEl.addEventListener('input', () => void renderDocuments());

  return {
    async open() {
      searchEl.value = '';
      await refresh();
      dlg.showModal();
    },
    refresh,
    updateActiveLabel,
  };
}
