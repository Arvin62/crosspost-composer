<h1 align="center">图文排版台</h1>

<p align="center">
  <strong>一次插图，多平台粘贴。</strong><br>
  无需安装、无需登录，在浏览器里完成图文排版，再复制到多个内容平台。
</p>

<p align="center">
  <a href="https://arvin62.github.io/crosspost-composer/"><strong>打开在线版</strong></a> ·
  <a href="#三步完成一次分发">使用方法</a> ·
  <a href="#平台支持">平台支持</a> ·
  <a href="#本地运行与二次开发">本地运行</a>
</p>

<p align="center">
  <a href="https://github.com/Arvin62/crosspost-composer/actions/workflows/deploy.yml"><img src="https://img.shields.io/github/actions/workflow/status/Arvin62/crosspost-composer/deploy.yml?branch=main&style=flat-square&label=Pages" alt="GitHub Pages"></a>
  <a href="https://github.com/Arvin62/crosspost-composer/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Arvin62/crosspost-composer/ci.yml?branch=main&style=flat-square&label=CI" alt="CI"></a>
  <a href="https://github.com/Arvin62/crosspost-composer/releases/latest"><img src="https://img.shields.io/github/v/release/Arvin62/crosspost-composer?style=flat-square" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-3b82f6?style=flat-square" alt="Apache License 2.0"></a>
</p>

<p align="center">中文 · <a href="README-EN.md">English</a></p>

<p align="center">
  <img src="docs/hero.svg" alt="图文排版台产品界面：一次插图，多平台粘贴" width="920">
</p>

---

## 这是什么

图文排版台面向需要把同一篇带图文章分发到多个内容平台的创作者。你可以在一个页面里完成正文整理、图片插入和样式调整，再根据目标平台生成适合粘贴的内容。

它解决的不是“再造一个写作软件”，而是一个更具体的问题：**文章已经写好，但每到一个平台都要重新插图、重新调整排版。**

