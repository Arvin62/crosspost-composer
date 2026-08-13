# Public roadmap / 公开路线图

This roadmap records intended work, not promised dates. Priorities may change when
real user reports or security findings provide stronger evidence.

## Current baseline

- Browser-only HTML/Markdown import, editing, local image processing, platform
  preflight, rich clipboard output, HTML export, and full workspace backup.
- Local-first IndexedDB/localStorage design with no application backend.
- Default blocking of imported remote resources and explicit opt-in for remote images.
- Automated unit tests, type checking, production build, dependency audit, CodeQL,
  and GitHub Pages deployment.

## Next: security and recovery evidence

- Expand hostile import and backup restoration fixtures.
- Define and test safe limits for unusually large images and backups.
- Add browser-level tests for import, restore, clipboard, and export boundaries.
- Publish compatibility reports with browser, platform, account context, and date.

## Next: reusable developer surface

- Stabilize framework-independent sanitization and platform-transform interfaces.
- Evaluate a documented library and CLI for local conversion and preflight.
- Keep network access opt-in and exclude publishing credentials from the core.
- Publish examples only after the interface has tests and a versioning policy.

## Community and licensing decision

The repository currently uses PolyForm Noncommercial 1.0.0 and does not claim to
be OSI-approved open source. Before opening code pull requests, the maintainer will
audit authorship and third-party material, decide whether an OSI-licensed community
core is sustainable, and publish unambiguous inbound contribution terms. Until
then, reproducible Issues and compatibility evidence are the supported contribution
path; the license will not be relabeled without actually changing its permissions.
The current evidence and maintainer sign-off gate are tracked in the
[open-source readiness review](docs/governance/open-source-readiness.md).

## Adoption evidence

Project use will be reported only through verifiable public signals such as
independent issue reporters, external contributors or integrations, package or
release downloads, and dated compatibility reports. Stars are useful context but
will not be treated as proof of successful use.
The baseline and future evidence are recorded in the
[adoption and maintenance ledger](docs/governance/adoption-evidence.md).
