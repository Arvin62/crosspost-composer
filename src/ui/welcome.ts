/** 首次打开时的引导内容。带 data-welcome 标记，导出/统计时会被自动剔除。 */
export const WELCOME_HTML = `<section data-welcome="1" style="color:#5a5f66;font-size:15px;line-height:1.9;">
<h2 style="color:#26282c;font-size:20px;margin-bottom:12px;">从这里开始</h2>
<ol style="padding-left:22px;">
<li style="margin-bottom:8px;"><b>新建或导入</b>：点顶部文档名称管理多篇文章；也可导入 HTML / Markdown，或直接把文件拖进正文区域。</li>
<li style="margin-bottom:8px;"><b>编辑图文</b>：图片支持点击、拖入或粘贴插入。选中图片后可替换、裁剪、旋转、填写描述和图注，也可拖动或用“上移 / 下移”调整顺序。</li>
<li style="margin-bottom:8px;"><b>检查并复制</b>：点「平台复制」，选择公众号、头条 / 百家号、知乎或通用富文本。工具会先提示图片、体积和兼容性问题，再生成对应内容。</li>
</ol>
<p style="margin-top:14px;">点「大纲 / 查找」可浏览标题、查找和替换文字，⌘/Ctrl+F 也能直接打开。内容会自动保存在本机，并按间隔保留历史版本。</p>
<p style="margin-top:14px;padding:10px 12px;background:#f3f7fd;border-radius:8px;color:#315a86;"><b>隐私说明：</b>文章不会上传服务器，只存在当前浏览器。重要内容请在「··· → 使用帮助与本机数据」中导出完整备份。</p>
</section>`;