> **普通用户直接打开[在线版](https://arvin62.github.io/crosspost-composer/)即可使用，不需要 Node.js，不需要终端，也不需要注册账号。**

> **开源许可：**本公共仓库自 2026-08-13 起按照 [Apache License 2.0](LICENSE) 发布，允许使用、修改、分发和商业使用，但必须遵守许可证及 [NOTICE](NOTICE) 要求。私有 PRO 产品不在本仓库中，边界说明见 [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md)。

## 三步完成一次分发

| 1. 放入文章 | 2. 整理图文 | 3. 复制到平台 |
|---|---|---|
| 粘贴正文，或导入 HTML / Markdown 文件 | 插图、裁剪、排序，选择排版主题并检查正文 | 点击“平台复制”，完成预检后粘贴到目标编辑器 |

实际流程就是：

**导入文章 → 插入图片 → 调整排版 → 平台预检 → 复制发布**

## 为什么需要它

带图文章从一个内容平台复制到另一个平台时，图片经常丢失，样式也容易被清理。原因通常是原平台使用自己的图片地址和编辑规则，另一个平台无法直接复用。

图文排版台会在浏览器中处理图片，并在复制时把当前主题转换为更耐粘贴的内联样式。这样可以把重复劳动集中到一个地方完成。

| 常见分发方式 | 使用图文排版台 |
|---|---|
| 每个平台重新插入全部图片 | 图片在排版台中只插入一次 |
| 复制后逐段修复格式 | 先按目标平台生成并预检内容 |
| 文档、历史版本和图片分散保存 | 多文档、历史版本和完整备份统一管理 |

## 核心能力

| 能力 | 可以做什么 |
|---|---|
| **文章导入与编辑** | 导入 HTML / Markdown，使用标题、列表、引用、链接、分隔线和格式刷等常用排版工具 |
| **图片处理** | 点击、拖拽或粘贴插图；支持压缩、替换、裁剪、旋转、宽度、对齐、图注、替代文字和排序 |
| **主题与复制** | 使用「简约 / 优雅 / 科技蓝」主题；复制时自动内联可保留的排版样式 |
| **平台预检** | 复制前检查文字、图片、内容体积、失效图片、缺少替代文字及平台限制 |
| **文档管理** | 新建、搜索、重命名、复制和删除文档；支持自动保存、手动版本和历史恢复 |
| **查找与导航** | 自动生成 H1–H4 大纲；输入即查找，支持前后跳转、单处替换和确认后全部替换 |
| **完整备份** | 一次导出全部文档、图片、历史版本和设置，并可在其他浏览器恢复 |

## 数据与隐私

- 应用本身没有后端、账号、云同步或内容上传接口。
- 文章、图片、历史版本和设置保存在当前浏览器的 IndexedDB / localStorage 中。
- 导入 HTML / Markdown 时默认移除网络图片、远程样式和嵌入资源，避免在不知情时连接第三方服务器。
- 如手动选择“保留网络图片”，浏览器会访问相应图片地址，对方可能记录访问 IP；保留的图片会使用“不发送来源页”策略。
- 换浏览器、换设备或清理网站数据前，请先导出完整 JSON 备份。
- 完整备份可能包含未发布文章和原图，请把它当作私密文件保管。

在线版由 GitHub Pages 提供静态网页托管。文章内容不会提交到 GitHub 仓库；GitHub 仍可能按其服务规则记录访问 IP 等基础日志，详见 [GitHub Pages 说明](https://docs.github.com/pages/getting-started-with-github-pages/what-is-github-pages#data-collection)。

## 平台支持

图片以内嵌数据保存，粘贴时由目标平台识别并转存。不同平台会保留不同程度的样式：

| 平台 | 当前状态 | 实际表现 |
|---|:---:|---|
| 微信公众号 | ✅ 已验证 | 图片可随正文粘贴并转存，内联样式保留度较高 |
| 头条号 / 百家号 | ✅ 已验证 | 正文和图片可粘贴，平台会统一部分字体、颜色和间距 |
| 汽车之家（车家号） | ✅ 已验证 | 支持富文本图文粘贴，最终样式以平台编辑器为准 |
| 知乎 | ⚠️ 受限 | 输出语义 HTML；含内嵌图片时会阻止复制，需要先换成公网图片地址 |

> 平台编辑器可能随时调整粘贴规则。正式发布前，请在目标平台预览一次。

## 常见问题

<details>
<summary><strong>使用在线版还需要打开终端吗？</strong></summary>

不需要。直接打开[在线版](https://arvin62.github.io/crosspost-composer/)即可。Node.js 和终端命令只用于本地开发或自行部署。

</details>

<details>
<summary><strong>导入文件后，原文件会被修改吗？</strong></summary>

不会。浏览器只读取你选择的文件，后续修改保存在图文排版台自己的本机数据中。只有主动点击导出时，才会生成一个新的下载文件。

</details>

<details>
<summary><strong>HTML 导出和完整备份有什么区别？</strong></summary>

HTML 只导出当前文章，适合查看或交付；完整 JSON 备份包含全部文档、图片、历史版本和设置，适合迁移与恢复。

</details>

<details>
<summary><strong>为什么恢复备份前会自动下载一份当前数据？</strong></summary>

恢复会整体替换当前浏览器中的工作区。自动下载是安全措施，避免误选文件或恢复后才发现旧内容仍然需要。

</details>

## 工作原理

1. **图片本地化**：浏览器压缩本地图片并以内嵌数据保存，不依赖原平台的图片地址。
2. **样式内联化**：复制时把当前主题转换为元素自身的 `style`，提高跨编辑器粘贴后的保留度。
3. **平台化输出**：根据目标平台清理或保留不同内容，并在写入剪贴板前执行对应检查。

这些处理都在浏览器中完成，不依赖原发布平台，也不会修改你导入的原文件。

## 最新更新

### 2026-08-13

- 增加格式刷：从光标所在段落吸取段落与行内格式，单次应用到目标段落，同时保留目标文字和链接。
- 单篇 HTML 导出文件名改为“本地日期-文档标题”，并处理常见文件系统保留字符。
- 公共核心现按照 Apache License 2.0 开源，允许在保留许可证、版权及 NOTICE 声明的前提下使用、修改、分发和商业使用。
- 开放符合 Apache-2.0 和 DCO 签署要求的外部代码贡献；私有 PRO 产品及其专有代码仍与公共仓库隔离。

[查看完整发布记录](docs/releases/release-notes.md)

## 本地运行与二次开发

> 这一节面向开发者。普通用户请直接使用[在线版](https://arvin62.github.io/crosspost-composer/)。

环境要求：Node.js 22.12 或更高版本。

```bash
git clone https://github.com/Arvin62/crosspost-composer.git
cd crosspost-composer
npm ci
npm run dev
```

开发服务器默认运行在 `http://localhost:5173`。提交代码前建议执行：

```bash
npm test
npm run typecheck
npm run build
```

正式构建输出到 `dist/`，可部署到任意静态文件服务。本仓库已配置 GitHub Actions，`main` 分支更新后会自动部署到 GitHub Pages。

### 技术栈

Vite · TypeScript · [marked](https://github.com/markedjs/marked) · DOMPurify · 原生 DOM。

<details>
<summary><strong>查看项目结构</strong></summary>

```text
src/
├── core/       # 图片、存储、清洗、Markdown、平台转换、备份等核心逻辑
├── editor/     # contenteditable 编辑器与编辑命令
├── themes/     # 排版主题和内联规则
├── ui/         # 文档、平台预检、图片编辑、大纲和弹窗
└── main.ts     # 应用装配与主流程
```

`core/` 与界面层保持分离，便于后续复用到浏览器插件或桌面版本。

</details>

## 后续计划

- [ ] 完成更多浏览器与移动端发布验收
- [ ] 增加更多排版主题
- [ ] 评估可选图床方案，改善知乎等必须使用公网图片的平台体验
- [ ] 评估浏览器插件与平台官方上传接口

## 反馈与贡献

欢迎通过结构化 [Issues](https://github.com/Arvin62/crosspost-composer/issues/new/choose) 反馈问题、提交带日期的平台兼容性记录和提出建议。安全问题请按照 [SECURITY.md](SECURITY.md) 私下报告，不要公开真实稿件、备份或凭证。

当前维护者职责见 [MAINTAINERS.md](MAINTAINERS.md)，安全边界见[威胁模型](docs/security/threat-model.md)，计划中的工作见 [ROADMAP.md](ROADMAP.md)。代码贡献按照 Apache-2.0 的 inbound=outbound 条款接收，并要求 DCO 签署，详情见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

Copyright 2026 Arvin62.

- 公共仓库按照 [Apache License 2.0](LICENSE) 开源，允许使用、修改、分发和商业使用，但须保留许可证、版权及 [NOTICE](NOTICE) 中适用的声明。
- 私有 PRO 产品、服务和未包含在本仓库中的专有代码不因本仓库的许可证而获得授权，详见[公共核心与私有产品边界](COMMERCIAL-LICENSE.md)。
- 第三方依赖仍分别遵循各自许可证，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
