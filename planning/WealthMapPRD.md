# Wealth Map Prototype Product Requirements Document

## 1. Product Overview

### Product name

Wealth Map

### Purpose

Wealth Map is a client-side retirement-planning prototype that helps people understand whether they are on track to retire, identify their projected funding gap, estimate when they may be able to retire, and decide what actions to take today.

The product is an educational decision-support tool, not a net-worth tracker or financial-advice service. It should give users useful answers quickly rather than require them to build a complex financial plan.

### Research foundation and product vision

The included repository files `planning/Wealth_Statement.xlsx` and `planning/Retirement_Calculator.xlsx` are the research foundation for the longer-term product. Both are read-only reference artifacts stored alongside the other planning documents. Together they model retirement planning as a timeline of income, spending, account balances, taxes, Roth conversions, Social Security, and required minimum distributions (RMDs). The prototype must not reproduce either workbook's full calculation engine, but its data model and calculation layer should leave room for those capabilities; the Wealth Timeline page and the RMD divisor table, NIIT, and Social Security claiming-age comparison are the first steps in that direction.

The prototype must not require either workbook to be loaded in the browser and must not modify them. P0 calculations use the simplified rules in this PRD. Future tax-aware features may use documented workbook scenarios for validation.

The long-term product should help users answer decision-oriented questions:

- Can I retire at my target age?
- Which account should I spend from first?
- Should I perform Roth conversions, and how much?
- When should I claim Social Security?
- How much can I sustainably spend?
- How can I reduce lifetime taxes?

### Core product promise

Within approximately 60 seconds of reviewing the sample profile, a user should understand:

- Their Retirement Health Score from 0 to 100
- Whether they are on track for retirement
- Their estimated retirement age compared with their target
- Their projected retirement funding gap or surplus
- Their three highest-priority recommended actions

## 2. Goals and Non-Goals

### Prototype goals

- Demonstrate a coherent retirement-planning workflow.
- Provide six connected pages with simple navigation, including an editable year-by-year wealth timeline.
- Display a realistic built-in sample dataset.
- Calculate basic retirement-readiness metrics from the sample data.
- Show a Retirement Health Score, projected retirement age, and funding gap.
- Generate understandable, rule-based recommendations.
- Establish a foundation that can later use more sophisticated planning logic.
- Make the Retirement Health Score the primary MVP experience, with the other pages supporting that result.
- Make every score and recommendation explain which assumptions or metrics produced it.

### Prototype non-goals

- No user authentication or accounts.
- No backend, database, or server-side processing.
- No real financial-account aggregation.
- No external APIs or live market data.
- No production-grade tax calculations; P0 uses simplified illustrative estimates.
- No full Roth-conversion optimization model; P0 supports an editable annual conversion assumption.
- No Social Security optimization engine; P0 estimates taxable benefits from an editable benefit input and shows an illustrative, single-filer claiming-age comparison (ages 62-70) for reference only.
- No RMD alerting engine; P0 estimates an RMD amount using an illustrative IRS Uniform Lifetime Table divisor once the modeled age reaches the RMD start age.
- No Monte Carlo simulation.
- No estate-planning functionality.
- No claim that results are personalized financial advice.
- No claim that the prototype produces official federal tax, IRMAA, Roth conversion, Social Security, or RMD outcomes.

## 3. Target Audience

### Primary audience

- Adults who want a quick, understandable view of their retirement readiness.
- People who have money across multiple account types and want to understand how those assets contribute to retirement.
- Users who prefer actionable guidance over a complex spreadsheet or financial model.

### User characteristics

- Comfortable entering or reviewing basic financial information.
- Interested in retirement timing, savings behavior, and spending sustainability.
- May not understand tax treatment, withdrawal order, or retirement projections in detail.

## 4. User Problems and Jobs To Be Done

Users need to answer questions such as:

- Can I retire at my target age?
- Am I saving enough?
- Will my assets support my retirement spending goal?
- Which account balances contribute to my retirement plan?
- Which account type may be most appropriate for a future withdrawal, at a conceptual level?
- How large is my projected retirement gap?
- What are the most useful actions I can take next?

## 5. Core Use Cases

