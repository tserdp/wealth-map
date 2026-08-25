# Wealth Map Copilot Instructions

These instructions apply to the Wealth Map workspace and are based on the complete product requirements document and low-fidelity wireframes in the repository.

## Authoritative Source Documents

The following files are authoritative and must be kept aligned with the implementation:

- `planning/WealthMapPRD.md`: complete product requirements, data model, calculation rules, technical requirements, acceptance criteria, roadmap, and financial disclaimer.
- `planning/wireframe-navigation.md`: expanded desktop navigation, collapsed mobile navigation, drawer behavior, and navigation requirements.
- `planning/wireframe-profile.md`: editable profile and projection-assumption layout.
- `planning/wireframe-assets.md`: editable account balances, tax-treatment labels, and asset totals.
- `planning/wireframe-income-expenses.md`: editable income, savings, expenses, surplus, and savings-rate layout.
- `planning/wireframe-retirement-readiness.md`: primary Retirement Health Score, timing, funding, spending, and assumptions layout.
- `planning/wireframe-recommendations.md`: prioritized recommendations, triggers, metrics, rationale, and prototype boundaries.
- `planning/calculation-model.md`: the full deterministic calculation model, including the wealth-timeline engine, RMD divisor table, NIIT, and Social Security claiming-age comparison.
- `planning/Wealth_Statement.xlsx`: read-only research and validation reference. It is not a runtime dependency and must never be modified.
- `planning/Retirement_Calculator.xlsx`: second read-only research and validation reference. It is not a runtime dependency and must never be modified.

## Product Purpose

Wealth Map is a client-side retirement-planning prototype. It helps users understand whether they are on track to retire, identify a funding gap or surplus, estimate an expected retirement age, and decide what actions to consider today.

This is an educational decision-support tool, not a net-worth tracker, financial-advice service, or replacement for the workbook's full planning engine. The long-term product may answer:

- Can I retire at my target age?
- Which account should I spend from first?
- Should I perform Roth conversions?
- When should I claim Social Security?
- How much can I sustainably spend?
- How can I reduce lifetime taxes?

## Prototype Scope

The prototype must provide six navigable views:

1. Profile
2. Assets
3. Income & Expenses
4. Retirement Readiness
5. Wealth Timeline
6. Recommendations

The primary MVP result is the Retirement Health Score. The prototype must show:

- A score from 0 to 100
- On Track, Slightly Behind, or Major Shortfall status
- Target and expected retirement age
- Projected investable assets
- Required retirement assets
- Funding gap or surplus
- Safe annual spending estimate
- Up to three prioritized, rule-based recommendations

All core profile, asset, income, expense, and projection-assumption fields must be editable. Valid edits must update the shared state, all derived metrics, and all dependent views without a page reload. A reset control must restore the original sample dataset.

## Technical Constraints

- Use HTML5, CSS3, and modern vanilla JavaScript.
- Keep the app static and client-side.
- Do not add a framework, backend, database, build step, package manager, authentication, external API, or account aggregation service for P0.
- Keep the app compatible with GitHub Pages and direct opening of `index.html` at the repository root.
- Keep data, calculations, rendering, navigation, and styling in understandable separate files.
- Keep the original sample dataset immutable and maintain a separate working state.
- Use one update flow: validate input, update working state, recalculate derived values, then render dependent views.
- Do not hard-code calculated results into markup.
- Do not duplicate editable values or calculation logic across pages.
- Handle zero, missing, invalid, and out-of-range values without `NaN`, broken layouts, or misleading output.
- Use semantic HTML, accessible labels, visible focus states, keyboard-operable controls, and color-independent status communication.

## Required Data

The sample profile should include:

- Name, current age, target retirement age, life expectancy, state, and filing status
- Annual salary, other annual income, annual savings, current annual expenses, and retirement spending goal
- Expected annual return, inflation rate, projection basis, and safe withdrawal rate
- Federal standard deduction, state income tax rate, taxable gains tax rate, pre-tax withdrawal tax rate
- Annual Roth conversion amount
- Social Security annual benefit and taxable percentage
- RMD start age and an illustrative age-indexed RMD divisor table (not a flat rate)
- NIIT MAGI threshold and retirement cash-reserve target (years of spending)
- IRMAA income threshold and annual surcharge
- Taxable brokerage, 401(k), Traditional IRA, Roth IRA, cash, and real estate balances
- A separate, initially empty map of per-age wealth-timeline overrides (runtime state, not sample data)

Account classifications:

| Account           | Tax treatment                  | Prototype interpretation                     |
| ----------------- | ------------------------------ | -------------------------------------------- |
| Taxable brokerage | Taxable                        | Flexible withdrawals; gains may be taxable   |
| 401(k)            | Tax-deferred                   | Future withdrawals may be taxable            |
| Traditional IRA   | Tax-deferred                   | Future withdrawals may be taxable            |
| Roth IRA          | Tax-free qualified withdrawals | Tax-free retirement flexibility              |
| Cash              | Liquid                         | Short-term spending reserve                  |
| Real estate       | Separate asset                 | Not automatically spendable portfolio assets |

## Required Calculations

