import './styles/app.css';

import { Editor } from './editor/editor';
import { insertImages } from './editor/insert';
import { htmlToBody, sanitizeImportedHtml } from './core/sanitize';
import { markdownToHtml } from './core/markdown';
import { writeText } from './core/clipboard';
import { inlineStyles } from './core/inline-styles';
import { recompressDataURL, type ImageOptions } from './core/image';
import { dataUrlByteSize, formatBytes } from './core/bytes';
import { articleExportFilename } from './core/export-filename';
import {
  createDocument,
  createSnapshot,
  deleteDocument,
  duplicateDocument,
  getDocument,
  inferDocumentTitle,
  initializeDocuments,
  listDocuments,
  makeDocument,
  maybeCreateAutoSnapshot,
  saveDocument,
  setActiveDocumentId,
  type ComposerDocument,
  type DocumentSnapshot,
  type SnapshotKind,
} from './core/documents';
import { getTheme, themeToCss, DEFAULT_THEME_ID } from './themes/presets';
import { toast } from './ui/toast';
import { initToolbar } from './ui/toolbar';
import { initThemePicker } from './ui/theme-picker';
import { initImageToolbar } from './ui/image-toolbar';
import { initImageCropper } from './ui/image-cropper';
import { initImageMetadataDialog } from './ui/image-metadata';
import {
  initImportDialog,
  type ImportFormat,
  type ImportOptions,
} from './ui/import-dialog';
import { initSettings, loadSettings } from './ui/settings';
import { initDocumentManager, type DocumentManager } from './ui/document-manager';
import { initPlatformDialog } from './ui/platform-dialog';
import { initNavigator } from './ui/navigator';
import { initHelpDataDialog } from './ui/help-data';
import { WELCOME_HTML } from './ui/welcome';

const editor = new Editor(document.querySelector<HTMLElement>('#editor')!);
const statsEl = document.querySelector<HTMLElement>('#stats')!;
const saveHint = document.querySelector<HTMLElement>('#saveHint')!;
const imageOptions: ImageOptions = loadSettings();
const cropper = initImageCropper();
const imageMetadata = initImageMetadataDialog();

let activeDocument: ComposerDocument | null = null;
let documentManager: DocumentManager | null = null;
let saveTimer: number | undefined;
let navigatorTimer: number | undefined;
let saveFailureNotified = false;
const lastSnapshotChecks = new Map<string, number>();

/* ---------- 排版主题 ---------- */
const themeStyle = document.createElement('style');
document.head.appendChild(themeStyle);
let themeId = readStoredTheme();

