# Open-source readiness review / 开源准备审计

Review date: 2026-08-12

This is a repository evidence review, not legal advice. It records what can be
verified from the current Git history and installed packages, and separates that
evidence from the maintainer attestations still required before relicensing.

本文件记录当前仓库可验证的作者、依赖、分发和授权证据，不替代法律意见，也不会
自动改变现有许可证。在维护者完成待确认事项之前，项目继续使用 PolyForm
Noncommercial 1.0.0，并继续明确说明自己不是 OSI 定义的开源软件。

## Current conclusion / 当前结论

The public V1 codebase is technically compatible with a future Apache-2.0
community-core release: it has one recorded Git author, no submodules or vendored
source tree, and only permissively licensed runtime dependencies. The remaining
blocker is not dependency compatibility; it is the maintainer's written
confirmation that all repository-owned code, documentation, themes, and artwork
are original or otherwise eligible for relicensing.

当前公开 V1 在技术上具备转换为 Apache-2.0 社区核心的条件：Git 历史只有一位记录
作者，没有子模块或直接复制进仓库的第三方源码，运行时依赖均允许宽松再分发。
尚未满足的关键条件，是维护者需要确认所有自有代码、文档、主题和图片均为原创，
或已经取得足以重许可的权利。

## Evidence matrix / 证据矩阵

| Area | Evidence verified on 2026-08-12 | Status |
|---|---|---|
| Commit authorship | Public history contains two commits, both authored by `Arvin62` | Verified, but Git attribution alone is not proof of copyright ownership |
| Vendored code | No Git submodules, vendored source directory, copied SDK, font, icon pack, or external image file was found | Verified for the current tree |
| Runtime dependencies | DOMPurify 3.4.13 is used under Apache-2.0 from its dual license; Marked 18.0.7 is MIT | Compatible with Apache-2.0 distribution |
| Development dependencies | TypeScript is Apache-2.0; Vite, jsdom, and `@types/jsdom` are MIT and are not shipped as application source | Compatible |
| Distributed notices | The production build includes `third-party-licenses.txt` with DOMPurify and Marked notices | Verified |
| Repository artwork | `docs/hero.svg` contains local vector shapes, gradients, filters, and system-font references; it does not embed an external image or font | Technical inspection complete; authorship attestation pending |
| Private product separation | `.pro-workspace/` is excluded from Git and is not part of the public V1 distribution | Verified locally; keep this invariant in review and CI |
| Inbound contributions | External code PRs are currently paused and there are no external contributors in public history | No third-party contributor consent is currently needed; policy must change before accepting code |

## Maintainer attestations still required / 维护者仍需确认

Before changing `LICENSE`, the copyright holder should confirm all of the following
in the relicensing pull request:

- all non-dependency source files were written by Arvin62 or created on Arvin62's
  behalf with rights that allow open-source relicensing;
- no implementation was copied from a repository, paid template, commercial
  editor, browser extension, book, course, or code answer with incompatible terms;
- `docs/hero.svg`, theme presets, product copy, and documentation are original or
  have explicit relicensing permission;
- no employer, client, studio, or other organization owns or restricts the work;
- the public tree contains no private PRO source, customer material, credentials,
  unpublished articles, or personal data.

这些确认不能由提交用户名、代码风格或自动扫描代替。若任何一项不能确认，应先删除、
重写或单独取得许可，而不是直接更换 LICENSE 文件。

## Recommended target model / 推荐授权结构

### Public community core

Use Apache License 2.0 for the browser application and reusable conversion core.
Apache-2.0 is OSI-approved, permits commercial use, includes an express patent
grant, and is compatible with the selected licenses of the current runtime
dependencies. The public repository should include:

- the unmodified Apache-2.0 text as `LICENSE`;
- an accurate `NOTICE` file and the existing third-party notices;
- `"license": "Apache-2.0"` in package metadata;
- README language that describes the repository as open source without a
  noncommercial restriction;
- a contribution policy using Apache-2.0 inbound=outbound terms plus a Developer
  Certificate of Origin sign-off, unless legal advice establishes a need for a CLA.

Apache-2.0 already allows commercial use of contributions. A private hosted service
or separate PRO product may build on the public core without requiring contributors
to assign copyright, provided applicable Apache notices and license obligations are
preserved in distributions.

### Private PRO product

Keep customer-specific workflows, hosted services, private integrations, premium
automation, and commercial support outside the submitted public repository. The
boundary must be architectural and visible in Git, not merely described in pricing
copy. Public security fixes to shared core code should be released publicly first
or at the same time as the private product update.

## Relicensing change set / 重许可变更清单

When the maintainer attestations are complete, perform the transition atomically in
one reviewed pull request:

1. replace PolyForm Noncommercial with the canonical Apache-2.0 license text;
2. add `NOTICE` and retain third-party license notices;
3. update `package.json`, README files, in-app license link and commercial-license
   wording so no noncommercial restriction remains on the public core;
4. replace the current PR pause with Apache-2.0 inbound contribution terms and a
   DCO sign-off requirement;
5. document the exact public-core/private-PRO boundary without publishing private
   source or customer data;
6. run tests, type checking, production build, dependency audit, secret scan, and
   inspect the built distribution before merging;
7. publish a release that clearly states the effective version and date. Earlier
   copies remain governed by the license under which they were distributed.

## Decision record / 决策记录

- Current license: PolyForm Noncommercial 1.0.0.
- Recommended future public-core license: Apache-2.0.
- Decision owner: Arvin62.
- Decision status: pending maintainer attestations and explicit approval.
- No license change was made by this review.

Primary references:

- [OSI approved license list](https://opensource.org/licenses)
- [Apache guidance for applying Apache-2.0](https://www.apache.org/legal/apply-license)
- [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0)
