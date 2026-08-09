import { htmlToBody } from './sanitize';
import { inlineStyles } from './inline-styles';
import { dataUrlByteSize, formatBytes } from './bytes';
import type { Theme } from '../themes/types';

export type PlatformId = 'wechat' | 'content' | 'zhihu' | 'generic';
export type IssueSeverity = 'error' | 'warning' | 'info';

export interface PlatformProfile {
  id: PlatformId;
  name: string;
  description: string;
}

export interface PreflightIssue {
  severity: IssueSeverity;
  message: string;
}

export interface PlatformStats {
  characters: number;
  images: number;
  embeddedImages: number;
  externalImages: number;
  imageBytes: number;
  htmlBytes: number;
}

export interface PreparedPlatformContent {
  html: string;
  plainText: string;
  issues: PreflightIssue[];
  stats: PlatformStats;
  canCopy: boolean;
}

export const PLATFORM_PROFILES: PlatformProfile[] = [
  {
    id: 'wechat',
    name: '微信公众号',
    description: '保留完整内联主题与 base64 图片，适合粘贴到公众号后台。',
  },
  {
    id: 'content',
    name: '头条 / 百家号',
    description: '保留语义结构和内联样式，平台可能按自身规则简化样式。',
  },
  {
    id: 'zhihu',
    name: '知乎',
    description: '输出简洁语义 HTML；图片必须是 http(s) 公网地址。',
  },
  {
    id: 'generic',
    name: '通用富文本',
    description: '保留当前主题，适合其他支持富文本粘贴的平台。',
  },
];

function stripInternalAttributes(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('*').forEach((element) => {
    for (const attr of [...element.attributes]) {
      if (
        attr.name === 'contenteditable' ||
        attr.name === 'data-sel' ||
        attr.name.startsWith('data-outline-') ||
        attr.name === 'draggable'
      ) {
        element.removeAttribute(attr.name);
      }
    }
  });
}

function simplifyForZhihu(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('*').forEach((element) => {
    element.removeAttribute('style');
    element.removeAttribute('class');
    element.removeAttribute('id');
    for (const attr of [...element.attributes]) {
      if (attr.name.startsWith('data-')) element.removeAttribute(attr.name);
    }
  });

  root.querySelectorAll<HTMLElement>('section,article,header,footer,main').forEach((element) => {
    element.replaceWith(...element.childNodes);
  });
}

function collectStats(root: HTMLElement, html: string): PlatformStats {
  const images = [...root.querySelectorAll<HTMLImageElement>('img')];
  const sources = images.map((image) => image.getAttribute('src') ?? '');
  return {
    characters: (root.textContent ?? '').replace(/\s+/g, '').length,
    images: images.length,
    embeddedImages: sources.filter((src) => src.startsWith('data:')).length,
    externalImages: sources.filter((src) => /^https?:\/\//i.test(src)).length,
    imageBytes: sources.reduce((total, src) => total + dataUrlByteSize(src), 0),
    htmlBytes: new TextEncoder().encode(html).length,
  };
}

function analyze(root: HTMLElement, stats: PlatformStats, platform: PlatformId): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  if (!stats.characters && !stats.images) {
    issues.push({ severity: 'error', message: '文章内容为空，无法复制。' });
  }
  if (stats.htmlBytes > 20 * 1024 * 1024) {
    issues.push({
      severity: 'warning',
      message: `HTML 总体积为 ${formatBytes(stats.htmlBytes)}，粘贴或平台转存可能较慢。`,
    });
  }
  if (stats.imageBytes > 10 * 1024 * 1024) {
    issues.push({
      severity: 'warning',
      message: `内嵌图片共 ${formatBytes(stats.imageBytes)}，建议先使用“批量压缩图片”。`,
    });
  }

  const images = [...root.querySelectorAll<HTMLImageElement>('img')];
  const missingAlt = images.filter((image) => !(image.getAttribute('alt') ?? '').trim()).length;
  if (missingAlt) {
    issues.push({
      severity: 'info',
      message: `${missingAlt} 张图片没有替代文字（alt）；它不显示在正文中，主要供读屏软件和图片加载失败时识别内容，不影响复制。`,
    });
  }

  const invalidSources = images.filter((image) => {
    const src = image.getAttribute('src') ?? '';
    return src && !src.startsWith('data:image/') && !/^https?:\/\//i.test(src);
  }).length;
  if (invalidSources) {
    issues.push({
      severity: 'error',
      message: `${invalidSources} 张图片不是 data:image 或 http(s) 地址，平台无法读取。`,
    });
  }

  if (platform === 'wechat') {
    if (stats.externalImages) {
      issues.push({
        severity: 'warning',
        message: `${stats.externalImages} 张图片仍是外链，公众号后台可能无法稳定转存。`,
      });
    }
  } else if (platform === 'content') {
    issues.push({
      severity: 'info',
      message: '头条与百家号会按平台规则简化字体、颜色和间距，正文结构与图片优先保留。',
    });
  } else if (platform === 'zhihu') {
    if (stats.embeddedImages) {
      issues.push({
        severity: 'error',
        message: `${stats.embeddedImages} 张图片是 base64；知乎需要 http(s) 公网图片地址。`,
      });
    }
    issues.push({
      severity: 'info',
      message: '已移除主题样式，只输出标题、段落、列表、引用等语义结构。',
    });
  }

  return issues;
}

export function preparePlatformContent(
  rawHTML: string,
  theme: Theme,
  platform: PlatformId,
): PreparedPlatformContent {
  const safe = htmlToBody(rawHTML);
  const container = document.createElement('div');
  container.innerHTML = platform === 'zhihu' ? safe : inlineStyles(safe, theme);
  stripInternalAttributes(container);
  if (platform === 'zhihu') simplifyForZhihu(container);

  const html = container.innerHTML.trim();
  const plainText = (container.innerText || container.textContent || '').trim();
  const stats = collectStats(container, html);
  const issues = analyze(container, stats, platform);
  return {
    html,
    plainText,
    stats,
    issues,
    canCopy: !issues.some((issue) => issue.severity === 'error'),
  };
}