Keep calculation functions separate from rendering functions and make them deterministic and testable.

- Financial assets = brokerage + 401(k) + Traditional IRA + Roth IRA + cash.
- Total assets = financial assets + real estate.
- Total annual income = salary + other annual income.
- Annual surplus = total annual income - current annual expenses.
- Annual savings rate = annual savings / total annual income, with zero-income handling.
- Required retirement assets = retirement spending goal / safe withdrawal rate.
- Safe Spending = the maximum annual retirement spending goal that leaves the shared Timeline solvent through life expectancy when rerun with candidate spending levels; it must not be a separate safe-withdrawal-rate snapshot formula.
- Projected assets at retirement use the Timeline's target-year account balances after the accumulation model and the same after-tax treatment used by the retirement engine. Required assets are the minimum after-tax target-year portfolio that remains solvent through life expectancy when rerun through the same Timeline retirement rows.
- Use a zero-return branch to avoid division by zero.
- Do not include real estate in spendable retirement portfolio projections unless explicitly labeled as a separate assumption.
- Funding gap = long-horizon sustainable required assets - projected assets at retirement. Display an absolute projected surplus when the value is negative. The two values must remain sourced from the same Timeline model and assumptions.
- Expected retirement age is the first age at which projected assets meet the target; otherwise show `Beyond life expectancy`.
- The Retirement Health Score is a documented heuristic based on funding progress, savings rate, and timing, clamped to 0-100.
- The score is not a probability and must never be presented as a Monte Carlo result.
- Use one projection basis consistently. With `real_dollars`, do not inflate the spending goal again.
- Apply simplified progressive federal brackets by filing status, plus state tax and taxable gains assumptions.
- Project after-tax assets by applying simplified pre-tax withdrawal tax and conversion tax effects.
- Include simplified Social Security taxability, RMD, and IRMAA effects in retirement need calculations.
- Estimate RMDs from an age-indexed divisor table (illustrative IRS Uniform Lifetime Table), not a flat rate.
- Tax brokerage gains once per year at the taxable-gains rate plus a simplified 3.8% NIIT above an editable MAGI threshold.
- Provide an editable year-by-year wealth timeline from the current age through life expectancy; a blank per-year override falls back to the modeled value, and an override never affects any other age.
- Apply a cash-reserve buffer during retirement decumulation that only refills from brokerage in a positive-return year, to illustrate sequence-of-returns risk without forcing a sale after a down year.
- Show a read-only, single-filer Social Security claiming-age comparison (ages 62-70); do not present it as claiming optimization.
- Feed a wealth-timeline shortfall (projected depletion before life expectancy) or IRMAA-triggering year into the Retirement Health Score and Recommendations, not only the Timeline page.
- Label all tax-aware outputs as illustrative estimates, not official tax calculations or advice.

## Recommendations

Generate zero to three recommendations, ordered by priority. Each recommendation must show:

- Priority
- Triggering condition
- Current metric
- Suggested action
- Whether the effect is calculated or qualitative

Recommendations may address savings rate, retirement timing, spending goal, and tax diversification at an educational level. Do not invent tax savings, Roth conversion amounts, Social Security benefits, IRMAA costs, or RMD values.

Full tax optimization, Roth conversion optimization, Social Security claiming optimization, Monte Carlo, estate planning, and account aggregation remain deferred. P0 may show simplified tax, conversion, Social Security, IRMAA, and RMD estimates, but must label them as illustrative and must not invent unsupported detail. The Social Security claiming-age comparison and the RMD divisor table are illustrative estimates already implemented in P0; they are not claiming optimization or a full RMD cash-flow/alerting engine.

## Navigation and Layout

Desktop uses a persistent expanded left sidebar with:

- Wealth Map brand
- Readiness, Profile, Assets, Income & Expenses, Wealth Timeline, and Recommendations links
- Active-page indicator
- Sample-plan summary
- Educational-estimate note

Mobile uses a collapsed header menu. The drawer must:

- Open from the menu button
- Highlight the active page
- Close after page selection
- Close with a close button, outside click, or Escape
- Keep all pages accessible without horizontal scrolling

The Readiness view is the primary landing view. Use responsive layouts, stacked cards on mobile, editable controls with units, and clear gap/surplus states.

## Financial and Research Boundaries

`planning/Wealth_Statement.xlsx` and `planning/Retirement_Calculator.xlsx` are read-only research artifacts. Do not load either in the browser, alter them, or treat them as runtime dependencies. P0 uses the simplified rules above. Future tax-aware work may validate documented scenarios against either workbook before implementing more detailed formulas.

The prototype must clearly state that results are simplified educational estimates and not financial, tax, or legal advice.

## Definition Of Done

A change is complete only when:

- All six views remain reachable.
- The active navigation state remains correct on desktop and mobile.
- Edits update all dependent calculations without a reload.
- Reset restores the immutable sample values.
- No calculated output becomes stale, invalid, or `NaN`.
- Real estate remains separate from investable retirement assets.
- Recommendations explain why they appear.
- Deferred workbook features are not represented with invented values; P0 tax-aware estimates remain explicitly simplified.
- The README and relevant wireframe or PRD requirements remain accurate.
