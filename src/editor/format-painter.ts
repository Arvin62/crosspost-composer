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
const TEXT_BLOCK_SELECTOR = [...TEXT_BLOCK_TAGS].join(',');
const NESTED_BLOCK_SELECTOR = `${TEXT_BLOCK_SELECTOR},div,section,ul,ol,table,figure`;

// 只冻结可移植的排版样式，不复制尺寸、定位、网络背景图或编辑器交互状态。
const TEXT_STYLE_PROPERTIES = [
  'color', 'font-family', 'font-size', 'font-weight', 'font-style',
  'line-height', 'letter-spacing', 'word-spacing', 'text-transform',
] as const;
const BOX_STYLE_PROPERTIES = [
  'background-color', 'background-image', 'border-top-width', 'border-top-style', 'border-top-color',
  'border-right-width', 'border-right-style', 'border-right-color',
  'border-bottom-width', 'border-bottom-style', 'border-bottom-color',
  'border-left-width', 'border-left-style', 'border-left-color',
  'border-radius', 'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-right-radius', 'border-bottom-left-radius',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'box-shadow',
] as const;
const BLOCK_STYLE_PROPERTIES = [
  ...TEXT_STYLE_PROPERTIES, ...BOX_STYLE_PROPERTIES, 'text-align', 'text-indent',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
] as const;

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
  'DIV',
  'SECTION',
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
  computed?: Record<string, string>;
  containerBox?: { source: HTMLElement; styles: Record<string, string> };
}

