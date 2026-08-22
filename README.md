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

- Six navigable views: Readiness, Profile, Assets, Income & Expenses, Wealth Timeline, and Recommendations.
- Editable profile, asset, income, expense, and projection-assumption fields.
- An editable year-by-year wealth timeline from the current age through life expectancy, with per-year overrides that fall back to the modeled value when left blank.
- Shared working state with live recalculation.
- Reset-to-sample behavior, including any wealth-timeline overrides.
- Transparent retirement projection, funding gap, safe spending estimate, heuristic score, and lightweight tax-aware estimate.
- Editable federal deduction, state tax, taxable gains, pre-tax withdrawal, Roth conversion, Social Security, NIIT threshold, retirement cash-reserve target, IRMAA, and RMD start age assumptions.
- Rule-based recommendations with visible triggers and rationale, including two that come directly from the wealth timeline (a projected shortfall year and a projected IRMAA year).
- Responsive expanded desktop sidebar and collapsed mobile drawer.

## Calculation model

The full model is documented in [planning/calculation-model.md](planning/calculation-model.md). The headline rules are:

- Financial assets include taxable brokerage, 401(k), Traditional IRA, Roth IRA, and cash. Real estate is included only in total assets, never in the retirement portfolio projection.
- Gross income is salary plus other annual income. Employee 401(k) and Traditional IRA contributions reduce the simplified tax base; Roth IRA, brokerage, and cash rates apply after those contributions and illustrative taxes. The displayed annual surplus reflects employee contributions and expenses, while employer match remains separate.
- The projection is expressed in real dollars. The entered nominal return is converted to a real return using `(1 + nominal return) / (1 + inflation) - 1`. Each account receives its own end-of-year contribution. An employer 401(k) match is calculated from the employee 401(k) contribution, subject to the editable salary-percentage cap. Brokerage gains are taxed once per year at the editable taxable-gains rate plus a simplified 3.8% net investment income tax (NIIT) above an editable MAGI threshold, instead of compounding pre-tax.
- At retirement, tax-deferred balances are reduced by the editable pre-tax withdrawal tax rate to produce after-tax projected assets. The retirement target gross-ups the portfolio-funded spending need for that same rate, offsets it by the net simplified Social Security benefit, and adds any modeled IRMAA surcharge. Required minimum distributions use an illustrative IRS Uniform Lifetime Table divisor rather than a flat rate.
- The Wealth Timeline page projects every age from the current age through life expectancy using the same rules, lets the user override any single year (return, income, spending, or a one-time withdrawal), and applies a sequence-of-returns cash-reserve buffer during retirement. The Profile page also shows a read-only, single-filer Social Security claiming-age comparison for ages 62-70.
- The Retirement Health Score is a 0-100 heuristic: 60% funding progress, 25% savings-rate progress toward 20%, and 15% timing progress, minus a penalty of up to 20 points when the wealth timeline projects asset depletion before life expectancy. A plan meeting the target age receives full timing credit; a later expected age loses credit linearly through life expectancy.

## Calculation boundary

The prototype uses simplified P0 calculations. `planning/Wealth_Statement.xlsx` and `planning/Retirement_Calculator.xlsx` are read-only research and validation references; neither is loaded at runtime. The prototype includes lightweight estimates for progressive federal brackets, state income tax, taxable gains, NIIT, pre-tax withdrawal tax, Roth conversion tax, Social Security taxation and claiming-age comparison, IRMAA, and RMDs. These are illustrative planning estimates, not official tax calculations.

The Retirement Health Score is a heuristic based on funding progress, savings rate, and retirement timing. It is not a probability of retirement success or financial advice.

The app models only the real-dollar projection basis. It does not model payroll taxes, itemized deductions, tax credits, capital-gain holding periods, tax-law changes, inflation-adjusted tax brackets, Social Security claiming optimization, full RMD cash-flow alerting, IRS contribution limits, eligibility rules, vesting, salary growth, employer-match changes, spousal Social Security benefits, or an optimized Roth-conversion strategy.
