<h1 align="center">Crosspost Composer</h1>

<p align="center">
  <strong>Insert images once. Paste to multiple publishing platforms.</strong><br>
  A browser-based, local-first rich-text workspace with no account or installation required.
</p>

<p align="center">
  <a href="https://arvin62.github.io/crosspost-composer/"><strong>Open the web app</strong></a> ·
  <a href="README.md">中文</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-3b82f6?style=flat-square" alt="PolyForm Noncommercial License 1.0.0"></a>
  <a href="COMMERCIAL-LICENSE.md"><img src="https://img.shields.io/badge/commercial%20use-license%20required-f59e0b?style=flat-square" alt="Commercial use requires a license"></a>
</p>

<p align="center">
  <img src="docs/hero.svg" alt="Crosspost Composer product overview" width="920">
</p>

## What it does

Crosspost Composer is built for creators who distribute the same illustrated article to multiple content platforms. Prepare the text, images, and layout in one browser workspace, run a platform-specific preflight, and paste the result into the target editor.

The web app requires no account, backend, terminal, or local installation.

> **Licensing:** Qualifying personal and noncommercial use is free. Business, workplace, paid client, monetized publishing, resale, hosted-service, and commercial integration use requires a separate [commercial license](COMMERCIAL-LICENSE.md). The source is available, but this is not OSI-approved open-source software.

## Workflow

**Import an article → add and arrange images → choose a theme → run preflight → copy and publish**

## Key features

- Import HTML or Markdown and edit with a focused rich-text toolbar.
- Paste, drag, compress, crop, rotate, caption, align, and reorder images.
- Apply built-in themes and inline compatible styles when copying.
- Generate platform-specific output for WeChat, Toutiao/Baijiahao, Autohome, Zhihu, and generic rich-text editors.
- Manage multiple documents, autosaves, manual snapshots, search, outline navigation, and find/replace.
- Export or restore a full JSON backup containing documents, embedded images, snapshots, and settings.

## Privacy

The application has no account system, content backend, analytics, or cloud sync. Documents and images stay in the current browser's IndexedDB and localStorage. Export a full backup before changing browsers, devices, or site data.

The public web app is hosted on GitHub Pages, which may process basic access information such as visitor IP addresses under [GitHub's own policies](https://docs.github.com/pages/getting-started-with-github-pages/what-is-github-pages#data-collection).

## Platform notes

| Platform | Status | Notes |
|---|:---:|---|
| WeChat Official Accounts | ✅ | Images and inline styles have the best retention |
| Toutiao / Baijiahao | ✅ | Structure and images are retained; the platform may normalize styles |
| Autohome | ✅ | Rich-text paste supported; final appearance depends on the editor |
| Zhihu | ⚠️ | Semantic HTML only; embedded images must be replaced with public URLs |

## Local development

Requires Node.js 22.12 or later.

```bash
git clone https://github.com/Arvin62/crosspost-composer.git
cd crosspost-composer
npm ci
npm run dev
```

```bash
npm test
npm run typecheck
npm run build
```

## License

Copyright 2026 Arvin62.

- Qualifying personal and noncommercial use is available under the [PolyForm Noncommercial License 1.0.0](LICENSE).
- Commercial use requires a separate written [commercial license](COMMERCIAL-LICENSE.md) from Arvin62 before use.
- Third-party components remain under their respective licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

This is source-available software, not OSI-approved open-source software.
