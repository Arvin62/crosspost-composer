# 贡献指南

欢迎通过 GitHub Issues 和 Pull Requests 参与 Crosspost Composer。

请优先使用仓库提供的结构化模板：

- Bug 报告必须包含版本、浏览器、操作系统和不含隐私数据的最小复现；
- 平台兼容性报告必须记录目标平台、验证日期、输出路径和预览结果；
- 新功能建议需要说明当前重复劳动、可验证结果，以及是否引入网络、凭证或自动化权限；
- 安全问题必须按照 [SECURITY.md](SECURITY.md) 私下提交。

不要公开未发布稿件、完整备份、Cookie、Token、API Key 或个人信息。较大功能、
架构变化或新的网络行为，请先开 Issue 对齐范围；小型修复和文档改进可以直接提交 PR。

## 开发

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # 类型检查
npm test           # 自动化测试
npm run build      # 构建
npm run verify     # 测试 + 类型检查 + 构建
npm run audit:ci   # 中危、高危与严重依赖漏洞检查
npm run security:secrets # 检查待提交文件中的高置信度凭证特征
```

## 本地新增一套排版主题

1. 打开 `src/themes/presets.ts`，仿照已有主题写一个 `Theme` 对象：键是标签选择器（`h2` / `p` / `blockquote` 等），值是 CSS 声明串。
2. 加进底部的 `THEMES` 数组，主题下拉会自动出现。
3. 只使用可内联属性，不要使用 `::before` 等伪元素；字体请使用系统字体栈。

## 代码与安全要求

- TypeScript 开启 `strict`；提交前运行 `npm run verify`。
- `core/` 保持框架无关，不依赖具体 UI；界面相关代码放在 `ui/`。
- 注释解释“为什么”，避免复述代码行为。
- 改动导入、恢复、网络资源、剪贴板、导出或数据删除逻辑时，必须增加覆盖相应安全边界的测试，并核对[威胁模型](docs/security/threat-model.md)。
- 不得提交 `.env`、私钥、访问令牌、真实备份、未发布稿件或 `.pro-workspace/` 内容。
- 使用生成式 AI 辅助的贡献仍由提交者负责；必须审查生成内容，并说明任何第三方来源或许可证约束。

## 贡献许可与 DCO

本仓库采用 Apache License 2.0 的 **inbound=outbound** 模式：除非另有明确书面约定，
你有意提交并被项目接收的贡献，将按照与本仓库相同的
[Apache License 2.0](LICENSE) 提供。贡献者保留其原创贡献的版权，不需要向项目转让版权。

每个提交都必须遵守 [Developer Certificate of Origin 1.1](https://developercertificate.org/)
并包含真实身份对应的 `Signed-off-by` 行。这表示你确认自己有权按本项目条款提交内容，
而不是仅作形式签名。

使用以下命令为提交添加签署：

```bash
git commit -s -m "describe the change"
```

如果需要补签最近一个尚未推送的提交：

```bash
git commit --amend --signoff --no-edit
```

Pull Request 应聚焦单一事项，说明用户影响、验证结果和第三方来源。维护者可以要求拆分、
补充测试、补签 DCO 或删除权利不明的内容。未满足许可证和 DCO 要求的贡献不会合并。

## 公共核心与 PRO 边界

本仓库只接收公共核心的代码、测试和文档。不要提交私有 PRO 源码、客户专用逻辑、
付费资料、凭证或客户数据。公共核心与私有产品边界见
[COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md)。
