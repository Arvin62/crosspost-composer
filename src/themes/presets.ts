import type { Theme } from './types';

/**
 * 内置排版主题。刻意只用「可内联」的属性（不用 ::before 等伪元素），
 * 保证复制到平台后样式能存活。字体统一走系统字体栈，避免依赖平台不装的字体。
 *
 * 注意：字体名里的双引号是真引号。用于 <style> 预览时是合法 CSS；
 * 内联进 style 属性后，浏览器序列化会自动转义成 &quot;（各平台粘贴时会正确还原）。
 */

const SANS =
  '-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
const SERIF = 'Georgia,"Songti SC","SimSun",serif';
const MONO = '"SF Mono",Menlo,Consolas,"Courier New",monospace';

const minimal: Theme = {
  id: 'minimal',
  name: '简约',
  styles: {
    h1: `font-size:24px;font-weight:700;line-height:1.35;margin:1.4em 0 .6em;color:#1a1a1a;font-family:${SANS}`,
    h2: `font-size:20px;font-weight:700;line-height:1.4;margin:1.5em 0 .7em;color:#1a1a1a;border-left:4px solid #1668dc;padding-left:12px;font-family:${SANS}`,
    h3: `font-size:17px;font-weight:600;line-height:1.5;margin:1.3em 0 .5em;color:#1a1a1a;font-family:${SANS}`,
    h4: `font-size:16px;font-weight:600;margin:1.2em 0 .5em;color:#33383f;font-family:${SANS}`,
    p: `font-size:16px;line-height:1.9;margin:0 0 1.1em;color:#2c2c2c;font-family:${SANS}`,
    blockquote: `margin:1.2em 0;padding:10px 16px;background:#f6f8fa;border-left:3px solid #ccd2da;color:#57606a;font-size:15px;line-height:1.8`,
    ul: `margin:0 0 1.1em;padding-left:1.6em;color:#2c2c2c;font-size:16px;line-height:1.9`,
    ol: `margin:0 0 1.1em;padding-left:1.6em;color:#2c2c2c;font-size:16px;line-height:1.9`,
    li: `margin:.25em 0`,
    a: `color:#1668dc;text-decoration:none;border-bottom:1px solid rgba(22,104,220,.35)`,
    strong: `font-weight:700;color:#1a1a1a`,
    em: `font-style:italic`,
    code: `font-family:${MONO};background:#f2f3f5;padding:2px 6px;border-radius:4px;font-size:.92em;color:#c7254e`,
    pre: `background:#0f172a;color:#e2e8f0;padding:14px 16px;border-radius:8px;overflow-x:auto;font-size:14px;line-height:1.6;font-family:${MONO}`,
    hr: `border:none;border-top:1px solid #e4e6ea;margin:1.8em 0`,
    img: `max-width:100%;height:auto;border-radius:4px`,
    table: `border-collapse:collapse;width:100%;font-size:15px;margin:1.2em 0`,
    th: `border:1px solid #e0e3e8;padding:8px 12px;text-align:left;background:#f6f8fa;font-weight:600`,
    td: `border:1px solid #e0e3e8;padding:8px 12px;text-align:left`,
  },
};

