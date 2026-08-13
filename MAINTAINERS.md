# Maintainers / 维护者

## Current maintainer

| Maintainer | Role | Responsibilities |
|---|---|---|
| [Arvin62](https://github.com/Arvin62) | Creator and sole maintainer | Product direction, issue triage, security response, code review, releases, Pages deployment, and licensing decisions |

There is currently one maintainer with repository write and release authority.
This is stated explicitly so users can evaluate the project's bus factor and so
future changes in responsibility are publicly auditable.

目前由一名维护者承担仓库写入、Release 和安全响应责任。公开这一事实，是为了让用户
能够判断维护风险，也让后续权限变化有可核验的记录。

## Maintenance commitments

- Triage reproducible bug and compatibility reports without requiring users to
  disclose unpublished articles.
- Treat security reports under [SECURITY.md](SECURITY.md) as private until a fix
  or coordinated disclosure date is agreed.
- Require tests for changes to import sanitization, backup restoration, network
  behavior, clipboard output, or destructive data operations.
- Record user-visible changes in release notes and publish releases from reviewed,
  passing commits.
- Disclose project-owned network requests, storage behavior, and material license
  changes before release.
- Never count generated accounts, reciprocal stars, or fabricated feedback as
  project adoption.
- Keep the [adoption and maintenance evidence ledger](docs/governance/adoption-evidence.md)
  tied to public Issues, commits, releases, compatibility reports, or consented cases.

## Adding or removing maintainers

Maintainer access is earned through sustained, reviewed work such as reproducible
issue triage, security fixes, compatibility testing, documentation, and release
support. A future maintainer change must update this file in the same pull request
and describe the granted responsibilities. Removing access for security or
inactivity must also be recorded without exposing private incident details.

Code contributions are accepted under Apache-2.0 inbound=outbound terms with a
Developer Certificate of Origin sign-off. Maintainers verify contribution rights,
security-sensitive changes, and the public-core/private-PRO boundary before merge;
see [CONTRIBUTING.md](CONTRIBUTING.md).
