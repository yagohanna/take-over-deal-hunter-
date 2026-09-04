# Codex Instructions — Takeover Deal Hunter Frontend

This repository is the **public frontend** for BUYREBSELL CORP's Takeover Deal Hunter.

## Project context

When this repository is opened inside a parent workspace, the intended layout is:

```text
Takeover-Deal-Hunter/
  frontend/   # this repository
  backend/    # clone of yagohanna/takeover-deal-hunter-backend
```

Inspect the sibling `../backend` repository when a task involves API behavior, but make separate commits in each repository.

## Non-negotiable rules

- This repository is public and deployed with GitHub Pages.
- Never add API keys, OAuth tokens, database URLs, passwords, private loan documents, or other secrets.
- Do not copy backend server code, database files, migrations, or private configuration into this repository.
- Preserve GitHub Pages compatibility and use relative asset paths.
- Do not expose internal database credentials or privileged backend operations in browser JavaScript.
- Do not enable autonomous email sending, scraping, SMS, calls, offers, LOIs, negotiation, or financial commitments without explicit approval.
- Subject-to analyses must display the due-on-sale warning and must never be described as approved assumptions.
- Missing values must display as unknown or estimated; never fabricate financial information.

## Development workflow

Before editing:

1. Read `README.md`, `package.json`, and the existing frontend files.
2. Inspect the current git status.
3. Preserve all working calculator, summary, copy, print, and PDF behavior.
4. Test locally and verify the deployed-path behavior expected by GitHub Pages.

When connecting to the backend:

- Use only the public API base URL through a clearly isolated configuration value.
- Configure CORS in the private backend for the exact GitHub Pages origin.
- Handle Render cold starts, timeouts, validation errors, and unavailable API responses gracefully.
- Never place secrets in frontend code.

Use a pull request for substantial production changes and summarize tests plus deployment impact before merging.
