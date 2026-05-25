# Easy Fill

Easy Fill is a privacy-first browser extension for repetitive Chinese application forms.

It helps students and job seekers save their commonly used profile information locally, detect fields on web forms, match them with rule-based heuristics, and fill them with one click.

## Why this project exists

If you have ever filled out internship applications, graduate recommendation forms, scholarship systems, or school portals in China, you have probably repeated the same information dozens of times:

- name
- phone number
- email
- school
- college
- major
- grade
- rank
- GPA

Easy Fill is built to remove that repetition without turning your personal data into a cloud product.

## What makes it useful

- Local-first profile storage with encryption
- Works inside dynamic modals and same-origin iframes
- Handles common Chinese form patterns
- Supports text fields, custom dropdowns, and date pickers
- Rule-based matching that is explainable and stable
- No backend, no account system, no AI dependency

## Current capabilities

### Profile vault

- Stores a single structured profile locally
- Encrypts the saved profile with a master password
- Keeps data in the browser instead of syncing it to a server

### Form understanding

- Scans `input`, `textarea`, and `select`
- Extracts label text, placeholder, name, id, nearby text, and section context
- Supports dynamic pages that render fields after page load

### Matching engine

- Uses alias dictionaries and weighted signals
- Gives each candidate field a confidence score
- Keeps the logic deterministic and easy to debug

### Filling engine

- Fills plain text inputs
- Fills native `select` elements
- Clicks custom dropdown options
- Handles date-like inputs and calendar-style pickers
- Triggers DOM events so React/Vue-style forms update correctly

## How matching works

This version does **not** use a large model.

Matching is currently fully rule-based:

1. Extract page signals from each field
2. Compare them against known aliases in the profile schema
3. Score candidate matches with weighted heuristics
4. Pick the highest-confidence result

That means Easy Fill is fast, local, predictable, and cheap to run.

## Tech stack

- TypeScript
- React
- Plasmo
- Vitest

## Project structure

```text
src/
  background/    extension background worker
  content.ts     page scanning and overlay UI
  options/       profile vault editor
  popup/         extension popup
  lib/           matching, scanning, filling, storage, security
tests/           unit and integration tests
```

## Development

```bash
npm install
npm run dev
```

Build the extension:

```bash
npm run build
```

Run tests:

```bash
npm run test
```

## Load it in your browser

1. Run `npm run build`
2. Open `chrome://extensions` or `edge://extensions`
3. Turn on Developer Mode
4. Click "Load unpacked"
5. Choose `build/chrome-mv3-prod`

## Product direction

The project is intentionally focused on being a useful tool first.

Near-term improvements that would make it stronger:

- more Chinese alias coverage
- better site-specific control compatibility
- remembered field mappings per website
- import/export profile support
- optional profile templates for different scenarios

## Contributing

Contributions are welcome.

If you want to help, good starting areas are:

- improving field alias dictionaries
- adding compatibility for real-world school/job systems
- refining the matching heuristics
- improving docs and onboarding

See [CONTRIBUTING.md](C:\Users\25395\Documents\easy-fill\CONTRIBUTING.md) for more details.

## License

MIT. See [LICENSE](C:\Users\25395\Documents\easy-fill\LICENSE).
