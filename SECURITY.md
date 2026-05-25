# Security Policy

Easy Fill handles personal profile data, so privacy and safety are part of the core product scope.

## Supported versions

Security fixes are accepted for the current `main` branch.

## Reporting a vulnerability

Please open a private security advisory on GitHub if possible. If that is unavailable, create an issue with minimal public detail and ask for a maintainer contact path.

Useful reports include:

- what data or behavior is exposed
- which browser and extension version are affected
- steps to reproduce
- whether the issue requires a malicious page, local access, or extension permissions

## Security model

- Profile data is encrypted before being stored in browser extension storage.
- The extension does not use a hosted backend or analytics pipeline.
- Matching and filling logic run locally.
- The scanner intentionally ignores passwords, verification codes, payment fields, bank-card fields, and similar high-risk inputs.

## Responsible disclosure

Please give maintainers a reasonable window to investigate and ship a fix before publishing exploit details.
