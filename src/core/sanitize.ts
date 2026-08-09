import DOMPurify from 'dompurify';

const FORBID_TAGS = [
  'style',
  'script',
  'template',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'audio',
  'video',
  'source',
  'track',
  'link',
  'meta',
  'base',
];

const FORBID_ATTR = [
  'srcdoc',
  'srcset',
  'poster',
  'background',
  'formaction',
  'autofocus',
  'contenteditable',
  'data-welcome',
  'data-sel',
];

const ACTIVE_CONTENT = /<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const AUTO_LOADING_TAG = /<\/?(?:iframe|frame|frameset|object|embed|audio|video|source|track|link|meta|base)\b[^>]*>/gi;
const IMG_TAG = /<img\b[^>]*>/gi;
const STYLE_ATTRIBUTE = /\s+style\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
const SRC_ATTRIBUTE = /\s+src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
const LOADING_IMAGE_ATTRIBUTE = /\s+(?:srcset|loading|decoding|referrerpolicy|crossorigin)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+)/gi;

export interface ImportResourceReport {
  externalImagesRemoved: number;
  externalImagesKept: number;
  invalidImagesRemoved: number;
  resourceStylesRemoved: number;
}

export interface SanitizedImport {
  html: string;
  report: ImportResourceReport;
}

export interface ImportSanitizeOptions {
  allowExternalImages?: boolean;
}

interface NeutralizedMarkup {
  html: string;
  imageSources: string[];
  styles: string[];
}

/** 仅把会自动发起网络请求的 http(s) / 协议相对地址视为外链图片。 */
export function isExternalImageSource(source: string): boolean {
  return /^(?:https?:)?\/\//i.test(source.trim());
}

/** 编辑器可以安全内嵌的本地图片来源；blob 地址只在当前浏览器会话内有效。 */
export function isLocalImageSource(source: string): boolean {
  return /^(?:data:image\/|blob:)/i.test(source.trim());
}

/**
 * 内联 CSS 中的资源函数也会自动联网。这里采用保守策略：包含 URL、image-set、
 * @import 或旧式外部绑定的声明整条移除，普通字号、颜色、边距等样式继续保留。
 */
export function hasExternalStyleResource(declaration: string): boolean {
  return /(?:url\s*\(|image-set\s*\(|@import|https?:|(?:^|[\s:(])\/\/|-moz-binding|\bbehavior\s*:)/i.test(
    declaration,
  );
}

export function stripExternalStyleResources(style: string): { value: string; removed: number } {
  let removed = 0;
  const safe = style
    .split(';')
    .map((declaration) => declaration.trim())
    .filter((declaration) => {
      if (!declaration) return false;
      if (!hasExternalStyleResource(declaration)) return true;
      removed++;
      return false;
    })
    .join(';');
  return { value: safe, removed };
}

function decodeAttribute(value: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

function extractBody(markup: string): string {
  const body = markup.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i);
  return body?.[1] ?? markup;
}

/**
 * 先把图片 src 和 style 属性替换成无害索引，再让任何浏览器 HTML 解析器接触内容。
 * 这样即使导入文件中含跟踪像素或 CSS 背景图，清洗阶段也不会意外联网。
 */
function neutralizeLoadingResources(source: string): NeutralizedMarkup {
  const imageSources: string[] = [];
  const styles: string[] = [];
  let html = source.replace(ACTIVE_CONTENT, '').replace(AUTO_LOADING_TAG, '');
  html = extractBody(html);

  html = html.replace(IMG_TAG, (tag) => {
    let sourceValue = '';
    let withoutSource = tag.replace(SRC_ATTRIBUTE, (_match, double, single, bare) => {
      if (!sourceValue) sourceValue = double ?? single ?? bare ?? '';
      return '';
    });
    withoutSource = withoutSource.replace(LOADING_IMAGE_ATTRIBUTE, '');
    const index = imageSources.push(sourceValue) - 1;
    return withoutSource.replace(/\/?\s*>$/, (ending) => ` data-cpc-import-image="${index}"${ending}`);
  });

  html = html.replace(STYLE_ATTRIBUTE, (_match, double, single, bare) => {
    const index = styles.push(double ?? single ?? bare ?? '') - 1;
    return ` data-cpc-import-style="${index}"`;
  });
  return { html, imageSources, styles };
}

function sanitizeMarkup(source: string, allowExternalImages: boolean): SanitizedImport {
  const neutralized = neutralizeLoadingResources(source);
  const sanitized = DOMPurify.sanitize(neutralized.html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS,
    FORBID_ATTR,
    SANITIZE_NAMED_PROPS: true,
  });
  const template = document.createElement('template');
  template.innerHTML = sanitized;
  const report: ImportResourceReport = {
    externalImagesRemoved: 0,
    externalImagesKept: 0,
    invalidImagesRemoved: 0,
    resourceStylesRemoved: 0,
  };

  template.content.querySelectorAll<HTMLElement>('[data-cpc-import-style]').forEach((element) => {
    const index = Number(element.dataset.cpcImportStyle);
    const original = decodeAttribute(neutralized.styles[index] ?? '');
    const safe = stripExternalStyleResources(original);
    report.resourceStylesRemoved += safe.removed;
    if (safe.value) element.setAttribute('style', safe.value);
    element.removeAttribute('data-cpc-import-style');
  });

  template.content.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
    const index = Number(image.dataset.cpcImportImage);
    const sourceValue = decodeAttribute(neutralized.imageSources[index] ?? '').trim();
    image.removeAttribute('data-cpc-import-image');
    if (isLocalImageSource(sourceValue)) {
      image.setAttribute('src', sourceValue);
      return;
    }
    if (allowExternalImages && isExternalImageSource(sourceValue)) {
      image.setAttribute('src', sourceValue);
      image.setAttribute('referrerpolicy', 'no-referrer');
      image.setAttribute('loading', 'lazy');
      image.setAttribute('decoding', 'async');
      report.externalImagesKept++;
      return;
    }
    if (isExternalImageSource(sourceValue)) report.externalImagesRemoved++;
    else report.invalidImagesRemoved++;
    image.remove();
  });

  return { html: template.innerHTML, report };
}

/**
 * 清洗编辑器内部或备份中的 HTML。已经由用户明确保留的外链图片继续存在，但会
 * 自动添加 no-referrer；脚本、远程 CSS、媒体、嵌入页面等主动资源始终移除。
 */
export function htmlToBody(source: string): string {
  return sanitizeMarkup(source, true).html;
}

/** 导入外部文章时默认删除网络图片；只有用户明确选择后才保留。 */
export function sanitizeImportedHtml(
  source: string,
  options: ImportSanitizeOptions = {},
): SanitizedImport {
  return sanitizeMarkup(source, options.allowExternalImages === true);
}