1. A user opens the app and reviews a sample financial profile.
2. A user navigates to Assets and sees balances grouped by account type.
3. A user reviews Income & Expenses and sees income, savings, spending, and retirement spending goals.
4. A user opens Retirement Readiness and sees a score, readiness status, projected retirement age, and funding gap.
5. A user opens Recommendations and sees up to three prioritized suggestions generated from the sample data.
6. A user opens the Wealth Timeline and reviews or overrides individual years of the projection to match their own expectations.
7. A user navigates between all six pages using persistent navigation and can always identify the current page.
8. A user edits one or more profile, asset, income, expense, or assumption fields and immediately sees the score, projections, and recommendations update.
9. A user can restore the original sample dataset after experimenting with values.

## 6. Information Architecture and Page Requirements

### 6.1 Profile

**Purpose:** Present the assumptions that define the retirement plan.

**Display:**

- User name
- Current age
- Target retirement age
- Life expectancy
- State
- Tax filing status
- Expected annual return
- Inflation rate
- Safe withdrawal rate
- Projection basis
- Short summary of the plan

**Account classification:** Each account must show a plain-language tax-treatment label:

| Account           | Tax treatment                  | Prototype interpretation                                |
| ----------------- | ------------------------------ | ------------------------------------------------------- |
| Taxable brokerage | Taxable                        | Flexible withdrawals; gains may be taxable              |
| 401(k)            | Tax-deferred                   | Future withdrawals may be taxable                       |
| Traditional IRA   | Tax-deferred                   | Future withdrawals may be taxable                       |
| Roth IRA          | Tax-free qualified withdrawals | Tax-free retirement flexibility                         |
| Cash              | Liquid                         | Short-term spending reserve                             |
| Real estate       | Separate asset                 | Not automatically treated as spendable portfolio assets |

The prototype may display educational withdrawal-order context, but must not claim to optimize withdrawal order.

**Prototype behavior:** Load editable values from the shared sample dataset. Changes must update the shared client-side state and all dependent calculations.

### 6.2 Assets

**Purpose:** Show the user's financial resources by account or asset type and explain their role in retirement planning.

**Display:**

- Taxable brokerage balance
- 401(k) balance
- Traditional IRA balance
- Roth IRA balance
- Cash balance
- Real estate value
- Total financial assets
- Total assets including real estate
- Optional net worth value if liabilities are included in the dataset

**Prototype behavior:** Provide editable numeric inputs for each balance. Calculate totals from the current client-side state, not from hard-coded display values. Clearly distinguish account categories because they have different tax treatments.

### 6.3 Income & Expenses

**Purpose:** Show current earning, saving, and spending behavior.

**Display:**

- Annual salary
- Other annual income, if present
- Annual savings
- Current annual expenses
- Retirement annual spending goal
- Current savings rate
- Annual cash flow or surplus

**Prototype behavior:** Provide editable inputs for income, savings, expenses, and retirement spending goal. Calculate savings rate and surplus from the current client-side state. Use clear positive and negative states.

### 6.4 Retirement Readiness

**Purpose:** Give the user the primary answer: whether they are on track to retire.

**Display:**

- Retirement Health Score from 0 to 100
- Readiness status: On Track, Slightly Behind, or Major Shortfall
- Target retirement age
- Expected retirement age
- Projected after-tax retirement assets at the beginning of the target retirement year
- Required after-tax retirement assets at the beginning of the target retirement year to remain solvent through life expectancy
- Funding gap or surplus
- Safe annual spending estimate that remains sustainable through life expectancy under the shared retirement projection engine
- A short explanation of the result and its assumptions

**Prototype behavior:** Derive all values from the current shared client-side state and calculation rules. Recalculate after every valid input change. Use a prominent but restrained visual treatment for the score and status.

The Retirement Health Score is the primary MVP output. The page must identify the assumptions that drive it and distinguish projected investable assets from real estate.

### 6.5 Recommendations

**Purpose:** Convert the readiness results into practical next actions.

**Display:**

- Up to three prioritized recommendations
- A short explanation for each recommendation
- The metric or condition that triggered it
- Optional estimated effect, such as reducing the funding gap or improving projected retirement age

Each recommendation must also include its priority, triggering metric, and a short explanation. An estimated effect may be shown only when the prototype actually calculates it; otherwise label the effect as qualitative.

**Possible recommendation rules:**

