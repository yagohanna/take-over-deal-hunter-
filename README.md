# Takeover Deal Hunter

Takeover Deal Hunter is a static, responsive real-estate acquisition calculator for conventional and creative-financing scenarios. It models conventional loans, assumptions, subject-to acquisitions, seller financing, and combinations of existing debt with seller financing. All arithmetic is deterministic JavaScript executed in the browser; information is not sent to a server or stored in a database.

## Features

- Property basis, current/after-repair value, renovation, closing costs, reserves, and per-unit analysis
- Rental/other income, vacancy, and itemized monthly operating costs
- Existing-loan payment override or an estimated amortized payment
- Seller-financing payment and balloon-term capture
- Targets, cash required, NOI, cap rate, DSCR, cash flow, cash-on-cash return, seller equity, and break-even occupancy
- Green/yellow/red screening indicators, a subject-to warning, sample deal, reset, and print/PDF summary
- Relative asset paths and no runtime dependencies, APIs, authentication, or paid services

## Metric definitions

| Metric | Calculation |
| --- | --- |
| Gross potential income | Monthly rent + other monthly income; annual is monthly × 12 |
| Effective income | Gross potential income × (1 − vacancy rate) |
| Operating expenses | Sum of taxes, insurance, owner utilities, maintenance, management, capital reserves, and HOA/other costs |
| NOI | Effective income − operating expenses; annual NOI is monthly NOI × 12 |
| Current/stabilized cap rate | Annual NOI ÷ estimated current value |
| Target-cap price | Annual NOI ÷ target cap rate |
| Loan payment | Standard fully amortizing payment using principal, monthly interest rate, and number of monthly payments; zero-interest debt is principal ÷ months |
| Debt service | First-mortgage payment + seller-financing payment |
| DSCR | Annual NOI ÷ annual debt service |
| Cash flow | NOI − debt service |
| Cash required to close | Conventional down payment **or** creative-deal seller cash, plus renovation, closing costs, initial reserves, arrears, delinquent taxes, and assumption fee |
| Cash-on-cash return | Annual cash flow ÷ total cash required to close |
| Estimated seller equity | Purchase price − existing mortgage balance, floored at zero |
| Break-even occupancy | (Operating expenses + debt service) ÷ gross potential income |
| Per-unit metrics | Purchase price or total debt ÷ number of units |

An entered existing monthly mortgage payment takes priority for an assumption, subject-to deal, or existing-loan-plus-seller-financing structure. If it is blank, the calculator estimates principal-and-interest from balance, rate, and remaining amortization. It does not estimate escrow or loan fees. Seller balloon term is recorded for deal review but does not change the amortized monthly payment.

Screening colors use these initial rules: DSCR ≥ 1.25 is green, 1.10–1.24 yellow, and below 1.10 red; cash flow must be positive; cash to close ≤ 5% of price is green, > 5% through 10% yellow, and > 10% red; cap rate ≥ 12% is green, 9%–11.99% yellow, and below 9% red.

## Run and test locally

Node.js 18+ and Python 3 are sufficient; there are no packages to install.

```bash
npm test
npm run build
npm run dev
```

Open `http://localhost:4173`, load the sample subject-to deal, change inputs, verify status thresholds, test invalid/empty values, and use the browser print dialog. To test the exact production copy, run `npm run build`, then `npm run preview`, and open the same URL. Automated tests cover loan amortization, financing structures, primary calculations, input sanitization, and status boundaries.

## GitHub Pages deployment

The repository is a plain HTML/CSS/JavaScript site. `index.html` references `./src/styles.css` and `./src/app.js` with relative paths, so it works beneath a repository URL such as `https://OWNER.github.io/REPOSITORY/`.

For deployment directly from the default branch, in **Settings → Pages** choose **Deploy from a branch**, select the branch and `/ (root)`, then save. Alternatively, a Pages workflow can run `npm run build` and publish the generated `dist/` directory. The build script copies the static entry point and source assets without rewriting their relative URLs. No secrets or environment variables are needed.
