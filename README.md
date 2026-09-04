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

## Deal Summary & Recommendation

The report is created only after **Calculate Deal** is selected. It groups the property, financing, and performance figures used in the analysis, records the generation time, and distinguishes unavailable values as **Unknown** or **Needs verification**. The copy button produces a plain-text version suitable for email or deal notes; no report data leaves the browser.

### Overall grade

Grades are assigned by deterministic rules in `src/calculator.js`, not by an external service or subjective AI model. A negative monthly cash flow, DSCR below 1.00, or failure of a configured minimum cash-flow, cap-rate, or cash-on-cash target produces **REJECT**. Subject to that screen:

- **A — Strong Deal:** positive cash flow; DSCR of at least 1.25 (or no debt service); cash to close within the entered maximum; stabilized cap-on-cost of at least 12% or cash-on-cash return of at least 20%; and no missing price, income, or material existing-loan documentation.
- **B — Promising Deal:** positive cash flow; DSCR of at least 1.15 (or no debt service); stabilized cap-on-cost from 9% through 11.99%; and no missing price, income, or material existing-loan documentation.
- **C — Marginal Deal:** a non-rejected deal that does not satisfy A or B. This includes weak positive cash flow, DSCR from 1.00 through 1.14, excess cash required, lower returns, or important missing information.
- **REJECT — Does Not Meet Targets:** the current terms fail one of the minimum sustainability or user-configured target screens above.

Stabilized cap rate / cap on cost is annual NOI divided by purchase price, renovation budget, and closing costs. A configured maximum cash to close is required for an A grade. The recommendation directly maps to the resulting grade, so identical inputs always produce the same grade, explanation, and next action.

### Verification before an offer

The report flags blank inputs and unchecked due-diligence items; it never treats a calculated estimate as verified. Before making an offer, independently confirm the address and asking price, rent roll, leases and delinquency/occupancy status, T12 operating statement, taxes, insurance, utilities and other expenses, physical condition and renovation estimate, current loan statement and payoff, mortgage balance, interest rate, payment and escrow details, maturity date, prepayment penalty, seller-financing terms, seller cash requirement, title, and closing costs. For subject-to transactions, also have a qualified real-estate attorney and title company review the due-on-sale clause, payment status, insurance, title structure, and legal risks. The calculator does not describe subject-to financing as an approved assumption.

### Print or save as PDF

1. Enter the known information, mark only documentation actually verified, and select **Calculate Deal**.
2. Review the generated grade, missing-information list, and risk flags.
3. Select **Print / Save as PDF** in the report and choose the browser's PDF destination (commonly **Save as PDF**).

Print-specific styling removes the form, navigation, and action buttons while retaining the report title, generation time, summaries, grade, explanations, applicable subject-to warning, recommendation, and verification footer. For best results, enable background graphics in the browser print dialog so the grade color is retained.
