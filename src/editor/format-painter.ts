/**
 * 段落格式刷的纯 DOM 实现。
 *
 * 只复制排版信息，不复制正文、链接地址、id 或 data-* 等内容属性。
 * 行内格式取自来源段落中光标所在位置，应用时覆盖目标段落原有的
 * 加粗、斜体、颜色等行内格式，同时保留目标文字和链接。
 */

const TEXT_BLOCK_TAGS = new Set([
  'P',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'BLOCKQUOTE',
  'PRE',
  'LI',
  'FIGCAPTION',
]);

const CHANGEABLE_BLOCK_TAGS = new Set([
  'P',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'BLOCKQUOTE',
  'PRE',
]);

const INLINE_FORMAT_TAGS = new Set([
  'SPAN',
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'S',
  'STRIKE',
  'DEL',
  'FONT',
  'MARK',
  'SMALL',
  'BIG',
  'SUB',
  'SUP',
  'CODE',
]);

const BLOCK_ATTRIBUTES = ['style', 'align', 'dir'] as const;
const INLINE_ATTRIBUTES = ['style', 'color', 'face', 'size'] as const;

interface InlineFormat {
  tagName: string;
  attributes: Record<string, string>;
}

export interface ParagraphFormat {
  tagName: string;
  attributes: Record<string, string>;
  inline: InlineFormat[];
}

function asElement(node: Node | null): HTMLElement | null {
  if (!node) return null;
  return node.nodeType === 1 ? (node as HTMLElement) : node.parentElement;
}

/** 找到节点所属的最内层文字段落，避免把整篇文章的 section/div 当成目标。 */
export function findFormatBlock(editor: HTMLElement, node: Node | null): HTMLElement | null {
  let element = asElement(node);
  if (!element || element === editor || !editor.contains(element)) return null;

  for (; element && element !== editor; element = element.parentElement) {
    if (TEXT_BLOCK_TAGS.has(element.tagName)) return element;
  }
  return null;
}

function readAttributes(
  element: HTMLElement,
  names: readonly string[],
): Record<string, string> {
  const attributes: Record<string, string> = {};
  names.forEach((name) => {
    const value = element.getAttribute(name);
    if (value !== null && value !== '') attributes[name] = value;
  });
  return attributes;
}

/** 从光标位置吸取段落级格式和该位置的行内格式。 */
export function captureParagraphFormat(
  editor: HTMLElement,
  node: Node | null,
): ParagraphFormat | null {
  const block = findFormatBlock(editor, node);
  if (!block) return null;

  const inline: InlineFormat[] = [];
  for (let element = asElement(node); element && element !== block; element = element.parentElement) {
    if (!INLINE_FORMAT_TAGS.has(element.tagName)) continue;
    const attributes = readAttributes(element, INLINE_ATTRIBUTES);
    if (element.tagName !== 'SPAN' || Object.keys(attributes).length > 0) {
      inline.push({ tagName: element.tagName.toLowerCase(), attributes });
    }
  }

  return {
    tagName: block.tagName.toLowerCase(),
    attributes: readAttributes(block, BLOCK_ATTRIBUTES),
    inline: inline.reverse(),
  };
}

function setCopiedAttributes(
  element: HTMLElement,
  names: readonly string[],
  attributes: Record<string, string>,
): void {
  names.forEach((name) => {
    const value = attributes[name];
    if (value === undefined) element.removeAttribute(name);
    else element.setAttribute(name, value);
  });
}

function changeBlockTag(block: HTMLElement, tagName: string): HTMLElement {
  const sourceTag = tagName.toUpperCase();
  if (
    block.tagName === sourceTag ||
    !CHANGEABLE_BLOCK_TAGS.has(block.tagName) ||
    !CHANGEABLE_BLOCK_TAGS.has(sourceTag)
  ) {
    return block;
  }

  const replacement = block.ownerDocument.createElement(tagName);
  for (const attribute of [...block.attributes]) {
    replacement.setAttribute(attribute.name, attribute.value);
  }
  while (block.firstChild) replacement.appendChild(block.firstChild);
  block.replaceWith(replacement);
  return replacement;
}

function clearInlineFormatting(block: HTMLElement): void {
  const descendants = [...block.querySelectorAll<HTMLElement>('*')].reverse();
  descendants.forEach((element) => {
    if (INLINE_FORMAT_TAGS.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      return;
    }
    // 链接等内容结构继续保留，但旧的行内排版不应盖住新格式。
    if (element.tagName !== 'IMG') element.removeAttribute('style');
  });
}

function applyInlineFormatting(block: HTMLElement, inline: InlineFormat[]): void {
  if (!inline.length || !block.firstChild) return;

  let outer: HTMLElement | null = null;
  let inner: HTMLElement | null = null;
  for (const format of inline) {
    const wrapper = block.ownerDocument.createElement(format.tagName);
    Object.entries(format.attributes).forEach(([name, value]) => wrapper.setAttribute(name, value));
    if (inner) inner.appendChild(wrapper);
    else outer = wrapper;
    inner = wrapper;
  }

  if (!outer || !inner) return;
  while (block.firstChild) inner.appendChild(block.firstChild);
  block.appendChild(outer);
}

/** 将已吸取的格式应用到目标段落，返回实际写入 DOM 的段落节点。 */
export function applyParagraphFormat(
  editor: HTMLElement,
  node: Node | null,
  format: ParagraphFormat,
): HTMLElement | null {
  const target = findFormatBlock(editor, node);
  if (!target) return null;

  const block = changeBlockTag(target, format.tagName);
  setCopiedAttributes(block, BLOCK_ATTRIBUTES, format.attributes);
  clearInlineFormatting(block);
  applyInlineFormatting(block, format.inline);
  return block;
}

/** 将格式刷状态和单次应用交互绑定到工具栏按钮。 */
export function initFormatPainter(
  editor: HTMLElement,
  button: HTMLButtonElement,
  onChange: () => void,
  notify: (message: string, duration?: number) => void = () => {},
): void {
  let paintedFormat: ParagraphFormat | null = null;

  const cancel = (): void => {
    paintedFormat = null;
    button.classList.remove('active');
    button.setAttribute('aria-pressed', 'false');
    editor.classList.remove('format-painter-active');
  };

  button.addEventListener('click', () => {
    if (paintedFormat) {
      cancel();
      notify('已取消格式刷');
      return;
    }

    const selection = editor.ownerDocument.getSelection();
    paintedFormat = captureParagraphFormat(editor, selection?.anchorNode ?? null);
    if (!paintedFormat) {
      notify('请先把光标放在要引用格式的段落中');
      return;
    }

    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
    editor.classList.add('format-painter-active');
    notify('已吸取段落格式，请点击要应用格式的段落', 4000);
  });

  editor.addEventListener('click', (event) => {
    if (!paintedFormat) return;
    const target = event.target as Node | null;
    if (!findFormatBlock(editor, target)) {
      notify('格式刷只能应用到文字段落；按 Esc 可取消', 4000);
      return;
    }

    const applied = applyParagraphFormat(editor, target, paintedFormat);
    cancel();
    if (!applied) return;

    const range = editor.ownerDocument.createRange();
    range.selectNodeContents(applied);
    range.collapse(false);
    const selection = editor.ownerDocument.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    onChange();
    notify('段落格式已应用');
  });

  editor.ownerDocument.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !paintedFormat) return;
    cancel();
    notify('已取消格式刷');
  });
}
