# Takeover Deal Hunter

A lightweight, responsive calculator for quickly screening real estate takeover deals.

## Run locally

```bash
npm run dev
```

Then open `http://localhost:4173`.

## Commands

- `npm run dev` — start the development server on port 4173
- `npm run build` — create a production build
- `npm run preview` — preview the production build
- `npm test` — run the calculator unit tests

## How the analysis works

The monthly cash-flow estimate is:

```text
Rental income - vacancy loss - operating expenses - repairs - debt payment
```

Vacancy loss is calculated from the vacancy percentage and monthly rental income. Cash needed is the purchase price minus the existing debt balance (with a floor of zero).