- Recommend increasing savings when the savings rate is below the target threshold.
- Recommend delaying retirement by one year when the projected gap is materially positive.
- Recommend reviewing retirement spending when the spending goal is high relative to assets.
- Recommend delaying Social Security to age 70 as an educational suggestion, without calculating actual benefit values.
- Recommend reviewing tax diversification when most assets are in tax-deferred accounts.

- Do not present Roth conversion, Social Security, tax, or RMD outputs as official advice. All P0 outputs must be labeled as simplified educational estimates.

Recommendations must be labeled as educational prototype suggestions, not financial advice.

### 6.6 Wealth Timeline

**Purpose:** Let the user see and adjust the model's year-by-year projection so it can be reconciled with their own reality, rather than trusting a single target-age snapshot.

**Display:**

- A chart of projected financial assets by age, from the current age through life expectancy, with the target retirement age marked.
- A summary of projected assets at life expectancy, the age assets are projected to deplete (if any), and how many years currently have a user override.
- An editable row for every age, showing the modeled or overridden expected return, income, expenses or spending, one-time withdrawal, contribution or withdrawal amount, RMD, and ending assets for that year.

**Prototype behavior:** Blank fields use the automatically modeled value; a per-year override is layered on top of, and does not replace, the shared profile assumptions. Overrides are cleared by the `Reset sample data` control or a page-level `Reset timeline overrides` control. Income overrides apply only to working years, and expense or one-time withdrawal overrides apply only to retired years, because the underlying engine does not use those values outside that phase. A projected shortfall or IRMAA-triggering year found in the timeline must also surface in the Retirement Health Score and Recommendations, not only on this page.

### Editable input behavior

- Inputs must be clearly labeled with their unit, such as dollars, years, percentage, or currency per year.
- Numeric inputs must reject or safely handle invalid, negative, or out-of-range values according to the field rules.
- Changes may recalculate on input or on a clearly labeled Apply/Update action, but the interaction must require no page reload.
- Recalculation must update all affected pages or views, including totals, cash flow, readiness metrics, score, and recommendations.
- Provide a `Reset sample data` control that restores the original dataset and recalculates the app.
- The prototype may use in-memory state only. Persistence through `localStorage` is optional and must not be required.

## 7. Navigation Requirements

- Provide persistent navigation to Profile, Assets, Income & Expenses, Retirement Readiness, Wealth Timeline, and Recommendations.
- Every page must link to every other page through the navigation.
- Highlight the active page.
- Use readable page titles and consistent navigation labels.
- Navigation must work on desktop and mobile layouts.
- Use vanilla JavaScript for page switching if implementing a single-page app.
- A multi-page HTML implementation is also acceptable, provided the shared sample data and calculations remain consistent.
- The preferred prototype approach is a single-page client-side app with six view sections, because it avoids duplicated markup and keeps calculated state consistent.

## 8. Functional Requirements

