import type { Theme } from '../themes/types';

/**
 * 把主题样式内联到每个元素的 style 属性上——这是让排版在公众号等平台存活的关键。
 *
 * 合并规则：主题样式作为「底」，元素自带的内联样式「盖」在上面（作者显式意图优先）。
 * 例如导入的 HTML 已带 color，则保留其 color，只补主题里它没写的属性；
 * 又如图片的 width:70% 是用户手动设的，不会被主题的 img 样式覆盖。
 */
export function inlineStyles(html: string, theme: Theme): string {
  const container = document.createElement('div');
  container.innerHTML = html;

  for (const [selector, decl] of Object.entries(theme.styles)) {
    container.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      const merged = parseDecls(decl);
      for (const [k, v] of parseDecls(el.getAttribute('style') ?? '')) merged.set(k, v);
      el.setAttribute('style', serializeDecls(merged));
    });
  }

  return container.innerHTML;
}

function parseDecls(style: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of style.split(';')) {
    const seg = part.trim();
    if (!seg) continue;
    const i = seg.indexOf(':');
    if (i < 0) continue;
    const key = seg.slice(0, i).trim().toLowerCase();
    const val = seg.slice(i + 1).trim();
    if (key) map.set(key, val);
  }
  return map;
}

function serializeDecls(map: Map<string, string>): string {
  return [...map.entries()].map(([k, v]) => `${k}:${v}`).join(';');
}
