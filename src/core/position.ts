/**
 * 段落级插图定位。
 *
 * 关键：文章整体常被单个 <section>/<div> 包裹（AI 生成的公众号风格 HTML 尤其如此）。
 * 定位必须找到光标所在的「段落级元素」，而不是一路向上追溯到整篇文章的外层容器，
 * 否则图片会被插到整篇文章末尾。这是把单文件版此前修掉的插图 bug 固化进核心。
 */

/** 段落级标签：命中其中之一（取最外层的一个）作为插图参照块。 */
export const PARA_TAGS = new Set([
  'P',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'BLOCKQUOTE',
  'PRE',
  'UL',
  'OL',
  'TABLE',
  'FIGURE',
  'HR',
]);

/**
 * 返回 node 所属的插图参照块。
 * - 优先返回从 node 到 editor 之间最外层的段落级元素；
 * - 若整条链上都没有段落级元素，退回到 editor 的直接子元素；
 * - node 为空或不在 editor 内时返回 null（调用方据此插到末尾）。
 */
export function blockOf(editor: HTMLElement, node: Node | null): HTMLElement | null {
  let n: HTMLElement | null = node
    ? node.nodeType === 1
      ? (node as HTMLElement)
      : node.parentElement
    : null;
  if (!n || !editor.contains(n) || n === editor) return null;

  let hit: HTMLElement | null = null;
  for (let cur: HTMLElement | null = n; cur && cur !== editor; cur = cur.parentElement) {
    if (PARA_TAGS.has(cur.tagName)) hit = cur;
  }
  if (hit) return hit;

  while (n.parentElement && n.parentElement !== editor) n = n.parentElement;
  return n;
}
