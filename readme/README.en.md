# Easy Fill

<p align="center">
  <a href="../README.md">zh_CN 简体中文</a> ·
  <strong>en English</strong> ·
  <a href="README.ja.md">ja 日本語</a>
</p>

<p align="center">
  <a href="https://github.com/WLwl1/easy-fill/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/WLwl1/easy-fill/actions/workflows/ci.yml/badge.svg"></a>
  <a href="../LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-green.svg"></a>
  <a href="#install"><img alt="Chrome and Edge" src="https://img.shields.io/badge/browser-Chrome%20%7C%20Edge-blue"></a>
</p>

![Easy Fill demo screenshot](../assets/demo-screenshot.png)

Easy Fill is a privacy-first browser extension for repetitive Chinese application forms. It helps students and job seekers save profile information locally, detect web form fields, match them with deterministic heuristics, and fill them with one click.

The core value is simple: Chinese application forms, local privacy, no AI dependency, and no backend.

## Who It Is For

- Students filling internship, scholarship, graduate-school, recommendation, or campus portal forms
- Users dealing with Chinese labels, dynamic modals, date pickers, and custom dropdowns
- People who want autofill without uploading personal data to a cloud service
- Developers interested in browser extensions, form understanding, and privacy-first tooling

## Highlights

- Local encrypted profile vault protected by a master password
- No account system, backend, telemetry, or AI API calls
- Works with dynamic pages, modals, and same-origin iframes
- Supports text fields, native selects, custom dropdowns, and date-like inputs
- Explainable rule-based matching instead of opaque model decisions
- Ignores high-risk fields such as passwords, verification codes, bank cards, CVV, and payment fields

## Install

| Channel | Status | Link |
| --- | --- | --- |
| Chrome Web Store | Preparing release | Replace with store link after publishing |
| Microsoft Edge Add-ons | Preparing release | Replace with store link after publishing |
| Local development install | Available | See steps below |

Local install:

```bash
npm install
npm run build
```

Open `chrome://extensions` or `edge://extensions`, enable Developer Mode, click "Load unpacked", and choose `build/chrome-mv3-prod`.

## Demo

- [Open the demo form](../docs/demo.html)
- Save a test profile in the extension options page
- Open the Easy Fill popup on the demo page to scan and fill Chinese application fields

The demo page is static and does not collect data.

## Development

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run typecheck
npm test
npm run build
```

## How Matching Works

Easy Fill does not use a large language model. The current matching flow is:

1. Scan `input`, `textarea`, and `select` fields
2. Extract label text, placeholder, name, id, aria-label, nearby text, and section context
3. Compare those signals with profile field aliases using weighted heuristics
4. Fill high-confidence matches and keep uncertain matches confirmable

This keeps the extension fast, local, predictable, and cheap to run.

## Tech Stack

- TypeScript
- React
- Plasmo
- Vitest

## Roadmap

See [ROADMAP.md](../ROADMAP.md).

## License

MIT. See [LICENSE](../LICENSE).
