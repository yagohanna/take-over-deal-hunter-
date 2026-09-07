# Takeover Deal Hunter — Public Frontend

Static HTML/CSS/JavaScript calculator for BUYREBSELL CORP. This is the public GitHub Pages
repository. The authoritative API lives in the separate private sibling `../backend` repository.
Legacy Python backend files are retained here for a separate preservation review; do not deploy
or extend them as the API. No server code is included in the static `dist/` build.

## Run and test

No runtime or development npm dependencies are needed. With Node.js and Python 3 installed:

```bash
npm test
npm run build
npm run preview
```

The package scripts run `node --test src/*.test.js`, build `dist/`, and serve it on port 4173.
`npm run dev` serves the source without a build. All asset/module URLs are relative and work
under `/take-over-deal-hunter-/` on GitHub Pages, whose current source is `main` at the repository root.

## Calculator and saved analyses

- **Calculate Deal**, live edits, the sample, copy, and print/PDF stay in the browser.
- **Save & analyze current deal** explicitly sends the property and financial inputs to the API.
- Complete the address, city/state/ZIP and every amount included in financial totals before saving.
  Blank amounts are not silently sent as zero. Enter zero only when known; optional value estimates
  and unit count can stay unknown. Payment estimates require principal, rate and amortization.
- **Refresh saved deals** and **Load saved summary** retrieve persisted results and evidence labels.
- Saved analyses use the API's standard DSCR/cash-on-cash grading. The browser grade also includes
  personal targets and due-diligence gaps. Current cap rate in the browser is based on current value;
  the saved summary clearly labels its cap rate on purchase price. Both cap-on-cost calculations
  include purchase, renovation and closing costs for new analyses.
- Subject-to and hybrid existing-loan/seller-financing summaries include the due-on-sale warning.
  A proposed assumption is kept distinct and requires lender approval.

`src/config.js` isolates the public Render base URL and timeout settings. On localhost/127.0.0.1,
preview uses `http://127.0.0.1:8000`; all deployed hosts use the configured public Render URL.
Start the private backend locally with `CORS_ORIGINS=http://127.0.0.1:4173` for browser tests.
Never add secrets to this repository or browser JavaScript.

The client allows 75 seconds per request and shows a waking-service message after 4 seconds.
It does not automatically retry writes. In-flight controls prevent repeated clicks; SHA-256
payload digests and random UUID request keys in session storage let a user retry identical inputs
after an uncertain response. Only digests/keys are stored there, never addresses or financial inputs.
The backend atomically records keys to prevent duplicate rows, including concurrent requests.
A network failure never removes the browser calculation. Edits during a save do not display the
old response as if it analyzed the new inputs.

## Access and deployment

The current API has no authentication or per-user access controls. Saved records are accessible
without signing in. This integration is suitable only for non-confidential screening data until
access control is implemented in a separately approved phase. CORS restricts browser origins but
is not authentication. No documents, credentials, Gmail, AI, scraping or outreach are added here.

Review and deploy the private backend PR before this frontend PR. The older API does not accept
all new fields or request keys. Do not merge either PR without the owner's approval.
