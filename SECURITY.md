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
- The master password is kept only in the extension background worker memory after unlock. It is not written to local or session extension storage.
- The extension does not use a project-hosted backend or analytics pipeline.
- Matching and filling logic run locally by default.
- Optional API recognition is disabled by default. When enabled, it sends page field metadata and available profile field names/aliases to the configured OpenAI-compatible endpoint, but not stored profile values such as names, phone numbers, email addresses, or addresses.
- The optional API key is stored in browser extension local storage and is used only by the background worker for recognition requests.
- Extension storage is restricted to trusted extension pages, and profile previews are rendered inside a closed Shadow DOM so page scripts cannot read them.
- The scanner intentionally ignores passwords, verification codes, payment fields, bank-card fields, and similar high-risk inputs.
- Third-party contact fields, such as emergency contacts, are kept out of one-click autofill and require manual confirmation.

## Responsible disclosure

Please give maintainers a reasonable window to investigate and ship a fix before publishing exploit details.