- FR1: The app must use HTML, CSS, and vanilla JavaScript.
- FR2: The app must run entirely in the browser.
- FR3: The app must not require a backend, build step, login, or external service.
- FR4: The app must load a built-in sample dataset when opened.
- FR5: The app must calculate asset totals from individual asset values.
- FR6: The app must calculate annual savings rate and annual surplus.
- FR7: The app must calculate a basic retirement projection using the defined assumptions.
- FR8: The app must calculate a funding gap or surplus.
- FR9: The app must calculate and display a Retirement Health Score from 0 to 100.
- FR10: The app must classify readiness as On Track, Slightly Behind, or Major Shortfall.
- FR11: The app must estimate Safe Spending as the maximum annual retirement spending goal that remains sustainable through life expectancy under the shared retirement projection engine. The configurable safe withdrawal rate remains an assumption used by the required-assets calculation, but Safe Spending must not be a separate rule-of-thumb formula.
- FR12: The app must generate no more than three prioritized recommendations from rule-based conditions.
- FR13: All pages must use the same underlying dataset and calculations.
- FR14: The app must display a clear disclaimer that projections are simplified educational estimates.
- FR15: The app must avoid presenting prototype outputs as guaranteed results or individualized financial advice.
- FR16: The app must classify assets by account type and display their simplified tax treatment.
- FR17: The app must distinguish investable retirement assets from real estate in readiness calculations.
- FR18: The app must identify the assumptions contributing to the Retirement Health Score.
- FR19: Each recommendation must show its trigger, priority, and rationale.
- FR20: The calculation layer must be separate from rendering and navigation so future scenario calculations can be added without rewriting page markup.
- FR21: The prototype must visibly label tax, Roth conversion, Social Security, IRMAA, and RMD calculations as unavailable or simplified when they are not implemented.
- FR21: The prototype must visibly label tax, Roth conversion, Social Security, IRMAA, and RMD calculations as simplified illustrative estimates.
- FR22: The prototype must provide editable controls for all core profile, asset, income, expense, and projection-assumption fields.
- FR23: Valid input changes must update the shared client-side state without a page reload.
- FR24: Every derived value must be recalculated from the current state after an edit, including asset totals, savings rate, surplus, projected assets, funding gap, expected retirement age, score, and recommendations.
- FR25: The prototype must provide a reset control that restores the original sample dataset.
- FR26: Invalid or out-of-range input must produce an understandable validation state and must not produce broken, misleading, or `NaN` output.
- FR27: The prototype must provide editable assumptions for federal standard deduction, state income tax rate, taxable gains tax rate, pre-tax withdrawal tax rate, annual Roth conversion, Social Security benefit mode and taxable percentage, RMD start age, NIIT MAGI threshold, Cash Reserve (Years of Spending) (how many years of retirement spending the model attempts to maintain in cash), and IRMAA threshold and surcharge.
- FR28: The prototype must apply a simplified progressive federal bracket calculation and show its assumptions without representing it as official tax software.
- FR29: The prototype must include simplified tax effects in projected after-tax assets and retirement spending needs.
- FR30: The prototype must provide an editable year-by-year wealth timeline from the current age through life expectancy, allowing per-year overrides that fall back to the modeled value when left blank.
- FR31: The prototype must estimate RMDs using an age-indexed divisor table rather than a single flat rate.
- FR32: The prototype must show an illustrative, read-only Social Security claiming-age comparison and must not present it as claiming optimization.
- FR33: The prototype must provide an editable Social Security claim age (62-70, default 67, editable on Plan Setup next to the benefit mode) that adjusts the modeled benefit using the same claiming-schedule methodology as FR32, and that determines the age at which modeled Social Security income, taxation, and withdrawal offsets begin in the Timeline, Readiness, and Recommendations. A profile without a stored claim age must default to 67 without user action.
- FR34: The prototype must default new plans to an automatically estimated Social Security benefit at Full Retirement Age based on current earnings, while providing an editable manual entry mode to allow users to supply values from their official Social Security statement.

## 9. Sample Data Model

Store the sample data in a clearly separated JavaScript object, preferably in `data.js` or at the top of `app.js`.

```js
const sampleProfile = {
  name: "Alex Morgan",
  currentAge: 45,
  targetRetirementAge: 65,
  lifeExpectancy: 90,
  state: "Florida",
  filingStatus: "Married filing jointly",
  annualSalary: 150000,
  otherAnnualIncome: 0,
  annualSavings: 30000,
  currentAnnualExpenses: 85000,
  retirementAnnualSpendingGoal: 75000,
  expectedAnnualReturn: 0.05,
  inflationRate: 0.025,
  projectionBasis: "real_dollars",
  safeWithdrawalRate: 0.04,
  federalStandardDeduction: 30000,
  // Florida has no state income tax; this is the default so most users start with 0%.
  stateIncomeTaxRate: 0,
  taxableGainsTaxRate: 0.15,
  preTaxWithdrawalTaxRate: 0.22,
  rothConversionAnnualAmount: 0,
  socialSecurityBenefitMode: "auto",
  socialSecurityAnnualBenefit: 0,
  // Full Retirement Age (67) is the default and supported range is 62-70; the Full Retirement Age
  // benefit is adjusted for this claim age.
  socialSecurityClaimAge: 67,
  socialSecurityTaxablePercent: 0.85,
  rmdStartAge: 73,
  niitThreshold: 250000,
  cashReserveTargetYears: 1,
  irmaaIncomeThreshold: 200000,
  irmaaAnnualSurcharge: 0,
  assets: {
    brokerage: 180000,
    fourOhOneK: 420000,
    traditionalIra: 90000,
    rothIra: 80000,
    cash: 50000,
    realEstate: 350000,
  },
};
```