function readStoredTheme(): string {
  try {
    return localStorage.getItem('theme') || DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

function applyTheme(id: string, markChanged = true): void {
  themeId = id;
  themeStyle.textContent = themeToCss(getTheme(id));
  try {
    localStorage.setItem('theme', id);
  } catch {
    /* ignore */
  }
  if (activeDocument && markChanged) {
    activeDocument.themeId = id;
    onChanged();
  }
}

applyTheme(themeId, false);
initToolbar(editor.el, onChanged, () => editor.prepareForEditing(), toast);
const themePicker = initThemePicker(themeId, (id) => applyTheme(id));

/* ---------- 编辑器附属工具 ---------- */
const imageBar = initImageToolbar(
  editor.el,
  onChanged,
  () => imageOptions,
  cropper,
  imageMetadata,
);
const navigatorPanel = initNavigator(editor.el, onChanged);
const importDialog = initImportDialog(importContent);
const settingsDialog = initSettings((settings) => {
  imageOptions.maxWidth = settings.maxWidth;
  imageOptions.quality = settings.quality;
});
const helpDataDialog = initHelpDataDialog({
  beforeBackup: () => persistNow(false),
});

const platformDialog = initPlatformDialog(() => ({
  html: editor.exportHTML(),
  theme: getTheme(themeId),
}));

editor.onChange = onChanged;

/* ---------- 统计与自动保存 ---------- */
function updateStats(): void {
  if (editor.hasWelcome) {
    statsEl.textContent = '';
    return;
  }
  const characters = editor.el.innerText.replace(/\s+/g, '').length;
  const images = [...editor.el.querySelectorAll<HTMLImageElement>('img')];
  const imageBytes = images.reduce(
    (total, image) => total + dataUrlByteSize(image.getAttribute('src') ?? ''),
    0,
  );
  const htmlBytes = new TextEncoder().encode(editor.el.innerHTML).length;
  statsEl.textContent =
    `${characters} 字 · ${images.length} 图 ${formatBytes(imageBytes)} · 文档 ${formatBytes(htmlBytes)}`;
}

function onChanged(): void {
  updateStats();
  window.clearTimeout(navigatorTimer);
  navigatorTimer = window.setTimeout(() => navigatorPanel.refresh(), 120);
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void persist(), 800);
}

function syncActiveDocument(): ComposerDocument | null {
  if (!activeDocument || editor.hasWelcome) return activeDocument;
  activeDocument.html = editor.exportHTML();
  activeDocument.themeId = themeId;
  if (activeDocument.title === '未命名文章' && activeDocument.html) {
    activeDocument.title = inferDocumentTitle(activeDocument.html);
    documentManager?.updateActiveLabel();
  }
  return activeDocument;
}

async function persist(createAutoVersion = true): Promise<boolean> {
  const doc = syncActiveDocument();
  if (!doc || editor.hasWelcome) return true;
  const saved = await saveDocument(doc);
  saveHint.classList.toggle('error', !saved);
  if (saved) {
    saveHint.textContent =
      '已自动保存 ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    saveFailureNotified = false;
    documentManager?.updateActiveLabel();
    const lastSnapshotCheck = lastSnapshotChecks.get(doc.id) ?? 0;
    if (createAutoVersion && Date.now() - lastSnapshotCheck > 60_000) {
      lastSnapshotChecks.set(doc.id, Date.now());
      try {
        await maybeCreateAutoSnapshot(doc);
      } catch {
        /* 正文已保存成功；历史版本失败不把正文误报为未保存 */
      }
    }
  } else {
    saveHint.textContent = '自动保存失败，请导出 HTML 备份';
    if (!saveFailureNotified) {
      toast('自动保存失败，请立即导出 HTML 文件备份', 5000);
      saveFailureNotified = true;
    }
  }
  return saved;
}

async function persistNow(createAutoVersion = true): Promise<boolean> {
  window.clearTimeout(saveTimer);
  return persist(createAutoVersion);
}

async function saveVersion(
  doc: ComposerDocument,
  kind: SnapshotKind,
  notifyFailure = false,
): Promise<DocumentSnapshot | null> {
  try {
    return await createSnapshot(doc, kind);
  } catch {
    if (notifyFailure) toast('历史版本保存失败；正文仍会继续自动保存');
    return null;
  }
}

function loadIntoEditor(doc: ComposerDocument, showWelcome = false): void {
  window.clearTimeout(saveTimer);
  activeDocument = doc;
  setActiveDocumentId(doc.id);
  applyTheme(doc.themeId || DEFAULT_THEME_ID, false);
  themePicker.set(themeId);
  editor.setHTML(doc.html || (showWelcome ? WELCOME_HTML : '<p><br></p>'));
  imageBar.deselect();
  updateStats();
  navigatorPanel.refresh();
  documentManager?.updateActiveLabel();
  saveHint.classList.remove('error');
  saveHint.textContent = doc.html
    ? `上次保存 ${new Date(doc.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
    : '';
}

/* ---------- 文档中心与历史版本 ---------- */
function currentDocument(): ComposerDocument {
  if (!activeDocument) throw new Error('文档尚未初始化');
  return activeDocument;
}

documentManager = initDocumentManager({
  getActive: currentDocument,
  async open(doc) {
    await persistNow();
    const latest = (await getDocument(doc.id)) ?? doc;
    loadIntoEditor(latest);
    toast(`已打开“${latest.title}”`);
  },
  async create() {
    await persistNow();
    const doc = await createDocument(makeDocument('', themeId));
    loadIntoEditor(doc);
    return doc;
  },
  async duplicate() {
    await persistNow();
    const copy = await duplicateDocument(currentDocument());
    loadIntoEditor(copy);
    return copy;
  },
  async remove() {
    const removing = currentDocument();
    await deleteDocument(removing.id);
    const remaining = await listDocuments();
    const next = remaining[0] ?? (await createDocument(makeDocument('', themeId)));
    loadIntoEditor(next);
    return next;
  },
  async rename(title) {
    const doc = currentDocument();
    doc.title = title;
    await saveDocument(doc);
  },
  async snapshot() {
    await persistNow(false);
    return Boolean(await saveVersion(currentDocument(), 'manual', true));
  },
  async restore(snapshot: DocumentSnapshot) {
    await persistNow(false);
    const doc = currentDocument();
    await saveVersion(doc, 'before-restore', true);
    doc.title = snapshot.title;
    doc.html = snapshot.html;
    doc.themeId = snapshot.themeId;
    await saveDocument(doc);
    loadIntoEditor(doc);
  },
});

/* ---------- 导入文章 ---------- */
async function importContent(
  src: string,
  format: ImportFormat,
  options: ImportOptions = { keepExternalImages: false },
): Promise<boolean> {
  if (!src.trim()) {
    toast('内容是空的');
    return false;
  }
  if (
    !editor.hasWelcome &&
    !editor.isEmpty &&
    !confirm('载入会替换当前内容；当前内容会先保存为“导入前”版本。继续？')
  ) {
    return false;
  }

  await persistNow(false);
  if (!editor.hasWelcome) await saveVersion(currentDocument(), 'before-import', true);
  const raw = format === 'markdown' ? markdownToHtml(src) : src;
  const imported = sanitizeImportedHtml(raw, {
    allowExternalImages: options.keepExternalImages,
  });
  editor.setHTML(imported.html);
  imageBar.deselect();
  if (currentDocument().title === '未命名文章') {
    currentDocument().title = inferDocumentTitle(editor.exportHTML());
  }
  onChanged();
  await persistNow(false);
  const { report } = imported;
  if (report.externalImagesRemoved) {
    toast(
      `文章已载入；为保护隐私，已移除 ${report.externalImagesRemoved} 张网络图片，请改用本地图片`,
      6000,
    );
  } else if (report.externalImagesKept) {
    toast(
      `文章已载入并保留 ${report.externalImagesKept} 张网络图片；图片服务器可能看到你的访问 IP`,
      6000,
    );
  } else if (report.resourceStylesRemoved) {
    toast(`文章已载入；已移除 ${report.resourceStylesRemoved} 条远程资源样式`, 5000);
  } else {
    toast(
      format === 'markdown'
        ? 'Markdown 已转换载入，可切换主题预览排版'
        : '文章已载入，把光标点到段落上就可以插图了',
    );
  }
  return true;
}

function importFileFormat(file: File): ImportFormat | null {
  if (file.type === 'text/html' || /\.html?$/i.test(file.name)) return 'html';
  if (file.type === 'text/markdown' || /\.(md|markdown)$/i.test(file.name)) return 'markdown';
  return null;
}

/* ---------- 插入与批量处理图片 ---------- */
async function doInsert(files: FileList | File[], ref: HTMLElement | null): Promise<void> {
  const list = [...files].filter((file) => file.type.startsWith('image/'));
  if (!list.length) return;
  editor.prepareForEditing();
  const reference = ref && editor.el.contains(ref) ? ref : null;
  toast(`正在处理 ${list.length} 张图片…`, 0);
  const result = await insertImages(editor.el, list, reference, imageOptions);
  onChanged();
  if (!result.count) {
    toast('图片处理失败');
  } else if (result.failed.length) {
    toast(`已插入 ${result.count} 张，${result.failed.length} 张失败已跳过`);
  } else if (result.atEnd) {
    toast('已插到文章末尾——想插到中间时，先把光标点到目标段落再插图');
  } else {
    toast(result.count > 1 ? `已插入 ${result.count} 张图片` : '图片已插入');
  }
}

async function batchCompressImages(): Promise<void> {
  const images = [...editor.el.querySelectorAll<HTMLImageElement>('img')].filter((image) =>
    (image.getAttribute('src') ?? '').startsWith('data:image/'),
  );
  if (!images.length) {
    toast('没有可压缩的内嵌图片');
    return;
  }
  if (!confirm(`按当前设置重新压缩 ${images.length} 张图片？GIF 和 SVG 会保持原样。`)) return;

  const before = images.reduce((sum, image) => sum + dataUrlByteSize(image.src), 0);
  let changed = 0;
  let failed = 0;
  toast(`正在压缩 0 / ${images.length}…`, 0);
  for (let index = 0; index < images.length; index++) {
    const image = images[index]!;
    try {
      const next = await recompressDataURL(image.src, imageOptions);
      if (next !== image.src) {
        image.src = next;
        changed++;
      }
    } catch {
      failed++;
    }
    toast(`正在压缩 ${index + 1} / ${images.length}…`, 0);
  }
  const after = images.reduce((sum, image) => sum + dataUrlByteSize(image.src), 0);
  if (changed) onChanged();
  toast(
    `批量压缩完成：${formatBytes(before)} → ${formatBytes(after)}` +
      (failed ? `，${failed} 张失败` : ''),
    5000,
  );
}

function blockFromPoint(x: number, y: number): HTMLElement | null {
  let range: Range | null = null;
  const anyDocument = document as unknown as {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };
  if (anyDocument.caretRangeFromPoint) {
    range = anyDocument.caretRangeFromPoint(x, y);
  } else if (anyDocument.caretPositionFromPoint) {
    const position = anyDocument.caretPositionFromPoint(x, y);
    if (position) {
      range = document.createRange();
      range.setStart(position.offsetNode, position.offset);
    }
  }
  return range ? editor.blockFromNode(range.startContainer) : null;
}

/* ---------- 复制与导出 ---------- */
async function copySource(): Promise<void> {
  const html = editor.exportHTML();
  if (!html) {
    toast('内容是空的');
    return;
  }
  const copied = await writeText(html);
  toast(copied ? '已复制 HTML 源码' : '复制失败');
}

function exportFile(): void {
  const html = editor.exportHTML();
  if (!html) {
    toast('内容是空的');
    return;
  }
  const inlined = inlineStyles(htmlToBody(html), getTheme(themeId));
  const title = currentDocument().title;
  const page = `<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title.replace(/[<>&"]/g, '')}</title></head>\n<body>\n${inlined}\n</body></html>`;
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(new Blob([page], { type: 'text/html' }));
  anchor.download = articleExportFilename(title);
  anchor.click();
  URL.revokeObjectURL(anchor.href);
  toast('已导出带当前主题的 HTML 文件');
}

async function clearAll(): Promise<void> {
  if (!confirm('确定清空当前文档？清空前会自动保存一份历史版本。')) return;
  await persistNow(false);
  await saveVersion(currentDocument(), 'before-clear', true);
  editor.setHTML('<p><br></p>');
  imageBar.deselect();
  onChanged();
  await persistNow(false);
  toast('当前文档已清空，可从历史版本恢复');
}

/* ---------- 顶栏与菜单 ---------- */
document.querySelector<HTMLButtonElement>('#btnDocuments')!.addEventListener('click', () => {
  if (documentManager) void documentManager.open();
});
document.querySelector<HTMLButtonElement>('#btnNavigator')!.addEventListener('click', () => navigatorPanel.toggle());
document.querySelector<HTMLButtonElement>('#btnImport')!.addEventListener('click', () => importDialog.open());
document.querySelector<HTMLButtonElement>('#btnCopy')!.addEventListener('click', () => platformDialog.open());

const fileInput = document.querySelector<HTMLInputElement>('#fileInput')!;
const btnImage = document.querySelector<HTMLButtonElement>('#btnImage')!;
btnImage.addEventListener('mousedown', (event) => event.preventDefault());
btnImage.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  if (fileInput.files) void doInsert(fileInput.files, editor.currentBlock());
  fileInput.value = '';
});

const btnMore = document.querySelector<HTMLButtonElement>('#btnMore')!;
const moreMenu = document.querySelector<HTMLElement>('#moreMenu')!;
btnMore.addEventListener('click', (event) => {
  event.stopPropagation();
  moreMenu.hidden = !moreMenu.hidden;
});
document.addEventListener('click', (event) => {
  if (!moreMenu.hidden && !moreMenu.contains(event.target as Node)) moreMenu.hidden = true;
});
moreMenu.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button) return;
  moreMenu.hidden = true;
  const action = button.dataset.act;
  if (action === 'source') void copySource();
  else if (action === 'export') exportFile();
  else if (action === 'compress') void batchCompressImages();
  else if (action === 'settings') settingsDialog.open();
  else if (action === 'help') helpDataDialog.open();
  else if (action === 'clear') void clearAll();
});

