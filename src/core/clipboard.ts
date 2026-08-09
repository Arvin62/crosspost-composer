/**
 * 复制到剪贴板。核心诉求：把「富文本 HTML（含 base64 图片）」写进剪贴板，
 * 让各平台编辑器粘贴时能带上图片和排版。
 *
 * 首选 execCommand('copy') + 选区方案：兼容性最好，且能保留完整富文本。
 * 退化到 Clipboard API 的 ClipboardItem（需要安全上下文与页面聚焦）。
 */

/** 选中编辑区全部内容并执行复制。返回是否成功。 */
export function copyBySelection(editor: HTMLElement): boolean {
  window.focus();
  editor.focus({ preventScroll: true });
  const sel = getSelection();
  if (!sel) return false;
  const prev = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;

  const range = document.createRange();
  range.selectNodeContents(editor);
  sel.removeAllRanges();
  sel.addRange(range);

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }

  sel.removeAllRanges();
  if (prev) sel.addRange(prev);
  return ok;
}

/**
 * 兜底：把给定 HTML 放进一个离屏元素、选中并 execCommand 复制。
 * 用于 Clipboard API 不可用时，仍能把「我们自己内联好的 HTML」送进剪贴板。
 */
export function copyHTMLViaElement(html: string): boolean {
  const holder = document.createElement('div');
  holder.setAttribute('contenteditable', 'true');
  holder.style.cssText = 'position:fixed;left:-99999px;top:0;opacity:0;white-space:normal;';
  holder.innerHTML = html;
  document.body.appendChild(holder);

  const sel = getSelection();
  const prev = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
  const range = document.createRange();
  range.selectNodeContents(holder);
  sel?.removeAllRanges();
  sel?.addRange(range);

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }

  sel?.removeAllRanges();
  if (prev) sel?.addRange(prev);
  holder.remove();
  return ok;
}

/** 用 Clipboard API 写入富文本 + 纯文本两种格式。 */
export async function writeRich(html: string, plain: string): Promise<boolean> {
  if (!navigator.clipboard || !window.ClipboardItem) return false;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}

/** 写入纯文本（用于复制 HTML 源码）。带 execCommand 兜底。 */
export async function writeText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}
