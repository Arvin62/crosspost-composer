export interface NavigatorPanel {
  toggle(): void;
  openFind(): void;
  refresh(): void;
}

interface TextSegment {
  node: Text;
  start: number;
  end: number;
  block: Element | null;
}

export interface TextOccurrence {
  start: number;
  end: number;
}

interface HighlightRegistryLike {
  set(name: string, value: unknown): void;
  delete(name: string): boolean;
}

type HighlightConstructor = new (...ranges: Range[]) => unknown;

const FIND_ALL_HIGHLIGHT = 'composer-find-all';
const FIND_CURRENT_HIGHLIGHT = 'composer-find-current';

function highlightSupport(): {
  registry: HighlightRegistryLike;
  HighlightClass: HighlightConstructor;
} | null {
  const browser = globalThis as unknown as {
    CSS?: { highlights?: HighlightRegistryLike };
    Highlight?: HighlightConstructor;
  };
  if (!browser.CSS?.highlights || !browser.Highlight) return null;
  return { registry: browser.CSS.highlights, HighlightClass: browser.Highlight };
}

export function findTextOccurrences(text: string, query: string): TextOccurrence[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [];
  const haystack = text.toLocaleLowerCase();
  const occurrences: TextOccurrence[] = [];
  let from = 0;
  while (from <= haystack.length - needle.length) {
    const start = haystack.indexOf(needle, from);
    if (start < 0) break;
    occurrences.push({ start, end: start + needle.length });
    from = start + Math.max(1, needle.length);
  }
  return occurrences;
}

export function findTextRanges(root: HTMLElement, query: string): Range[] {
  const needle = query.trim();
  if (!needle) return [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const segments: TextSegment[] = [];
  let fullText = '';
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node as Text;
    const value = text.data;
    if (!value) continue;
    const start = fullText.length;
    fullText += value;
    segments.push({
      node: text,
      start,
      end: fullText.length,
      block: text.parentElement?.closest(
        'p,h1,h2,h3,h4,h5,h6,li,blockquote,figcaption,td,th,pre',
      ) ?? root,
    });
  }

  const ranges: Range[] = [];
  for (const occurrence of findTextOccurrences(fullText, needle)) {
    const at = occurrence.start;
    const endAt = occurrence.end;
    const startSegment = segments.find((segment) => at >= segment.start && at < segment.end);
    const endSegment = segments.find((segment) => endAt > segment.start && endAt <= segment.end);
    // 不跨段落生成 Range，避免替换文字时误删两个块之间的 HTML 结构。
    if (startSegment && endSegment && startSegment.block === endSegment.block) {
      const range = document.createRange();
      range.setStart(startSegment.node, at - startSegment.start);
      range.setEnd(endSegment.node, endAt - endSegment.start);
      ranges.push(range);
    }
  }
  return ranges;
}

function replaceRange(range: Range, replacement: string): void {
  range.deleteContents();
  range.insertNode(document.createTextNode(replacement));
}

export function replaceAllText(root: HTMLElement, query: string, replacement: string): number {
  const ranges = findTextRanges(root, query);
  for (const range of [...ranges].reverse()) replaceRange(range, replacement);
  return ranges.length;
}

