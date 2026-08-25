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
- Transparent retirement projection, funding gap, Timeline-based Safe Spending estimate, heuristic score, and lightweight tax-aware estimate.
- Readiness metric tooltips that provide plain-language help for the score, Safe Spending, and the tax-aware summary values without adding permanent explanatory text to the page.
- Editable federal deduction, state tax, taxable gains, pre-tax withdrawal, Roth conversion, Social Security, NIIT threshold, retirement cash-reserve target, IRMAA, and RMD start age assumptions.
- Rule-based recommendations with visible triggers and rationale, including two that come directly from the wealth timeline (a projected shortfall year and a projected IRMAA year).
- Responsive expanded desktop sidebar and collapsed mobile drawer.

## Calculation model

The full model is documented in [planning/calculation-model.md](planning/calculation-model.md). The headline rules are:

- Financial assets include taxable brokerage, 401(k), Traditional IRA, Roth IRA, and cash. Real estate is included only in total assets, never in the retirement portfolio projection.
- Gross income is salary plus other annual income. Employee 401(k) and Traditional IRA contributions reduce the simplified tax base; Roth IRA, brokerage, and cash rates apply after those contributions and illustrative taxes. The displayed annual surplus reflects employee contributions and expenses, while employer match remains separate.
- The projection is expressed in real dollars. The entered nominal return is converted to a real return using `(1 + nominal return) / (1 + inflation) - 1`. Each account receives its own end-of-year contribution. An employer 401(k) match is calculated from the employee 401(k) contribution, subject to the editable salary-percentage cap. Brokerage gains are taxed once per year at the editable taxable-gains rate plus a simplified 3.8% net investment income tax (NIIT) above an editable MAGI threshold, instead of compounding pre-tax.
- At the beginning of the target retirement year, tax-deferred balances are reduced by the editable pre-tax withdrawal tax rate to produce after-tax projected assets. Readiness `Required Assets` is the minimum after-tax target-year portfolio that survives the full Timeline horizon through life expectancy, found by rerunning the same retirement engine at scaled target-year balances. This keeps the Projected Assets and Required Assets comparison aligned with long-term sustainability rather than a single-year withdrawal-rate snapshot. Required minimum distributions use an illustrative IRS Uniform Lifetime Table divisor rather than a flat rate.
- The Wealth Timeline page projects every age from the current age through life expectancy using the same rules, lets the user override any single year (return, income, spending, or a one-time withdrawal), and applies a sequence-of-returns cash-reserve buffer during retirement. The Profile page also shows a read-only, single-filer Social Security claiming-age comparison for ages 62-70.
- On the Readiness page, `Projected Social Security Tax` is the cumulative projected Social Security taxation across all retired rows from the existing `buildTimelineRows()` engine through life expectancy. It sums each row's modeled `socialSecurityTax` value rather than showing only a single year's tax or only the tax at retirement. The total is derived from the application's existing retirement projection engine, so retirement and life-expectancy ages, RMDs, withdrawals, the taxable Social Security assumption, income and tax assumptions, timeline overrides, and any future model enhancements that affect taxation of benefits can change it. The value is a high-level illustrative estimate of cumulative tax paid on Social Security benefits across retirement; use the Timeline for annual detail and timing.
- On the Readiness page, `Projected RMD` is the cumulative sum of annual RMD values from the first modeled RMD year through life expectancy. It summarizes the overall future mandatory-distribution exposure rather than showing one year's RMD or only the RMD at retirement. The value is derived from the existing Wealth Timeline projection, so current balances, contributions, employer match, Roth conversions, retirement and RMD start ages, life expectancy, income, spending, return, inflation, timeline overrides, and withdrawal behavior can influence it. The Timeline remains the detailed annual view, and the metric uses the same projection basis as the model.
- On the Readiness page, `Projected NIIT` is the cumulative modeled NIIT exposure from the current age through life expectancy, including both accumulation and retirement years. It is summed from annual NIIT values produced by the existing Wealth Timeline retirement engine and uses the same brokerage-growth, income, tax-assumption, and withdrawal logic as the rest of the model. Asset balances, brokerage gains, retirement age, life expectancy, timeline overrides, and future model changes can therefore affect it. It is a high-level illustrative estimate, not an official tax liability or advice; the Timeline provides annual context.
- On the Readiness page, `Projected IRMAA` is the cumulative modeled Medicare income-related surcharge across retired timeline years through life expectancy. It is summed from the annual `irmaa` values produced by the existing Wealth Timeline engine, rather than showing a single year or only the surcharge at retirement. The total is an illustrative estimate influenced by projected balances, RMDs, Social Security taxability, retirement and life-expectancy ages, IRMAA threshold and surcharge assumptions, spending, returns, inflation, timeline overrides, withdrawal behavior, and future model changes. The Timeline remains the detailed annual view and the source for tracing timing and amounts.
- The Retirement Health Score is a 0-100 heuristic: 60% long-horizon funding progress, 25% savings-rate progress toward 20%, and 15% timing progress, minus a penalty of up to 20 points when the wealth timeline projects asset depletion before life expectancy. A plan meeting the target age receives full timing credit; a later expected age loses credit linearly through life expectancy. The Readiness page and Timeline use the same retirement engine and assumptions; the Timeline provides annual detail.
- Readiness `Safe Spending` is the maximum annual retirement spending goal that remains solvent through life expectancy when the same Timeline engine is rerun with candidate spending levels. It incorporates the model's returns, taxes, Social Security, RMDs, IRMAA, NIIT, Roth conversions, cash-reserve behavior, withdrawals, and timeline overrides. The Safe Withdrawal Rate remains an editable assumption for required-assets calculations; it is not a substitute for this horizon-based spending result.
- The Retirement Health Score is the primary Readiness summary indicator. It combines funding progress, savings, retirement timing, and the Timeline's long-term sustainability result. It updates automatically as planning assumptions change and is intended as a planning aid, not a guarantee, probability, or prediction of retirement outcomes.
- Readiness metric explanations are intentionally lightweight and contextual. Each tooltip is meant to help users interpret what a metric means in retirement planning terms rather than explain the exact code path or model internals. The score, Safe Spending, projected RMD, projected NIIT, projected IRMAA, and projected Social Security tax each have a summary tooltip that uses clear, plain-language phrasing and keeps the main Readiness page uncluttered. The tooltip content focuses on practical meaning: whether the number is cumulative or annual, what the term means in plain language, and how the value should be used in a planning conversation.

## Calculation boundary

The prototype uses simplified P0 calculations. `planning/Wealth_Statement.xlsx` and `planning/Retirement_Calculator.xlsx` are read-only research and validation references; neither is loaded at runtime. The prototype includes lightweight estimates for progressive federal brackets, state income tax, taxable gains, NIIT, pre-tax withdrawal tax, Roth conversion tax, Social Security taxation and claiming-age comparison, IRMAA, and RMDs. These are illustrative planning estimates, not official tax calculations.

The Retirement Health Score is a heuristic based on funding progress, savings rate, and retirement timing. It is not a probability of retirement success or financial advice.

The app models only the real-dollar projection basis. It does not model payroll taxes, itemized deductions, tax credits, capital-gain holding periods, tax-law changes, inflation-adjusted tax brackets, Social Security claiming optimization, full RMD cash-flow alerting, IRS contribution limits, eligibility rules, vesting, salary growth, employer-match changes, spousal Social Security benefits, or an optimized Roth-conversion strategy.
