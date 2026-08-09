/**
 * 把编辑区内容导出为干净的 HTML 字符串：
 * 去掉工具内部的临时标记（选中高亮、欢迎引导），只保留文章本身。
 */
export function exportHTML(editor: HTMLElement): string {
  const clone = editor.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[data-sel]').forEach((el) => el.removeAttribute('data-sel'));
  clone.querySelectorAll('[data-welcome]').forEach((el) => el.remove());
  clone.querySelectorAll<HTMLElement>('[draggable]').forEach((el) => el.removeAttribute('draggable'));
  clone.querySelectorAll<HTMLElement>('.image-dragging,.image-drop-target,.outline-flash').forEach((el) => {
    el.classList.remove('image-dragging', 'image-drop-target', 'outline-flash');
    if (!el.className) el.removeAttribute('class');
  });
  return clone.innerHTML.trim();
}
