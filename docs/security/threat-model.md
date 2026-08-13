# Threat model / 威胁模型

Last reviewed: 2026-08-12

This document describes the current browser-only V1 application. It is an
engineering boundary, not a claim that the software is vulnerability-free.

## Assets to protect

- unpublished article text, embedded images, titles, and document history;
- full JSON backups, which can contain the complete workspace;
- the integrity of copied and exported HTML;
- browser storage owned by this application;
- the integrity of source, dependencies, CI workflows, and deployed Pages assets.

The application has no backend, account system, analytics, cloud sync, API keys,
or server-side code. GitHub Pages and a user's destination publishing platform
remain separate services with their own data handling.

## Trust boundaries

| Input or boundary | Why it is untrusted | Required handling |
|---|---|---|
| Imported HTML or Markdown | May contain scripts, event handlers, embeds, tracking pixels, remote CSS, or hostile URLs | Neutralize resource-loading attributes before parsing, sanitize active content, and block external images by default |
| Local image files | May be oversized, malformed, or misleadingly named | Decode through browser image APIs, constrain processing options, and never execute file contents |
| JSON workspace backup | May contain hostile HTML, duplicate IDs, invalid settings, or very large payloads | Validate the format and records, sanitize every document and snapshot, and preserve a pre-restore backup |
| Clipboard and exported HTML | Leaves this application's control and is parsed by another editor | Generate from sanitized editor state and apply only explicit platform transforms |
| Optional remote images | Contacting the host discloses the user's IP and may return changing content | Require an explicit user choice, set `no-referrer`, and show a privacy warning |
| npm dependencies and GitHub Actions | A compromised package or mutable workflow reference can affect builds and releases | Lock dependencies, review automated updates, pin Actions to commit SHAs, run CI and CodeQL |
| Third-party contributions | A patch can weaken sanitization, add egress, or expose local data | Require focused review, security tests, and documented contribution terms before merging |

## Primary abuse cases

### Active-content execution

An attacker sends an HTML, Markdown, or backup file containing scripts, event
attributes, forms, embedded documents, or dangerous URLs. Opening the file must
not execute attacker-controlled code. `DOMPurify` is a defense-in-depth layer;
resource-bearing attributes are neutralized before browser parsing so cleaning
the document cannot itself trigger a request.

### Silent network egress

An imported tracking pixel, CSS `url()`, `@import`, iframe, media element, or
protocol-relative resource could reveal the user's IP and document-open time.
All such resources must be removed by default. Only remote images have an
explicit opt-in path; scripts, remote styles, media, and embedded pages do not.

### Persistent malicious backup

A hostile backup can attempt to store active HTML so that it executes after a
reload, or can abuse duplicate records to produce inconsistent state. Restore
must validate the backup version and record relationships, sanitize documents
and snapshots, deduplicate IDs deterministically, and update IndexedDB in one
transaction. The UI downloads the current workspace before replacement.

### Data loss or resource exhaustion

Large embedded images and backups can exhaust memory or browser quota. Current
image settings constrain dimensions and compression, but V1 does not yet enforce
a hard total-backup size limit. Users must treat full backups as sensitive and
keep an external copy before clearing site data. Size limits and failure-safe
restore tests remain roadmap work.

### Release supply-chain compromise

A malicious dependency update, compromised contributor account, or mutable
GitHub Action could alter deployed JavaScript. Dependencies are locked, direct
dependency licenses are recorded, CI runs tests/typecheck/build/audit, CodeQL
scans JavaScript/TypeScript, and workflow actions are pinned to commit SHAs.
Dependabot proposals still require maintainer review before merge.

## Security invariants

Changes must preserve all of the following:

1. Imported or restored content cannot execute scripts or event handlers.
2. Import parsing cannot contact external resources before the user opts in.
3. External images are blocked by default; opt-in images use `no-referrer`.
4. Sanitization applies again when restoring persisted HTML.
5. No article text, image, backup, credential, or analytics event is sent by an
   application-owned backend because no such backend exists.
6. Clipboard and export output are derived from sanitized application state.
7. CI, deployment, and analysis workflows use least-privilege permissions and
   commit-pinned third-party actions.

## AI and agent boundary

V1 has no model integration, prompt execution, agent loop, shell access, file
system authority, or API credential handling. Prompt injection is therefore not
a current runtime attack surface. If an AI or agent feature is proposed later,
imported articles must be treated as untrusted data rather than instructions;
network, filesystem, shell, publishing, and credential access must remain
separately authorized and covered by new threat-model tests before release.

## Verification

- `npm test` covers resource classification, CSS resource removal, and hostile
  import sanitization using a browser-like DOM.
- `npm run typecheck` checks TypeScript boundaries.
- `npm run build` proves the static production bundle can be generated.
- `npm run audit:ci` fails on known moderate, high, or critical dependency advisories.
- `npm run security:secrets` checks tracked and unignored files for high-confidence
  credential patterns; it supplements, but does not replace, GitHub secret scanning
  or a review of repository history.
- GitHub CodeQL analyzes JavaScript and TypeScript changes.

Security reports follow [SECURITY.md](../../SECURITY.md).
