import { marked } from 'marked';

/**
 * Markdown → HTML。产出语义化标签（h/p/ul/blockquote/code…），无内联样式，
 * 交给主题去着色、复制时再内联——这正是排版主题最能发挥价值的入口。
 */
marked.setOptions({
  gfm: true, // 支持表格、删除线等 GitHub 风格扩展
  breaks: true, // 单个换行也转成 <br>，贴合公众号/知乎的书写习惯
});

export function markdownToHtml(md: string): string {
  return marked.parse(md) as string;
}
