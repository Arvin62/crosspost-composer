/**
 * WYSIWYG 编辑命令。
 * 基于 document.execCommand —— 虽已标记 deprecated，但仍是 contenteditable
 * 富文本编辑跨浏览器最稳的方案，且对本工具「导出内联样式 HTML」的诉求最直接。
 */

function run(command: string, value?: string): void {
  document.execCommand(command, false, value);
}

export const commands = {
  bold: () => run('bold'),
  italic: () => run('italic'),
  /** 设定块级标签：p / h2 / h3 / blockquote 等。 */
  block: (tag: string) => run('formatBlock', tag),
  orderedList: () => run('insertOrderedList'),
  unorderedList: () => run('insertUnorderedList'),
  horizontalRule: () => run('insertHorizontalRule'),
  link: (url: string) => run('createLink', url),
  /** 清除行内格式并把块恢复为普通段落。 */
  clearFormat: () => {
    run('removeFormat');
    run('unlink');
    run('formatBlock', 'p');
  },
  undo: () => run('undo'),
  redo: () => run('redo'),
};
