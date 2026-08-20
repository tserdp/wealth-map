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

## Calculation model

The full model is documented in [planning/calculation-model.md](planning/calculation-model.md). The headline rules are:

- Financial assets include taxable brokerage, 401(k), Traditional IRA, Roth IRA, and cash. Real estate is included only in total assets, never in the retirement portfolio projection.
- Gross income is salary plus other annual income. Employee 401(k) and Traditional IRA contributions reduce the simplified tax base; Roth IRA, brokerage, and cash rates apply after those contributions and illustrative taxes. The displayed annual surplus reflects employee contributions and expenses, while employer match remains separate.
- The projection is expressed in real dollars. The entered nominal return is converted to a real return using `(1 + nominal return) / (1 + inflation) - 1`. Each account receives its own end-of-year contribution. An employer 401(k) match is calculated from the employee 401(k) contribution, subject to the editable salary-percentage cap.
- At retirement, tax-deferred balances are reduced by the editable pre-tax withdrawal tax rate to produce after-tax projected assets. The retirement target gross-ups the portfolio-funded spending need for that same rate, offsets it by the net simplified Social Security benefit, and adds any modeled IRMAA surcharge.
- The Retirement Health Score is a 0-100 heuristic: 60% funding progress, 25% savings-rate progress toward 20%, and 15% timing progress. A plan meeting the target age receives full timing credit; a later expected age loses credit linearly through life expectancy.

## Calculation boundary

The prototype uses simplified P0 calculations. `planning/Wealth_Statement.xlsx` is a read-only research and validation reference; it is not loaded at runtime. The prototype includes lightweight estimates for progressive federal brackets, state income tax, taxable gains, pre-tax withdrawal tax, Roth conversion tax, Social Security taxation, IRMAA, and RMDs. These are illustrative planning estimates, not official tax calculations.

The Retirement Health Score is a heuristic based on funding progress, savings rate, and retirement timing. It is not a probability of retirement success or financial advice.

The app models only the real-dollar projection basis. It does not model payroll taxes, itemized deductions, tax credits, capital-gain holding periods, tax-law changes, inflation-adjusted tax brackets, Social Security claiming, withdrawal sequencing, IRS contribution limits, eligibility rules, vesting, salary growth, employer-match changes, or an optimized Roth-conversion strategy.