The exact sample values may be adjusted by the implementation agent, but the dataset must be internally consistent and must produce visible content in every required page. The implementation also keeps a separate, initially empty map of per-age wealth-timeline overrides; it is runtime state, not sample data, and is cleared whenever the sample dataset is reset.

## 10. Calculation Rules

Use simplified, transparent calculations suitable for a prototype. Keep calculation functions separate from rendering functions.

### Asset totals

- Financial assets = brokerage + 401(k) + Traditional IRA + Roth IRA + cash.
- Total assets = financial assets + real estate.
- If liabilities are added, net worth = total assets - total liabilities.

### Cash flow

- Total annual income = salary + other annual income.
- Employee 401(k) contribution = employee 401(k) rate x annual salary.
- Traditional IRA contribution = a fixed editable annual dollar amount, not a percentage of income. This better matches how users plan IRA funding (for example, "$7,000 per year") and avoids unrealistic contribution levels a percentage of income could produce.
- Illustrative current income taxes apply after those employee pre-tax contributions.
- Roth IRA contribution = a fixed editable annual dollar amount, not a percentage of income. It does not reduce taxable income and is subtracted from income remaining after illustrative taxes and employee pre-tax contributions, alongside brokerage and cash contributions.
- Brokerage and cash contributions use the income remaining after illustrative taxes and employee pre-tax contributions.
- An optional "Use current IRS max" shortcut fills the Traditional IRA or Roth IRA annual contribution field with an illustrative current-year IRA limit; it only populates the field and introduces no separate contribution logic.
- Legacy profiles saved with percentage-based `contributionRates.traditionalIra`/`contributionRates.rothIra` are migrated automatically the first time the model runs: the old percentage formulas are replayed against the profile's own income and tax assumptions to reconstruct an equivalent annual dollar amount, which then becomes the profile's Traditional IRA/Roth IRA annual contribution going forward.
- Employer 401(k) match = the lesser of employee 401(k) contribution x match rate and annual salary x match cap. It increases retirement savings but does not reduce employee income, cash flow, or taxable income.
- After-tax annual surplus = income after employee pre-tax contributions and illustrative taxes - employee post-tax contributions - current annual expenses.
- Employee savings rate = employee contributions / total annual income.

- Total retirement contributions = employee contributions + employer 401(k) match. The UI must distinguish employee savings, employer match, and total retirement contributions.

### Retirement target

- Required retirement assets = retirement annual spending goal / safe withdrawal rate.
- For the sample data above, a 4% safe withdrawal rate implies a target equal to 25 times annual retirement spending.

- If `projectionBasis` is `real_dollars`, treat the return assumption as a real return and do not inflate the spending goal again.
- If the implementation uses nominal dollars instead, inflate the retirement spending goal by the inflation rate through the target retirement year and label all projected values as nominal. The prototype must use one basis consistently.

### Projection

Use a simple annual compounding projection with fixed real-dollar, end-of-year contributions to their matching account buckets:

- Years to target retirement = target retirement age - current age.
- Projected assets = current financial assets compounded at the expected annual return plus calculated employee and employer contributions compounded through the remaining years.
- Do not project real estate as spendable retirement portfolio assets unless the UI explicitly labels it as a separate assumption.
- Account for contributions as end-of-year contributions unless the implementation documents another convention.

A suitable simplified formula is:

```text
projectedAssets = currentFinancialAssets * (1 + returnRate)^years
                  + annualSavings * (((1 + returnRate)^years - 1) / returnRate)
```

Handle a zero return rate without dividing by zero.

### Funding gap

- Funding gap = long-horizon sustainable required retirement assets at the target retirement year - projected after-tax assets at the beginning of that year. Both values must be derived from the shared Timeline retirement engine; the Readiness page must not use a separate target-date-only forecasting methodology.
- If the result is negative, display the absolute value as a projected surplus.

### Expected retirement age

Estimate an expected retirement age by testing future retirement ages until projected assets meet the required target. If the target is not reached by the configured life expectancy, display `Beyond life expectancy` or an equivalent clear state.

### Retirement Health Score

