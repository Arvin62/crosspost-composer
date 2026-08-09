/** 一套排版主题：把标签名映射到 CSS 声明串。 */
export interface Theme {
  id: string;
  name: string;
  /** 键为简单标签选择器（h2 / p / blockquote …），值为 "prop:val;prop:val" 声明串。 */
  styles: Record<string, string>;
}
