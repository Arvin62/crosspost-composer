import { fileToDataURL } from '../core/image';
import type { ImageOptions } from '../core/image';

export interface InsertResult {
  /** 成功插入的张数。 */
  count: number;
  /** 因无参照块而插到文章末尾。 */
  atEnd: boolean;
  /** 处理失败被跳过的文件名。 */
  failed: string[];
}

/**
 * 把图片文件压缩后，作为居中段落插入到参照块之后（多张则依次排列）。
 * refBlock 为 null 时追加到文章末尾。
 */
export async function insertImages(
  editor: HTMLElement,
  fileList: FileList | File[],
  refBlock: HTMLElement | null,
  opts: ImageOptions,
): Promise<InsertResult> {
  const files = [...fileList].filter((f) => f.type.startsWith('image/'));
  const failed: string[] = [];
  let anchor: HTMLElement | null = refBlock;
  let first: HTMLElement | null = null;
  let count = 0;

  for (const f of files) {
    try {
      const url = await fileToDataURL(f, opts);
      const p = document.createElement('p');
      p.setAttribute('style', 'text-align:center;margin:1.2em 0;');
      const img = new Image();
      img.src = url;
      img.setAttribute('style', 'max-width:100%;height:auto;');
      p.appendChild(img);

      if (anchor && anchor !== editor && editor.contains(anchor)) {
        anchor.insertAdjacentElement('afterend', p);
      } else {
        editor.appendChild(p);
      }
      anchor = p;
      first = first ?? p;
      count++;
    } catch (e) {
      console.error(e);
      failed.push(f.name);
    }
  }

  if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return { count, atEnd: refBlock == null, failed };
}
