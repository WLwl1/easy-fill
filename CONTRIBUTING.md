# Contributing to Easy Fill

Thanks for considering contributing.

## Good first contribution areas

- Add Chinese field aliases for real-world forms
- Improve compatibility with school portals and job sites
- Add tests for new field types and page structures
- Refine popup/options UX
- Improve docs, examples, and onboarding

## Development workflow

```bash
npm install
npm run dev
```

Run tests before submitting changes:

```bash
npm run test
```

Build the extension locally:

```bash
npm run build
```

## Pull request guidelines

- Keep changes focused
- Add tests when behavior changes
- Preserve local-first and privacy-first behavior
- Prefer deterministic matching logic over opaque magic

## Bug reports

When reporting a bug, include:

- the target website or system type
- the field that failed
- what Easy Fill suggested
- what actually happened
- screenshots if possible

## Feature requests

Useful requests are concrete. Example:

- "Support Ant Design date picker day selection"
- "Remember field mapping per domain"
- "Add aliases for Chinese scholarship forms"