function isTextBlock(element: HTMLElement): boolean {
  return TEXT_BLOCK_TAGS.has(element.tagName) || (
    (element.tagName === 'DIV' || element.tagName === 'SECTION') &&
    !element.querySelector(NESTED_BLOCK_SELECTOR) &&
    (!!element.textContent?.trim() || !!element.querySelector('br'))
  );
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
    if (isTextBlock(element)) return element;
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

function computedProperties(element: HTMLElement, properties: readonly string[]): Record<string, string> {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  const result: Record<string, string> = {};
  for (const property of properties) {
    const value = style?.getPropertyValue(property);
    // 渐变是纯排版；不把外部背景图片扩散到其它段落。
    if (property === 'background-image' && value && value !== 'none' && (
      !/^(?:repeating-)?(?:linear|radial|conic)-gradient\(/i.test(value) ||
      /(?:url|image-set)\s*\(/i.test(value)
    )) continue;
    if (value) result[property] = value;
  }
  return result;
}

/** 元素边界选区（例如选中整段）也应从实际文字取样，不能漏掉内部的加粗。 */
function sampleNode(node: Node | null, offset: number): Node | null {
  if (!node || node.nodeType !== 1) return node;
  const first = node.childNodes[offset] ?? node.lastChild;
  for (let child: ChildNode | null = first; child; child = child.nextSibling) {
    if (child.nodeType === 3 && child.textContent?.trim()) return child;
    const walker = node.ownerDocument!.createTreeWalker(child, 4 /* SHOW_TEXT */);
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      if (text.textContent?.trim()) return text;
    }
  }
  return first ?? node;
}

function visibleBox(element: HTMLElement): boolean {
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  if (!style) return false;
  const color = style.backgroundColor;
  const gradient = computedProperties(element, ['background-image'])['background-image'];
  return (!!color && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') ||
    (!!gradient && gradient !== 'none') ||
    ['top', 'right', 'bottom', 'left'].some((side) => {
      const border = style.getPropertyValue(`border-${side}-style`);
      return !!border && border !== 'none' && border !== 'hidden';
    });
}

/** 从光标位置吸取段落级格式和该位置的行内格式。 */
export function captureParagraphFormat(
  editor: HTMLElement,
  node: Node | null,
  offset = 0,
): ParagraphFormat | null {
  if (!node || !editor.contains(node)) return null;
  const sample = sampleNode(node, offset);
  const block = findFormatBlock(editor, sample);
  if (!block) return null;

  const computed = computedProperties(block, BLOCK_STYLE_PROPERTIES);
  let containerBox: ParagraphFormat['containerBox'];
  // 微信底框常放在包住 p 的 section/div 上，将最近底框的外观带到目标段落。
  if (!visibleBox(block)) {
    for (let parent = block.parentElement; parent && parent !== editor; parent = parent.parentElement) {
      if (!visibleBox(parent)) continue;
      containerBox = { source: parent, styles: computedProperties(parent, BOX_STYLE_PROPERTIES) };
      break;
    }
  }

  const inline: InlineFormat[] = [];
  for (let element = asElement(sample); element && element !== block; element = element.parentElement) {
    if (!INLINE_FORMAT_TAGS.has(element.tagName)) continue;
    const attributes = readAttributes(element, INLINE_ATTRIBUTES);
    const appearance = computedProperties(element, TEXT_STYLE_PROPERTIES);
    const style = element.ownerDocument.createElement('span').style;
    style.cssText = attributes.style ?? '';
    Object.entries(appearance).forEach(([name, value]) => style.setProperty(name, value));
    if (style.cssText) attributes.style = style.cssText;
    if (element.tagName !== 'SPAN' || Object.keys(attributes).length > 0) {
      inline.push({ tagName: element.tagName.toLowerCase(), attributes });
    }
  }

  return {
    tagName: block.tagName.toLowerCase(),
    attributes: readAttributes(block, BLOCK_ATTRIBUTES),
    inline: inline.reverse(),
    computed,
    containerBox,
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
    block.querySelector(NESTED_BLOCK_SELECTOR) ||
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
    // 外层列表项/引用可能含有独立段落，不清除这些段落自身的格式。
    if (findFormatBlock(block, element) || element.querySelector(TEXT_BLOCK_SELECTOR)) return;
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

  // 只包装当前段落的连续行内内容，不能把子列表或子段落塞进行内标签。
  const fragment = block.ownerDocument.createDocumentFragment();
  const runs: HTMLElement[] = [];
  let run: HTMLElement | null = null;
  for (const child of [...block.childNodes]) {
    const element = child.nodeType === 1 ? child as HTMLElement : null;
    if (element && (
      TEXT_BLOCK_TAGS.has(element.tagName) ||
      element.matches('ul,ol,table,figure,section,div') ||
      element.querySelector(TEXT_BLOCK_SELECTOR)
    )) {
      run = null;
      fragment.appendChild(child);
      continue;
    }
    if (!run) {
      run = block.ownerDocument.createElement('span');
      runs.push(run);
      fragment.appendChild(run);
    }
    run.appendChild(child);
  }
  for (const group of runs) {
    wrapInlineContent(group, inline);
    group.replaceWith(...group.childNodes);
  }
  block.appendChild(fragment);
}

function wrapInlineContent(block: HTMLElement, inline: InlineFormat[]): void {
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

/** 选区按实际内容命中段落；停在下一段开头时，不误刷下一段。 */
export function findFormatBlocksInRange(editor: HTMLElement, range: Range): HTMLElement[] {
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return [];
  if (range.collapsed) {
    const block = findFormatBlock(editor, range.startContainer);
    return block ? [block] : [];
  }

  const blocks = new Set<HTMLElement>();
  const walker = editor.ownerDocument.createTreeWalker(editor, 5 /* SHOW_ELEMENT | SHOW_TEXT */);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const element = node.nodeType === 1 ? node as HTMLElement : null;
    if (element && element.childNodes.length > 0) continue;
    if (node.nodeType === 3 && !node.textContent?.length) continue;
    const block = findFormatBlock(editor, node);
    if (!block) continue;
    if (node.nodeType === 3 && !node.textContent?.trim() && block.querySelector(TEXT_BLOCK_SELECTOR)) continue;

    const boundary = editor.ownerDocument.createRange();
    if (element) boundary.selectNode(element);
    else boundary.selectNodeContents(node);
    const end = boundary.cloneRange();
    end.collapse(false);
    boundary.collapse(true);
    // START_TO_START 与 END_TO_END：必须有正长度交集，不能只是接触边界。
    if (range.compareBoundaryPoints(0, end) < 0 && range.compareBoundaryPoints(2, boundary) > 0) {
      blocks.add(block);
    }
  }
  return [...blocks];
}

/** 先固定目标集合再修改 DOM，防止替换标题标签时活动选区缩短、漏掉后续段落。 */
export function applyParagraphFormatToRange(
  editor: HTMLElement,
  range: Range,
  format: ParagraphFormat,
): HTMLElement[] {
  return findFormatBlocksInRange(editor, range)
    .map((block) => applyParagraphFormat(editor, block, format))
    .filter((block): block is HTMLElement => block !== null);
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
  Object.entries(format.computed ?? {}).forEach(([name, value]) => block.style.setProperty(name, value));
  // 全选包含来源卡片时，卡片内已有底框，不再叠加一层背景和内边距。
  if (format.containerBox && !format.containerBox.source.contains(block)) {
    Object.entries(format.containerBox.styles).forEach(([name, value]) => block.style.setProperty(name, value));
  }
  clearInlineFormatting(block);
  applyInlineFormatting(block, format.inline);
  return block;
}

/** 将格式刷取样、选区应用和取消操作绑定到工具栏。 */
export function initFormatPainter(
  editor: HTMLElement,
  button: HTMLButtonElement,
  onChange: () => void,
  notify: (message: string, duration?: number) => void = () => {},
): void {
  let paintedFormat: ParagraphFormat | null = null;

  const cancelPainter = (): void => {
    paintedFormat = null;
    button.classList.remove('active');
    button.setAttribute('aria-pressed', 'false');
    editor.classList.remove('format-painter-active');
  };

  const applyPainter = (): void => {
    const selection = editor.ownerDocument.getSelection();
    if (!paintedFormat || !selection?.rangeCount) return;
    const originalRange = selection.getRangeAt(0);
    const wasCollapsed = originalRange.collapsed;
    const applied = applyParagraphFormatToRange(editor, originalRange, paintedFormat);
    if (!applied.length) {
      notify('请在编辑区点击或选中文字段落；按 Esc 可取消', 4000);
      return;
    }

    cancelPainter();
    const range = editor.ownerDocument.createRange();
    range.setStart(applied[0], 0);
    const last = applied[applied.length - 1];
    range.setEnd(last, last.childNodes.length);
    if (wasCollapsed) range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    onChange();
    notify(`已应用格式到 ${applied.length} 个段落`);
  };

  button.addEventListener('click', () => {
    if (paintedFormat) {
      const selection = editor.ownerDocument.getSelection();
      if (selection?.rangeCount && !selection.isCollapsed) {
        applyPainter();
        return;
      }
      cancelPainter();
      notify('已取消格式刷');
      return;
    }

    const selection = editor.ownerDocument.getSelection();
    paintedFormat = captureParagraphFormat(editor, selection?.anchorNode ?? null, selection?.anchorOffset ?? 0);
    if (!paintedFormat) {
      notify('请先把光标放在要引用格式的段落中');
      return;
    }

    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
    editor.classList.add('format-painter-active');
    notify('已吸取格式：点击或拖选目标段落，⌘A / Ctrl+A 应用到全文；键盘选区后按 Enter 或再点格式刷，Esc 取消', 6500);
  });

  // mouseup 时拖选已经完成；click 的 target 在跨段拖选时常常只是文章容器。
  editor.addEventListener('mouseup', (event) => {
    if (paintedFormat && event.button === 0) applyPainter();
  });

  editor.addEventListener('keyup', (event) => {
    if (paintedFormat && event.key.toLowerCase() === 'a' && (event.metaKey || event.ctrlKey)) {
      applyPainter();
    }
  });

  editor.addEventListener('keydown', (event) => {
    if (paintedFormat && event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      applyPainter();
    }
  });

  editor.ownerDocument.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !paintedFormat) return;
    cancelPainter();
    notify('已取消格式刷');
  });
}