export function initNavigator(editor: HTMLElement, onChange: () => void): NavigatorPanel {
  const panel = document.querySelector<HTMLElement>('#navigatorPanel')!;
  const outline = document.querySelector<HTMLElement>('#outlineList')!;
  const findInput = document.querySelector<HTMLInputElement>('#findInput')!;
  const replaceInput = document.querySelector<HTMLInputElement>('#replaceInput')!;
  const replaceToggle = document.querySelector<HTMLButtonElement>('#replaceToggle')!;
  const replacePanel = document.querySelector<HTMLElement>('#replacePanel')!;
  const replaceOneButton = document.querySelector<HTMLButtonElement>('#replaceOne')!;
  const replaceAllButton = document.querySelector<HTMLButtonElement>('#replaceAll')!;
  const findCount = document.querySelector<HTMLElement>('#findCount')!;
  let matches: Range[] = [];
  let current = -1;
  let isComposing = false;

  function clearHighlights(): void {
    const support = highlightSupport();
    support?.registry.delete(FIND_ALL_HIGHLIGHT);
    support?.registry.delete(FIND_CURRENT_HIGHLIGHT);
  }

  function renderHighlights(): boolean {
    const support = highlightSupport();
    if (!support) return false;
    clearHighlights();
    if (!matches.length) return true;
    support.registry.set(FIND_ALL_HIGHLIGHT, new support.HighlightClass(...matches));
    if (current >= 0 && matches[current]) {
      support.registry.set(
        FIND_CURRENT_HIGHLIGHT,
        new support.HighlightClass(matches[current]!),
      );
    }
    return true;
  }

  function matchElement(range: Range): Element | null {
    return range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as Element)
      : range.startContainer.parentElement;
  }

  function showMatch(index: number): void {
    if (!matches.length) return;
    current = (index + matches.length) % matches.length;
    const range = matches[current]!;
    const element = matchElement(range);
    const highlighted = renderHighlights();
    if (!highlighted && element instanceof HTMLElement) {
      element.animate(
        [{ backgroundColor: 'rgba(255, 193, 7, 0.42)' }, { backgroundColor: 'transparent' }],
        { duration: 900, easing: 'ease-out' },
      );
    }
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    findCount.textContent = `${current + 1} / ${matches.length}`;
  }

  function refreshMatches(selectFirst = false, resetCurrent = false): void {
    matches = findTextRanges(editor, findInput.value);
    replaceOneButton.disabled = !matches.length;
    replaceAllButton.disabled = !matches.length;
    if (!matches.length) {
      current = -1;
      clearHighlights();
      findCount.textContent = findInput.value.trim() ? '0 / 0' : '';
      return;
    }
    if (resetCurrent || selectFirst || current < 0 || current >= matches.length) current = 0;
    findCount.textContent = `${current + 1} / ${matches.length}`;
    if (selectFirst) showMatch(current);
    else renderHighlights();
  }

  function renderOutline(): void {
    const headings = [...editor.querySelectorAll<HTMLElement>('h1,h2,h3,h4')].filter(
      (heading) => heading.textContent?.trim(),
    );
    outline.replaceChildren();
    if (!headings.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = '设置 H1–H4 标题后，这里会自动生成大纲。';
      outline.appendChild(empty);
      return;
    }
    for (const heading of headings) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `outline-item level-${heading.tagName.slice(1)}`;
      button.textContent = heading.textContent!.trim();
      button.addEventListener('click', () => {
        heading.scrollIntoView({ behavior: 'smooth', block: 'center' });
        heading.classList.add('outline-flash');
        window.setTimeout(() => heading.classList.remove('outline-flash'), 1200);
      });
      outline.appendChild(button);
    }
  }

  function setOpen(open: boolean): void {
    panel.hidden = !open;
    document.body.classList.toggle('navigator-open', open);
    if (!open) clearHighlights();
  }

  function setReplaceOpen(open: boolean): void {
    replacePanel.hidden = !open;
    replaceToggle.textContent = open ? '收起替换' : '展开替换…';
    replaceToggle.setAttribute('aria-expanded', String(open));
    if (open) replaceInput.focus();
  }

  // 输入时只更新匹配数量，不改动正文选区，否则焦点会从输入框跳回编辑器。
  // composition 事件避免中文输入法还在组词时反复重算。
  findInput.addEventListener('compositionstart', () => {
    isComposing = true;
  });
  findInput.addEventListener('compositionend', () => {
    isComposing = false;
    refreshMatches(true, true);
  });
  findInput.addEventListener('input', () => {
    if (!isComposing) refreshMatches(true, true);
  });
  findInput.addEventListener('keydown', (event) => {
    if (isComposing || event.key !== 'Enter') return;
    event.preventDefault();
    refreshMatches();
    if (!matches.length) return;
    showMatch(event.shiftKey ? current - 1 : current + 1);
  });
  replaceToggle.addEventListener('click', () => setReplaceOpen(Boolean(replacePanel.hidden)));
  document.querySelector<HTMLButtonElement>('#findPrev')!.addEventListener('click', () => {
    refreshMatches();
    showMatch(current - 1);
  });
  document.querySelector<HTMLButtonElement>('#findNext')!.addEventListener('click', () => {
    refreshMatches();
    showMatch(current + 1);
  });
  replaceOneButton.addEventListener('click', () => {
    refreshMatches();
    if (!matches.length) return;
    if (
      !replaceInput.value &&
      !confirm(`替换内容为空，这会删除当前这一处“${findInput.value}”。确定继续？`)
    ) return;
    replaceRange(matches[current]!, replaceInput.value);
    onChange();
    refreshMatches(true);
  });
  replaceAllButton.addEventListener('click', () => {
    refreshMatches();
    if (!matches.length) return;
    const replacement = replaceInput.value;
    const target = replacement
      ? `将 ${matches.length} 处“${findInput.value}”全部替换为“${replacement}”`
      : `删除 ${matches.length} 处“${findInput.value}”`;
    if (!confirm(`${target}。确定继续？`)) return;
    const count = replaceAllText(editor, findInput.value, replacement);
    if (count) onChange();
    refreshMatches();
    findCount.textContent = count ? `已替换 ${count} 处` : '没有匹配内容';
  });
  document.querySelector<HTMLButtonElement>('#navigatorClose')!.addEventListener('click', () => setOpen(false));

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      setOpen(true);
      setReplaceOpen(false);
      if (findInput.value) refreshMatches(true);
      findInput.focus();
      findInput.select();
    }
  });

  return {
    toggle() {
      setOpen(Boolean(panel.hidden));
      if (!panel.hidden) {
        renderOutline();
        setReplaceOpen(false);
        if (findInput.value) refreshMatches(true);
      }
    },
    openFind() {
      setOpen(true);
      renderOutline();
      setReplaceOpen(false);
      if (findInput.value) refreshMatches(true);
      findInput.focus();
      findInput.select();
    },
    refresh() {
      renderOutline();
      if (!panel.hidden && findInput.value) refreshMatches();
    },
  };
}