const elegant: Theme = {
  id: 'elegant',
  name: '优雅',
  styles: {
    h1: `font-size:25px;font-weight:700;line-height:1.4;margin:1.4em 0 .7em;color:#3a2f28;text-align:center;font-family:${SERIF}`,
    h2: `font-size:21px;font-weight:700;line-height:1.5;margin:1.6em 0 .8em;color:#8a5a2b;padding-bottom:6px;border-bottom:2px solid #ecdcc8;font-family:${SERIF}`,
    h3: `font-size:18px;font-weight:700;margin:1.3em 0 .5em;color:#8a5a2b;font-family:${SERIF}`,
    h4: `font-size:16px;font-weight:700;margin:1.2em 0 .5em;color:#5a4a3a;font-family:${SERIF}`,
    p: `font-size:16px;line-height:2.0;margin:0 0 1.2em;color:#3a3230;font-family:${SERIF}`,
    blockquote: `margin:1.3em 0;padding:12px 18px;background:#faf6f0;border-left:3px solid #d9b98a;color:#6b5844;font-size:15px;line-height:1.9;font-family:${SERIF}`,
    ul: `margin:0 0 1.2em;padding-left:1.6em;color:#3a3230;font-size:16px;line-height:2.0;font-family:${SERIF}`,
    ol: `margin:0 0 1.2em;padding-left:1.6em;color:#3a3230;font-size:16px;line-height:2.0;font-family:${SERIF}`,
    li: `margin:.3em 0`,
    a: `color:#8a5a2b;text-decoration:none;border-bottom:1px solid rgba(138,90,43,.4)`,
    strong: `font-weight:700;color:#3a2f28`,
    em: `font-style:italic;color:#6b5844`,
    code: `font-family:${MONO};background:#f3ece2;padding:2px 6px;border-radius:4px;font-size:.9em;color:#a15c2b`,
    pre: `background:#2f2822;color:#f0e6d8;padding:14px 16px;border-radius:8px;overflow-x:auto;font-size:14px;line-height:1.6;font-family:${MONO}`,
    hr: `border:none;border-top:1px solid #e6d9c6;margin:2em 0`,
    img: `max-width:100%;height:auto;border-radius:6px`,
    table: `border-collapse:collapse;width:100%;font-size:15px;margin:1.3em 0`,
    th: `border:1px solid #e6d9c6;padding:9px 12px;text-align:left;background:#faf6f0;font-weight:700`,
    td: `border:1px solid #e6d9c6;padding:9px 12px;text-align:left`,
  },
};

const tech: Theme = {
  id: 'tech',
  name: '科技蓝',
  styles: {
    h1: `font-size:24px;font-weight:800;line-height:1.35;margin:1.4em 0 .6em;color:#0b2545;font-family:${SANS}`,
    h2: `font-size:20px;font-weight:800;line-height:1.4;margin:1.5em 0 .7em;color:#ffffff;background:#0b63c4;padding:8px 14px;border-radius:6px;font-family:${SANS}`,
    h3: `font-size:17px;font-weight:700;line-height:1.5;margin:1.3em 0 .5em;color:#0b63c4;border-left:3px solid #0b63c4;padding-left:10px;font-family:${SANS}`,
    h4: `font-size:16px;font-weight:700;margin:1.2em 0 .5em;color:#13457a;font-family:${SANS}`,
    p: `font-size:16px;line-height:1.9;margin:0 0 1.1em;color:#25303b;font-family:${SANS}`,
    blockquote: `margin:1.2em 0;padding:12px 16px;background:#eef5fd;border-left:4px solid #0b63c4;color:#3a4a66;font-size:15px;line-height:1.8`,
    ul: `margin:0 0 1.1em;padding-left:1.6em;color:#25303b;font-size:16px;line-height:1.9`,
    ol: `margin:0 0 1.1em;padding-left:1.6em;color:#25303b;font-size:16px;line-height:1.9`,
    li: `margin:.25em 0`,
    a: `color:#0b63c4;text-decoration:none;border-bottom:1px solid rgba(11,99,196,.4)`,
    strong: `font-weight:700;color:#0b2545`,
    em: `font-style:italic`,
    code: `font-family:${MONO};background:#e8f0fb;padding:2px 6px;border-radius:4px;font-size:.92em;color:#0b63c4`,
    pre: `background:#0b2545;color:#dceaff;padding:14px 16px;border-radius:8px;overflow-x:auto;font-size:14px;line-height:1.6;font-family:${MONO}`,
    hr: `border:none;border-top:2px dashed #cfe0f5;margin:1.8em 0`,
    img: `max-width:100%;height:auto;border-radius:6px`,
    table: `border-collapse:collapse;width:100%;font-size:15px;margin:1.2em 0`,
    th: `border:1px solid #cfe0f5;padding:8px 12px;text-align:left;background:#0b63c4;color:#ffffff;font-weight:600`,
    td: `border:1px solid #cfe0f5;padding:8px 12px;text-align:left`,
  },
};

export const THEMES: Theme[] = [minimal, elegant, tech];
export const DEFAULT_THEME_ID = minimal.id;

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? minimal;
}

/** 生成用于编辑区实时预览的作用域 CSS。 */
export function themeToCss(theme: Theme, scope = '#editor'): string {
  return Object.entries(theme.styles)
    .map(([sel, decl]) => `${scope} ${sel}{${decl}}`)
    .join('\n');
}
