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

## Maintenance events

| Date | Event | Public evidence | Maintainer responsibility demonstrated |
|---|---|---|---|
| 2026-08-09 | Initial public release | [`v1.0.0`](https://github.com/Arvin62/crosspost-composer/releases/tag/v1.0.0) | Packaging, documentation, and Pages delivery |
| 2026-08-09 | Blocked silent external-resource loading during import | [`88e04e1`](https://github.com/Arvin62/crosspost-composer/commit/88e04e1) | Privacy boundary and hostile-input maintenance |
| 2026-08-13 | Added public security policy, threat model, CI, CodeQL, dependency automation, and structured contribution workflows | [PR #1](https://github.com/Arvin62/crosspost-composer/pull/1) | Security hardening, review gates, release safety, and long-term maintenance governance |

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

Before describing the project as having real community adoption in an application,
the ledger should contain several independent external signals over time, at least
one public contribution or integration, and multiple releases tied to actual user
or security needs. These are internal evidence standards, not published OpenAI
numeric requirements.
