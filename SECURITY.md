# 安全政策 / Security Policy

图文排版台会处理未发布文章、图片和完整工作区备份。请不要在公开 Issue
中粘贴真实稿件、访问令牌、Cookie、API Key 或包含个人信息的备份。

Crosspost Composer processes unpublished articles, images, and full workspace
backups. Do not post real drafts, access tokens, cookies, API keys, or backups
containing personal information in a public issue.

## 支持范围 / Supported versions

安全修复面向 `main` 分支和最新正式版本。旧版本不单独提供安全更新；发现问题后，
维护者会在修复完成时说明最低安全版本。

Security fixes target the `main` branch and the latest release. Older releases
do not receive separate security updates. A fixed minimum version will be named
when a correction is released.

## 私下报告 / Private reporting

请通过仓库的 [Private vulnerability reporting](https://github.com/Arvin62/crosspost-composer/security/advisories/new)
提交安全问题。报告应尽量包含：

- 受影响的版本、浏览器和操作系统；
- 最小化且不含真实隐私数据的复现文件；
- 实际结果、预期结果和可能影响；
- 是否已经公开披露。

Please use the repository's [private vulnerability reporting form](https://github.com/Arvin62/crosspost-composer/security/advisories/new).
Include the affected version, browser and operating system, a minimal synthetic
reproducer, observed and expected behavior, impact, and disclosure status.

维护者计划在 5 个工作日内确认收到报告，在 10 个工作日内给出初步分级，并在未
解决期间至少每 14 天更新一次进度。这些是尽力而为的响应目标，不是服务等级承诺。

The maintainer aims to acknowledge reports within five business days, provide
initial triage within ten business days, and update unresolved reports at least
every fourteen days. These are best-effort targets, not an SLA.

## 本项目重点关注的安全问题 / Security-relevant reports

- 导入 HTML、Markdown 或备份后执行脚本或事件处理器；
- 未经用户明确选择，由图片、CSS、媒体或嵌入内容发起网络请求；
- 恶意备份绕过校验、破坏或不可逆覆盖本地工作区；
- 剪贴板或导出结果重新引入已清除的主动内容；
- 依赖、构建或 GitHub Actions 被篡改并影响发布产物；
- 仓库或构建流程中出现凭证、令牌或未发布内容。

Relevant findings include script execution from imported content, silent network
requests, malicious backup restoration, active content reappearing in clipboard
or export output, release supply-chain compromise, and credential or draft leaks.

目标平台自身的编辑器缺陷、浏览器厂商问题，以及只有在用户明确选择保留网络图片后
发生的正常图片请求，通常不属于本项目漏洞，除非图文排版台绕过了已经声明的安全边界。

See [the threat model](docs/security/threat-model.md) for assets, trust boundaries,
known limitations, and required security invariants.

## 协调披露 / Coordinated disclosure

请在修复版本发布或双方约定的日期之前保密。维护者会在不泄露报告人身份的前提下
发布修复说明；如报告人希望署名，请在报告中明确说明。

Please keep the report private until a fix is released or a disclosure date is
agreed. Fix notes will not identify the reporter unless attribution is requested.
