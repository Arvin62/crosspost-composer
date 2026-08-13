# Adoption and maintenance evidence / 采用与维护证据

This ledger records verifiable public evidence. It is intentionally conservative:
a star is interest, not proof of use; a maintainer-authored Issue is work planning,
not external adoption; and private messages are not counted without the sender's
permission and a public, non-sensitive record.

本台账只记录可以复核的公开证据。Star 代表关注，不等于真实使用；维护者自己创建的
Issue 只代表计划，不算外部采用；私聊反馈在没有获得公开许可前不计入申请材料。

## Baseline snapshot — 2026-08-12

| Signal | Verified value | Evidence boundary |
|---|---:|---|
| GitHub stars | 0 | Repository public counters |
| GitHub forks | 0 | Repository public counters |
| Public contributors | 1 | Git commit history; Arvin62 is the sole recorded author |
| Public releases | 1 | `v1.0.0`, published 2026-08-09 |
| Open Issues | 0 | No external feedback recorded at baseline |
| Pull requests | 0 | External code contributions are not yet open |
| Package downloads | Not applicable | No npm package has been published |
| Public integrations | None verified | Do not infer integrations from page visits or private use |

Repository: <https://github.com/Arvin62/crosspost-composer>

## Current public snapshot — 2026-08-13

| Signal | Verified value | Evidence boundary |
|---|---:|---|
| GitHub stars | 0 | Repository public counters; do not describe this as broad adoption |
| GitHub forks | 0 | Repository public counters |
| Public contributors | 1 | Arvin62 remains the sole recorded human contributor |
| Public releases | 3 | `v1.0.0`, `v1.1.0`, and `v1.1.1` |
| Open Issues | 0 | No independent public issue report has been recorded |
| Pull request activity | 12 total | 6 maintainer PRs merged; 6 Dependabot proposals remain under review |
| Package downloads | Not applicable | No npm package has been published |
| Public integrations | None verified | The deployed Pages app is a distribution channel, not an independent integration |

This snapshot proves active maintenance and a reproducible public release process.
It does not prove independent adoption. Applications must disclose the zero-star,
zero-fork state and explain the project's ecosystem role without implying usage
that has not been publicly verified.

## Maintenance events

| Date | Event | Public evidence | Maintainer responsibility demonstrated |
|---|---|---|---|
| 2026-08-09 | Initial public release | [`v1.0.0`](https://github.com/Arvin62/crosspost-composer/releases/tag/v1.0.0) | Packaging, documentation, and Pages delivery |
| 2026-08-09 | Blocked silent external-resource loading during import | [`88e04e1`](https://github.com/Arvin62/crosspost-composer/commit/88e04e1) | Privacy boundary and hostile-input maintenance |
| 2026-08-13 | Added public security policy, threat model, CI, CodeQL, dependency automation, and structured contribution workflows | [PR #1](https://github.com/Arvin62/crosspost-composer/pull/1) | Security hardening, review gates, release safety, and long-term maintenance governance |
| 2026-08-13 | Approved and prepared the Apache-2.0 community-core transition and DCO contribution policy | [PR #8](https://github.com/Arvin62/crosspost-composer/pull/8) | Rights review, licensing accountability, public/private boundary, and third-party contribution readiness |
| 2026-08-13 | Added a one-shot format painter and local-date-first safe export filenames | [PR #9](https://github.com/Arvin62/crosspost-composer/pull/9) | User-facing implementation, hostile-attribute tests, browser acceptance, and release-note maintenance |
| 2026-08-13 | Published the second public release with an attached static build and recorded digest | [`v1.1.0`](https://github.com/Arvin62/crosspost-composer/releases/tag/v1.1.0) | Version alignment, release packaging, license-notice delivery, and post-merge verification |
| 2026-08-13 | Protected `main` with required current CI and CodeQL checks, PR-only changes, resolved discussions, and disabled force-push/deletion | [`main` branch API](https://api.github.com/repos/Arvin62/crosspost-composer/branches/main) | Enforced review path and release integrity for the sole maintainer |
| 2026-08-13 | Removed five high-severity CodeQL findings in hostile import and text-metrics paths, added regression coverage, and published a verified security patch | [PR #12](https://github.com/Arvin62/crosspost-composer/pull/12) and [`v1.1.1`](https://github.com/Arvin62/crosspost-composer/releases/tag/v1.1.1) | Alert triage, root-cause remediation, protected-branch verification, and security release response |

Add a maintenance event only after its commit, Issue, advisory, PR, release, or
compatibility report is publicly accessible. Security details must remain private
until coordinated disclosure.

## External adoption signals

No external adoption signal has been verified at the baseline date. Future entries
must identify the public Issue, contributor, integration, release download source,
or consented case study. Do not list usernames from private conversations.

| Date | Signal type | Public evidence | What it proves | What it does not prove |
|---|---|---|---|---|
| — | — | — | — | — |

## Compatibility evidence

Compatibility reports must include the destination platform, browser, operating
system, account context without identifiers, test date, synthetic fixture, output
path, and preview result. Reports authored by the maintainer prove maintenance
work; independent reports additionally prove external use.

| Date | Platform | Reporter relationship | Public report | Result |
|---|---|---|---|---|
| — | — | — | — | — |

## Application gate

As of 2026-08-13, the project must not be described as broadly adopted or as having
independent community users. An application may accurately rely on its active
maintenance record, three public releases, deployed local-first workflow, security
boundaries, and niche ecosystem value while disclosing 0 stars and 0 forks. Before
making a future adoption claim, this ledger should contain several independent
external signals over time and at least one public contribution or integration.
These are internal evidence standards, not published OpenAI numeric requirements.
