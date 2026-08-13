# Open-source readiness review / 开源准备审计

- Initial review: 2026-08-12
- Maintainer approval: 2026-08-13

This is a repository evidence and decision record, not legal advice. It documents
the checks completed before the public core moved from PolyForm Noncommercial
1.0.0 to Apache License 2.0.

本文件记录公共核心重许可前完成的权属、依赖、分发和私有产品边界审查，不替代法律意见。
维护者于 2026-08-13 完成权利确认并批准 Apache-2.0；该许可适用于从本次变更起发布的
公共仓库版本，早期已分发副本继续遵循其获得时的许可证。

## Conclusion / 结论

The public repository is eligible for Apache-2.0 relicensing based on the verified
tree and the copyright holder's attestation. The transition is implemented
atomically with the canonical license text, NOTICE, package metadata, public
documentation, contribution terms, and distributed third-party notices.

公共仓库已经具备采用 Apache-2.0 的条件。本次变更同时更新完整许可证、NOTICE、包元数据、
公开文档、贡献条款和第三方声明，避免“允许商用”与“禁止商用”的表述同时存在。

## Evidence matrix / 证据矩阵

| Area | Evidence verified | Status |
|---|---|---|
| Repository authorship | GitHub listed `Arvin62` as the sole public contributor at the decision date | Verified; maintainer attestation supplies the rights confirmation that Git attribution alone cannot prove |
| Vendored code | No Git submodules, vendored source directory, copied SDK, font, icon pack, or external image file was found | Verified for the transition tree |
| Runtime dependencies | DOMPurify 3.4.13 is selected under Apache-2.0 from its dual license; Marked 18.0.7 is MIT | Compatible |
| Development dependencies | TypeScript is Apache-2.0; Vite, jsdom, and `@types/jsdom` are permissively licensed and are not shipped as application source | Compatible |
| Distributed notices | The production build contains `third-party-licenses.txt`; repository distributions retain `THIRD_PARTY_NOTICES.md` and `NOTICE` | Verified |
| Repository artwork | `docs/hero.svg` contains local vector shapes, gradients, filters, and system-font references; it embeds no external image or font | Technical review and authorship attestation complete |
| Private product separation | `.pro-workspace/` is ignored and absent from the public Git tree | Verified; proprietary PRO components remain outside this repository |
| Inbound contributions | No external contributor code was present before relicensing | No third-party relicensing consent required for the transition |

## Maintainer attestation / 维护者确认

On 2026-08-13, Arvin62 confirmed that the public repository's owned code,
documentation, themes, data, and artwork are original or otherwise controlled with
rights sufficient for Apache-2.0 relicensing. The maintainer also confirmed that:

- no implementation in the public tree is subject to an incompatible repository,
  template, course, code-answer, employer, client, or studio restriction;
- no private PRO source, customer material, credential, unpublished article, or
  personal data is included in the public tree;
- the maintainer understands that Apache-2.0 permits commercial use, modification,
  and redistribution, and that permissions already granted for a published version
  cannot later be withdrawn from recipients of that version.

These attestations are copyright-holder statements; automated scans and Git
metadata were used only as supporting evidence.

## Adopted licensing model / 已采用的授权结构

### Public community core

The browser application, reusable conversion core, tests, and public documentation
in this repository use Apache License 2.0. The distribution includes:

- the canonical Apache-2.0 text as `LICENSE`;
- project attribution in `NOTICE` and the public/private boundary in
  `COMMERCIAL-LICENSE.md`;
- `"license": "Apache-2.0"` in package metadata;
- third-party notices in both repository and web-distribution forms;
- Apache-2.0 inbound=outbound contribution terms plus Developer Certificate of
  Origin sign-off requirements.

Contributors retain copyright in their original contributions. Apache-2.0 already
permits commercial use, so public-core contributors are not asked to assign
copyright for a separate commercial relicensing program.

### Private PRO product

Customer-specific workflows, hosted services, private integrations, premium
automation, support, and unpublished proprietary code remain outside this public
repository. If a private product reuses the public core, the public-core portion
remains under Apache-2.0. Public security fixes to shared core code should be
released publicly first or at the same time as private-product updates.

See [COMMERCIAL-LICENSE.md](../../COMMERCIAL-LICENSE.md) for the public-core and
private-product boundary. That document does not restrict rights granted by
Apache-2.0.

## Transition checklist / 转换清单

- [x] Copyright holder confirmed ownership and relicensing authority.
- [x] Canonical Apache-2.0 text replaced the former repository license.
- [x] `NOTICE`, README files, application footer, package metadata, and third-party
      notices were aligned.
- [x] Noncommercial-only wording was removed from current-version documentation.
- [x] Contribution policy changed to Apache-2.0 inbound=outbound plus DCO sign-off.
- [x] Public-core/private-PRO separation was documented without publishing private
      source or customer data.
- [x] Local tests, type checking, build, dependency audit, secret scan, and
      built-distribution inspection passed on the transition branch.
- [x] GitHub pull-request verify and CodeQL checks passed for PR #8.
- [ ] After merge, publish a dated release that identifies the first Apache-2.0
      version. Earlier copies remain governed by their original distribution terms.

## Decision record / 决策记录

- Previous public license: PolyForm Noncommercial 1.0.0.
- Approved public-core license: Apache-2.0.
- Decision owner: Arvin62.
- Approval date: 2026-08-13.
- Effective boundary: public repository versions published from this transition
  onward; private PRO components not published here remain separate.

Primary references:

- [OSI approved license list](https://opensource.org/licenses)
- [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- [Apache guidance for applying Apache-2.0](https://www.apache.org/legal/apply-license)
- [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0)
