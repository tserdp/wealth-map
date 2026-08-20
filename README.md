# Wealth Map

A dependency-free, client-side retirement-readiness prototype based on the product requirements and wireframe documents in [planning/](planning/).

## Run locally

Open `index.html` directly in a browser, or serve the repository root with any static web server.

```text
python -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

The app files (`index.html`, `styles.css`, `app.js`, `data.js`) live at the repository root so GitHub Pages can serve them directly from the `main` branch with no build step.

## Prototype behavior

- Five navigable views: Readiness, Profile, Assets, Income & Expenses, and Recommendations.
- Editable profile, asset, income, expense, and projection-assumption fields.
- Shared working state with live recalculation.
- Reset-to-sample behavior.
- Transparent retirement projection, funding gap, safe spending estimate, heuristic score, and lightweight tax-aware estimate.
- Editable federal deduction, state tax, taxable gains, pre-tax withdrawal, Roth conversion, Social Security, IRMAA, and RMD assumptions.
- Rule-based recommendations with visible triggers and rationale.
- Responsive expanded desktop sidebar and collapsed mobile drawer.

## Calculation boundary

The prototype uses simplified P0 calculations. `planning/Wealth_Statement.xlsx` is a read-only research and validation reference; it is not loaded at runtime. The prototype includes lightweight estimates for progressive federal brackets, state income tax, taxable gains, pre-tax withdrawal tax, Roth conversion tax, Social Security taxation, IRMAA, and RMDs. These are illustrative planning estimates, not official tax calculations.

The Retirement Health Score is a heuristic based on funding progress, savings rate, and retirement timing. It is not a probability of retirement success or financial advice.
