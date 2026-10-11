/** Prefer raw HTML source over the syntax-highlighted HTML of a code block. */
export function clipboardArticle(html: string, plain: string): string | null {
  const source = plain.trim().replace(/^```(?:html)?\s*\n([\s\S]*?)\n```$/i, '$1').trim();
  if (/^(?:<!doctype\b[^>]*>\s*)?<(?:html|body|article|section|div|p|h[1-6]|figure|img|ul|ol|table)\b[\s\S]*>/i.test(source)) {
    return source;
  }
  return html.trim() || null;
}

/** Insert at the current selection, preserving native undo where the browser supports it. */
export function isWholeEditorSelection(editor: HTMLElement): boolean {
  const selection = getSelection();
  if (!selection?.rangeCount) return false;
  const range = selection.getRangeAt(0);
  if (range.collapsed || !editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return false;
  let first: Node = editor;
  let last: Node = editor;
  while (first.firstChild) first = first.firstChild;
  while (last.lastChild) last = last.lastChild;
  const end = last.nodeType === 3 ? (last.textContent?.length ?? 0) : last.childNodes.length;
  return range.comparePoint(first, 0) === 0 && range.comparePoint(last, end) === 0;
}

export function insertPastedHTML(editor: HTMLElement, html: string): void {
  editor.focus({ preventScroll: true });
  const whole = isWholeEditorSelection(editor);
  // Chromium carries the previous heading's format across a full replacement.
  // Use a clean root range for that case; the caller saves a before-import version.
  if (!whole && typeof document.execCommand === 'function' && document.execCommand('insertHTML', false, html)) return;
  const selection = getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : document.createRange();
  if (whole) range.selectNodeContents(editor);
  if (!editor.contains(range.commonAncestorContainer)) {
    range.selectNodeContents(editor);
    range.collapse(false);
  }
  range.deleteContents();
  const fragment = range.createContextualFragment(html);
  const last = fragment.lastChild;
  range.insertNode(fragment);
  if (last) range.setStartAfter(last);
  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
}
