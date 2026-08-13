import { commands } from '../editor/commands';
import { initFormatPainter } from '../editor/format-painter';

/**
 * 固定在顶栏下方的排版工具栏。让 WYSIWYG 编辑区真正可编辑：
 * 标题层级、加粗斜体、列表、引用、链接、分隔线、清除格式、撤销重做。
 */
interface ToolItem {
  label: string;
  title: string;
  run: () => void;
  className?: string;
}

export function initToolbar(
  editor: HTMLElement,
  onChange: () => void,
  prepare: () => void = () => {},
  notify: (message: string, duration?: number) => void = () => {},
): void {
  const link = (): void => {
    const url = prompt('输入链接地址：', 'https://');
    if (url) commands.link(url);
  };

  const groups: ToolItem[][] = [
    [
      { label: '正文', title: '普通段落', run: () => commands.block('p') },
      { label: 'H2', title: '二级标题', run: () => commands.block('h2') },
      { label: 'H3', title: '三级标题', run: () => commands.block('h3') },
      { label: '引用', title: '引用块', run: () => commands.block('blockquote') },
    ],
    [
      { label: 'B', title: '加粗', run: commands.bold, className: 'tb-b' },
      { label: 'I', title: '斜体', run: commands.italic, className: 'tb-i' },
    ],
    [
      { label: '• 列表', title: '无序列表', run: commands.unorderedList },
      { label: '1. 编号', title: '有序列表', run: commands.orderedList },
    ],
    [
      { label: '链接', title: '插入链接', run: link },
      { label: '— 分隔线', title: '插入分隔线', run: commands.horizontalRule },
    ],
  ];

  const bar = document.createElement('div');
  bar.id = 'formatBar';

  const appendSeparator = (): void => {
    const sep = document.createElement('span');
    sep.className = 'tb-sep';
    bar.appendChild(sep);
  };

  const appendTools = (group: ToolItem[]): void => {
    for (const item of group) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = item.label;
      btn.title = item.title;
      if (item.className) btn.className = item.className;
      // 按住不让编辑区失焦，否则命令作用不到当前选区
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', () => {
        prepare();
        editor.focus();
        item.run();
        onChange();
      });
      bar.appendChild(btn);
    }
  };

  groups.forEach((group, i) => {
    if (i > 0) appendSeparator();
    appendTools(group);
  });

  appendSeparator();
  const painterButton = document.createElement('button');
  painterButton.type = 'button';
  painterButton.className = 'tb-format-painter';
  painterButton.textContent = '格式刷';
  painterButton.title = '吸取光标所在段落的格式，再点击目标段落';
  painterButton.setAttribute('aria-pressed', 'false');
  painterButton.addEventListener('mousedown', (event) => event.preventDefault());
  bar.appendChild(painterButton);
  initFormatPainter(editor, painterButton, onChange, notify);

  appendSeparator();
  appendTools([
    { label: '清除格式', title: '清除行内格式并恢复段落', run: commands.clearFormat },
    { label: '↶', title: '撤销', run: commands.undo },
    { label: '↷', title: '重做', run: commands.redo },
  ]);

  const header = document.querySelector('header');
  header?.insertAdjacentElement('afterend', bar);
}