The Retirement Health Score is the primary executive summary indicator on the Readiness page. It is a concise planning aid that summarizes funding progress, savings progress, retirement timing, and long-term sustainability from the shared retirement projection model. It must update when assumptions change and must be presented as a heuristic planning indicator, not a guarantee, probability, or prediction of retirement outcomes.

Implement a transparent score from 0 to 100 based on:

- Progress toward required retirement assets
- Savings rate
- Retirement timing relative to the target age

The exact weighting may be chosen by the implementation agent, but it must be documented in code or a short README note and must always be clamped to the range 0-100. The score must also reflect a shortfall found in the year-by-year wealth timeline (section 6.6), not only the single target-age snapshot, by way of a documented penalty.

The score is a heuristic, not a probability of success. Do not label it as a probability or imply that it is comparable to a Monte Carlo result.

Suggested interpretation:

- 80-100: On Track
- 50-79: Slightly Behind
- 0-49: Major Shortfall

The full RMD divisor table, NIIT surtax, wealth-timeline accumulation/decumulation rules, cash-reserve buffer, and Social Security claiming-age formulas are documented in [`planning/calculation-model.md`](calculation-model.md) rather than duplicated here.

## 11. UI and Styling Requirements

- Create a clean, modern financial-planning dashboard.
- Prioritize clarity, trust, and scanning over decorative complexity.
- Use a responsive layout that works on desktop and mobile.
- Use consistent spacing, typography, headings, cards, tables, and status indicators.
- Present the Retirement Health Score as the main visual focus of the Readiness page.
- Use positive styling for surplus or on-track states and warning styling for gaps or negative cash flow.
- Make financial values easy to scan using currency formatting.
- Include a small assumptions or disclaimer area on the Retirement Readiness page.
- Avoid charts that require external libraries; simple bars, progress indicators, or CSS visualizations are sufficient.
- Ensure all important information remains accessible without relying on color alone.
- Use semantic HTML and accessible labels, headings, focus states, and keyboard-operable navigation.
- Show unavailable future calculations with an explicit state such as `Not modeled in prototype`, rather than displaying invented values.

## 12. Technical Requirements

- Use HTML5, CSS3, and modern vanilla JavaScript.
- Keep the app client-side and static-hosting compatible.
- The app must be deployable to GitHub Pages.
- Do not use a framework, backend, database, or account aggregation service.
- Do not require a package manager or build process for the prototype.
- Keep data, calculations, rendering, navigation, and styling organized into understandable files.
- Define calculation functions with stable, testable inputs and outputs so they can later be compared with workbook scenarios.
- Keep the original sample dataset immutable and maintain a separate working state for user edits.
- Use a single update path for input changes: validate input, update working state, recalculate derived values, then render dependent views.
- Do not duplicate editable values or calculated results across page markup.
- Format currency and percentages using JavaScript formatting utilities.
- Avoid hard-coding calculated results into page markup.
- Handle missing, zero, and invalid numeric values without breaking the UI.
- Include a README with local run instructions and a short explanation of the prototype assumptions.
- Treat `planning/Wealth_Statement.xlsx` and `planning/Retirement_Calculator.xlsx` as read-only research and validation references, not as runtime dependencies.

## 13. Expected Deliverables

Create a static web app with a structure similar to:

```text
index.html
styles.css
app.js
data.js             (optional)
README.md
planning/wireframe-navigation.md
planning/wireframe-profile.md
planning/wireframe-assets.md
planning/wireframe-income-expenses.md
planning/wireframe-retirement-readiness.md
planning/wireframe-recommendations.md
```

The app may use additional files if they improve clarity, but it must remain simple to run locally by opening `index.html` or serving the folder with a basic static server.

## 14. Acceptance Criteria

- All six required pages or views exist:
  - Profile
  - Assets
  - Income & Expenses
  - Retirement Readiness
  - Wealth Timeline
  - Recommendations