/* ---------- 拖拽 / 粘贴入口 ---------- */
editor.el.addEventListener('dragover', (event) => {
  if ([...(event.dataTransfer?.items ?? [])].some((item) => item.kind === 'file')) {
    event.preventDefault();
    editor.el.classList.add('dragging');
  }
});
editor.el.addEventListener('dragleave', () => editor.el.classList.remove('dragging'));
editor.el.addEventListener('drop', (event) => {
  editor.el.classList.remove('dragging');
  const files = event.dataTransfer?.files;
  if (!files?.length) return;
  event.preventDefault();
  const documentFile = [...files].find((file) => importFileFormat(file) !== null);
  if (documentFile) {
    const format = importFileFormat(documentFile)!;
    void documentFile.text().then((text) => importContent(text, format));
    return;
  }
  const ref = blockFromPoint(event.clientX, event.clientY) ?? editor.currentBlock();
  void doInsert(files, ref);
});
editor.el.addEventListener('paste', (event) => {
  const files = [...(event.clipboardData?.files ?? [])];
  if (files.length) {
    event.preventDefault();
    void doInsert(files, editor.currentBlock());
  }
});

/* ---------- 启动 ---------- */
async function boot(): Promise<void> {
  const doc = await initializeDocuments(themeId);
  loadIntoEditor(doc, !doc.html);
  documentManager?.updateActiveLabel();
}

void boot().catch((error) => {
  console.error(error);
  activeDocument = makeDocument('', themeId);
  loadIntoEditor(activeDocument, true);
  toast('文档数据库初始化失败，当前内容只能临时编辑，请及时导出备份', 6000);
});
