import DOMPurify from 'dompurify';

/**
 * 导入外部 HTML 时的清洗：只取 <body> 内容，再交给 DOMPurify 按 HTML
 * 安全模型过滤。保留正常的文章标签、内联样式和 data:image 图片，同时移除
 * 脚本、事件属性、危险 URL、表单控件以及可能干扰编辑器状态的内部属性。
 */
const FORBID_TAGS = ['style', 'form', 'input', 'button', 'textarea', 'select', 'option', 'template'];
const FORBID_ATTR = [
  'srcdoc',
  'srcset',
  'formaction',
  'autofocus',
  'contenteditable',
  'data-welcome',
  'data-sel',
];

export function htmlToBody(src: string): string {
  const doc = new DOMParser().parseFromString(src, 'text/html');
  const body = doc.body ? doc.body.innerHTML : src;
  return DOMPurify.sanitize(body, {
    USE_PROFILES: { html: true },
    FORBID_TAGS,
    FORBID_ATTR,
    SANITIZE_NAMED_PROPS: true,
  });
}