- Navigation between all pages works from any page.
- The active page is visually identifiable.
- The sample profile appears consistently throughout the app.
- Asset totals are calculated from the underlying asset values.
- Income, expenses, savings rate, and surplus are displayed.
- Retirement Readiness displays a score from 0 to 100.
- Retirement Readiness displays target age, expected age, projected assets, required assets, and gap or surplus.
- Recommendations are generated from the sample data and limited to the top three.
- The app includes a clear educational disclaimer.
- The layout is usable on desktop and mobile widths.
- The app works without a backend, login, external API, or build step.
- The app can be hosted on GitHub Pages.
- The README explains how to run the prototype and describes the simplified calculations.
- The README identifies which workbook concepts are implemented, simplified, or deferred.
- The app does not describe the Retirement Health Score as a probability of retirement success.
- Each recommendation displays why it was generated.
- Investable assets and real estate are visibly distinguished.
- Tax, Roth conversion, Social Security, IRMAA, and RMD outputs are visibly labeled as simplified illustrative estimates.
- Core profile, asset, income, expense, and projection-assumption fields are editable.
- Editing a valid field updates dependent calculations without a page reload.
- Changes made on one page are reflected when the user navigates to another page.
- Invalid input is handled visibly without `NaN`, broken layouts, or stale calculated results.
- Resetting the sample data restores the original displayed values and calculations, including clearing any wealth-timeline overrides.
- Every age in the Wealth Timeline falls back to the modeled value when its override is blank, and an override at one age does not change any other age.
- A wealth-timeline shortfall (projected depletion before life expectancy) or IRMAA-triggering year is reflected in the Retirement Health Score or Recommendations, not only on the Timeline page.

## 15. Future Enhancements

### Phase 1: Prototype / P0

- Scenario comparison using the same transparent projection functions. The Wealth Timeline's per-year overrides partially address this for a single scenario; named, side-by-side scenario comparison remains future work.
- Optional local storage persistence.

### Phase 2: Tax-aware planning / P1

- Roth conversion modes: Base, Suggested, and Aggressive.
- Basic federal tax projections.
- Social Security claiming optimization beyond the illustrative, single-filer claiming-age comparison already implemented in P0.
- Withdrawal-order analysis beyond the fixed cash → brokerage → pre-tax → Roth order already used by the wealth timeline.
- Validation against documented workbook scenarios.

### Phase 3: Advanced planning / P2

- Monte Carlo simulation.
- Account aggregation.
- RMD alerting and more complete RMD cash-flow treatment beyond the illustrative divisor-table estimate already implemented in P0.
- More detailed scenario comparisons.
- Estate-planning features.

## 16. Model Validation Requirements

- Create a small set of documented input scenarios and expected outputs before implementing tax-aware features.
- Compare future tax, Roth conversion, Social Security, and RMD results against selected workbook outputs.
- Record which workbook assumptions are supported, simplified, or intentionally excluded.
- Keep `planning/Wealth_Statement.xlsx` and `planning/Retirement_Calculator.xlsx` unchanged when building or running the prototype; both are read-only research and validation references, never loaded at runtime.
- Do not import workbook formulas into the prototype without first defining their inputs, outputs, units, and edge-case behavior.
- Treat ending account balances as incomplete measures of household wealth when modeled RMD cash has left the tracked accounts.

### Cross-checked against `planning/Retirement_Calculator.xlsx`

- The RMD divisor table (ages 72-95) was copied directly from that workbook's Assumptions sheet and matches for the overlapping age range; ages 96-100 and beyond extend the same IRS Uniform Lifetime Table pattern and are not present in the workbook.
- The Social Security early-claim reduction (5/9% per month for the first 36 months, 5/12% per month beyond that) and delayed-claim credit (2/3% per month, 8% per year) match the constants embedded in that workbook's Social Security sheet formulas.
- Known differences: the workbook models a married couple with spousal Social Security benefits and exact claim dates; the prototype models a single benefit input and whole-year ages only. The workbook's brokerage tax formula stacks ordinary income and long-term capital gains through real IRS brackets plus NIIT; the prototype uses an editable flat taxable-gains rate plus the same NIIT rule, not full bracket stacking. The workbook's cash-reserve rule tops up a fixed target every year; the prototype's cash-reserve buffer only refills from brokerage in a positive-return year, to more directly illustrate sequence-of-returns risk.

## 17. Product and Financial Disclaimer

Wealth Map is an educational prototype. Its projections use simplified assumptions and are not guarantees of investment performance, retirement success, tax outcomes, or Social Security benefits. The app does not provide financial, tax, or legal advice. Users should consult qualified professionals before making financial decisions.
