/** 将文档标题处理成适合常见桌面文件系统的文件名片段。 */
export function safeFilenameTitle(title: string): string {
  return title
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .slice(0, 60) || '文章';
}

/**
 * 单篇文章导出文件名：本地日期在前，文档标题在后，月和日不补零。
 * 例如：2026-8-12-文档标题.html
 */
export function articleExportFilename(title: string, date = new Date()): string {
  const datePrefix = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  return `${datePrefix}-${safeFilenameTitle(title)}.html`;
}
