# Wealth Map Calculation Model

## Purpose and boundary

Wealth Map is an educational retirement-readiness prototype. Every amount is a deterministic estimate from the editable client-side profile. It is not tax software, a retirement plan, a forecast of investment performance, or financial, tax, or legal advice.

The model uses real dollars. The entered expected return is nominal and is converted before projection:

```text
real return = (1 + nominal return) / (1 + inflation rate) - 1
```

The retirement spending goal is not inflated again. The prototype does not offer a nominal-dollar projection.

## Current cash flow

```text
gross annual income = annual salary + other annual income
employee 401(k) contribution = annual salary * employee 401(k) rate
Traditional IRA contribution = fixed editable annual dollar amount (not a percentage of income)
taxable income before standard deduction = max(0, gross annual income - employee pre-tax contributions)
current federal tax = simplified progressive brackets(taxable income before standard deduction)
current state tax = taxable income before standard deduction * state income tax rate
income available after taxes = taxable income before standard deduction - federal tax - state tax
Roth IRA contribution = fixed editable annual dollar amount (not a percentage of income)
brokerage and cash contributions = their rates * income available after taxes
employee savings = all employee account contributions
employer 401(k) match = min(employee 401(k) contribution * match rate, annual salary * match cap)
after-tax annual surplus = income available after taxes - Roth IRA, brokerage, and cash contributions - current annual expenses
savings rate = employee savings / gross annual income
```

Traditional IRA and Roth IRA contributions are entered as fixed annual dollar amounts rather than percentages of income; this better matches how users plan IRA funding (for example, "$7,000 per year") and avoids unrealistic contribution levels that a percentage of income could otherwise produce. Traditional IRA keeps its pre-tax treatment: its annual amount reduces the simplified tax base exactly like the employee 401(k) contribution. Roth IRA keeps its after-tax treatment: its annual amount does not change taxable income and is instead subtracted, alongside brokerage and cash contributions, from the after-tax annual surplus. Employee pre-tax contributions reduce the simplified tax base. Employer match is not employee income or cash spending: it does not reduce take-home pay, annual surplus, or the savings-rate denominator. It is shown separately and added to projected 401(k) assets. Federal brackets and state tax are illustrative only; payroll taxes, credits, deductions beyond the standard deduction, and local taxes are not modeled.

### Legacy percentage-based IRA contributions

Profiles created before this model change may still carry the legacy `contributionRates.traditionalIra` and `contributionRates.rothIra` percentages. Before any calculation runs, the model migrates such a profile automatically: it replays the original percentage-based formulas above (Traditional IRA rate against gross annual income; Roth IRA rate against income available after taxes and pre-tax contributions) to reconstruct the approximate dollar amount the user intended, rounds each to the nearest dollar, stores them as the new annual IRA contribution amounts, and removes the legacy percentage fields. The migration is a one-time, best-effort conversion that preserves the user's original savings intent; it is not re-applied once a profile carries annual IRA contribution amounts.

## Assets and projection

```text
financial assets = brokerage + 401(k) + Traditional IRA + Roth IRA + cash
total assets = financial assets + real estate
```

Real estate is excluded from the retirement portfolio projection and required-retirement-assets calculation.

Each contribution rate or fixed annual IRA amount calculates an annual dollar contribution for its matching bucket. In each projection year, brokerage, pre-tax accounts, and Roth accounts grow at the real return. Cash does not receive an investment return. Calculated contributions are added at year end to their matching account, including the fixed Traditional IRA and Roth IRA annual amounts, which are added to the pre-tax and Roth balances respectively every year and participate in the same investment growth as the rest of the account. Employee and employer 401(k) contributions are both added to the pre-tax 401(k) balance.

Brokerage gains are taxed once per year instead of compounding pre-tax:

```text
annual brokerage gain = max(0, brokerage * real return)
gains tax = annual brokerage gain * taxable gains tax rate
NIIT = min(annual brokerage gain, max(0, ordinary income + annual brokerage gain - NIIT MAGI threshold)) * 3.8%
brokerage growth = brokerage + annual brokerage gain - gains tax - NIIT
pre-tax and Roth growth = balance * (1 + real return)
```

A negative or zero real return skips the gains tax and NIIT for that year. The 3.8% NIIT rate is a fixed illustrative constant; only the MAGI threshold is editable. The loop-based implementation also handles a zero return without dividing by zero.

## Roth conversions and after-tax assets

For each projected year, the model moves the editable annual Roth conversion amount from pre-tax accounts to the Roth account, limited by the available pre-tax balance. It estimates the incremental federal and state tax caused by that conversion against current ordinary income. The full converted amount moves to Roth; the estimated conversion tax is removed from taxable brokerage. This avoids charging conversion tax twice.

At the beginning of the target retirement year:

```text
after-tax projected assets = brokerage + Roth + cash
                             + pre-tax assets * (1 - pre-tax withdrawal tax rate)
```

This is an account-level tax-treatment approximation. It does not optimize conversion size, withdrawal order, or the account used to pay conversion taxes. A conversion tax that exceeds the available taxable brokerage balance is not a complete cash-flow model.

## Retirement need and readiness

The model estimates the taxable portion of Social Security from the editable benefit and taxable percentage. It subtracts its simplified tax estimate from the benefit. If the age being evaluated is at or above the editable RMD start age, it divides pre-tax assets by an illustrative IRS Uniform Lifetime Table divisor (ages 72-100, clamped at both ends) to estimate the RMD. The RMD and taxable Social Security can trigger the editable IRMAA surcharge.

The Readiness page's `Projected Social Security Tax` is the cumulative projected Social Security taxation across all retired rows returned by the existing `buildTimelineRows()` engine, through life expectancy. It sums each row's modeled `socialSecurityTax` value rather than showing a single-year snapshot, the tax at retirement age, or a separate Social Security tax engine. The value must remain sourced from the same timeline and tax logic that drive the detailed retirement model so retirement age, life expectancy, RMDs, withdrawals, income assumptions, tax assumptions, Social Security assumptions, timeline overrides, and future enhancements that affect taxation of benefits can influence it. The total is a high-level illustrative estimate of cumulative tax paid on Social Security benefits across retirement; use the Timeline for annual Social Security tax detail and timing.

The Readiness page's `Projected RMD` is the cumulative projected RMD exposure across the retirement horizon. It sums the `rmd` value from every retired row returned by the existing `buildTimelineRows()` engine, from the first modeled RMD year through life expectancy. It must remain sourced from this timeline summary rather than a target-age snapshot, first-year value, or separate RMD calculation. Any input or future model enhancement that changes projected pre-tax balances or the timeline's annual RMD schedule can change this value, including balances, contributions, employer match, Roth conversions, retirement and RMD start ages, life expectancy, income, spending, return, inflation, timeline overrides, and withdrawal behavior. The total is expressed in the model's selected projection basis and represents modeled mandatory distributions, not taxes owed or spendable cash after tax. Use the Timeline for annual RMD detail.

The Readiness page's `Projected NIIT` is the cumulative projected net investment income tax exposure across the full modeled horizon, from the current age through life expectancy. It sums the `niit` value on every row returned by `buildTimelineRows()`, including both accumulation and retirement years, rather than using the target-age portfolio snapshot. It remains sourced from the same timeline engine and the existing `applyBrokerageGrowth()` NIIT calculation, so asset balances, brokerage growth and investment gains, retirement age, life expectancy, tax and income assumptions, timeline overrides, withdrawal behavior, and future changes to the retirement model can change it. The total is an illustrative estimate of modeled NIIT, not an official tax liability or a prediction of actual tax owed; use the Timeline for annual context.

The Readiness page's `Projected IRMAA` is the cumulative projected Medicare income-related surcharge across all retired rows returned by `buildTimelineRows()`, through life expectancy. It sums each row's existing `irmaa` value from `timelineSummary()` and must not use a single-year snapshot, the retirement-age value, or a separate IRMAA calculation. The annual row value is triggered by taxable Social Security plus RMD exceeding the editable IRMAA income threshold and uses the editable annual surcharge. Therefore projected balances, RMDs, Social Security taxability and benefit, retirement and life-expectancy ages, spending, return, inflation, timeline overrides, withdrawal behavior, and the IRMAA assumptions can affect the total. The value is an illustrative estimate, not an official Medicare premium determination; use the Timeline for annual amounts and timing. Future IRMAA model changes must flow through the existing timeline engine so this Readiness summary remains reconciled with detailed projections.

The Readiness page's `Safe Spending` value is the maximum annual retirement spending goal that remains sustainable from the target retirement year through life expectancy. The calculation searches for that amount by changing only `retirementAnnualSpendingGoal` on a cloned profile and rerunning `buildTimelineRows()` for each trial. A trial is sustainable only when the Timeline has no retired row ending at zero, so the result uses the same withdrawal order, cash-reserve rule, returns, taxes, Social Security, RMDs, IRMAA, NIIT, Roth conversions, and timeline overrides as the detailed projection. It is expressed in the model's real-dollar basis and is an illustrative estimate, not a guarantee or advice. If even zero planned spending cannot avoid depletion because of other modeled withdrawals or assumptions, Safe Spending is `$0`.

The configurable safe withdrawal rate remains part of the required-assets and readiness assumptions. It does not replace the Timeline-based Safe Spending calculation and should not be interpreted as a guarantee of sustainable spending.

```text
trial spending goal = candidate annual retirement spending amount
Safe Spending = maximum trial spending goal for which
                Timeline(candidate profile).depletionAge is null
```

The Readiness funding comparison uses one planning philosophy for both headline values: `Projected Assets` is the after-tax value of the account balances at the beginning of the target retirement year, and `Required Assets` is the minimum after-tax target-year portfolio that remains solvent through the configured life expectancy. The required value is found by scaling the target-year account mix and repeatedly running the same retirement rows used by the Timeline until no retired row depletes. It therefore includes the selected spending, return, inflation, taxes, Social Security, RMD, IRMAA, cash-reserve, withdrawal-order, and timeline-override assumptions. A positive funding gap means the target-year portfolio is below the long-horizon sustainable threshold; a negative gap is shown as a projected surplus.

The Timeline is the source of truth for both values. Its target-age row supplies the projected account balances, and its retirement-year simulation defines whether those balances survive to life expectancy. The Readiness page must not introduce a separate target-date-only forecasting method. Its `Projected assets at retirement` and `Required at retirement for life expectancy` labels make the shared starting point and different role of each value explicit; the Timeline remains the annual detail view.

The expected retirement age is the first age from current age through life expectancy where the projected after-tax portfolio meets the retirement target used for that age. Otherwise, the app reports `Beyond life expectancy`. A plan that depletes before life expectancy cannot receive an executive-summary assessment of full funding, even when its target-year snapshot appears large enough under a single-year withdrawal-rate calculation.

The Retirement Health Score is the primary executive summary indicator for the Readiness page. It is a high-level planning aid that combines four ideas users can act on: progress toward the sustainable retirement funding requirement, current savings progress, timing relative to the target retirement age, and whether the Timeline remains solvent through life expectancy. It automatically recalculates when the shared profile, asset, income, spending, tax, return, retirement, or timeline assumptions change. It is a heuristic, not a guarantee, probability, or prediction of retirement outcomes:

```text
funding component = clamp(projected assets / required assets, 0, 1) * 60
savings component = clamp(savings rate / 20%, 0, 1) * 25
timing component = 15 when expected age is at or before target age
                   otherwise declines linearly to 0 at life expectancy
sustainability penalty = 0 when the timeline never depletes before life expectancy,
                         otherwise up to 20, scaled by how many years early it depletes
score = round(clamp(funding + savings + timing - sustainability penalty, 0, 100))
```

The funding component already uses the long-horizon sustainable requirement. The depletion penalty adds severity based on how early a shortfall occurs. Scores of 80-100 are `On Track`, 50-79 are `Slightly Behind`, and 0-49 are `Major Shortfall`.

## Wealth timeline

The Timeline view builds one row per age from the current age through life expectancy, reusing the same contribution, growth, tax, and RMD rules described above. Each row can be overridden by the user for that single age only; a blank override falls back to the modeled value. Supported overrides: expected annual return, income (working years only), retirement spending goal (retired years only), and a one-time extra withdrawal (retired years only). Overrides are stored separately from the sample data so Reset always clears them.

While working, each year accumulates contributions and grows balances exactly as in the accumulation projection above, including the annual Roth conversion. Once the target retirement age is reached, each year instead:

```text
RMD = pre-tax balance (prior year-end) / RMD divisor for that age, or 0 before the RMD start age
IRMAA = surcharge when (taxable Social Security + RMD) exceeds the IRMAA threshold, else 0
spending need = max(0, spending goal + extra withdrawal + IRMAA - net Social Security - RMD)
```

The spending need is withdrawn in order: cash, then brokerage, then pre-tax (grossed up by the pre-tax withdrawal tax rate), then Roth. The RMD amount is always removed from the pre-tax balance for that year, whether or not it was needed for spending. After withdrawals, if the year's real return was positive and cash is below a target buffer (`cash reserve target years * spending goal`), the model sweeps brokerage into cash to refill the buffer — but never sells brokerage to refill the buffer after a down year, to reduce sequence-of-returns risk. Balances are floored at zero; a year that cannot fully fund its spending need simply ends at $0 rather than going negative.

### Timeline portfolio composition

The Timeline presents composition directly within the retirement workbench, not as an investment-performance graph. It shows snapshots at the current modeled year, the first retirement year, the first modeled RMD year when present, and life expectancy. Each snapshot uses that row's `endBalances` and reports dollars and percentage of financial assets for cash, taxable brokerage, tax-deferred accounts (401(k) and Traditional IRA combined), and Roth. Real estate is excluded because the model does not treat it as automatically spendable retirement portfolio assets.

These snapshots help users compare the account sources available for withdrawal sequencing and liquidity planning. A tax-deferred majority signals potential taxable-income exposure; the first RMD snapshot identifies when mandatory distributions begin; the Roth share shows tax-free flexibility; and the cash share shows the modeled short-term reserve. The same annual rows continue to provide RMD, IRMAA, withdrawal, and ending-asset detail, so composition remains connected to retirement sustainability and updates whenever assumptions or timeline overrides change.

## Social Security claim age and claiming-age comparison

The Social Security annual benefit entered on Plan Setup is always treated as the Full Retirement Age (67) amount. A first-class Plan Setup field, Social Security claim age (62-70, default 67), determines when benefits start and how much they pay: `benefitForClaimAge(fraBenefit, claimAge)` reduces the benefit 5/9% per month for the first 36 months claimed early and 5/12% per month beyond that, and adds 2/3% per month (8% per year) for each month claimed after 67. The Timeline, retirement readiness, and tax calculations always use this claim-age-adjusted benefit, never the raw Full Retirement Age amount.

`resolveSocialSecurityPlan()` resolves the concrete claim age and adjusted benefit once per calculation: the "manual" strategy (the default) uses the Plan Setup claim age and benefit directly; the "auto" strategy, selectable on the Timeline page, instead estimates a benefit from salary and searches claim ages 62-70 with the shared timeline engine for the age that keeps the plan solvent longest. `resolveEffectiveProfile()` then substitutes the resolved claim age and adjusted benefit into the profile used by every downstream calculation, so the Timeline, Readiness page, and Recommendations share one concrete assumption.

In the year-by-year timeline, Social Security income, its taxation, and its offset to required retirement withdrawals are all zero for retired ages before the claim age, and all active at and after it — there is no partial-year proration. A saved profile without a `socialSecurityClaimAge` value falls back to 67 automatically.

The Timeline also shows an illustrative, read-only comparison of the annual Social Security benefit at claiming ages 62 through 70, using the same `benefitForClaimAge` formula and treating the entered benefit as the full-retirement-age (67) amount. Early claims reduce the benefit 5/9% per month for the first 36 months early and 5/12% per month beyond that; delayed claims add 2/3% per month (8% per year) after age 67. This is a single-filer estimate; spousal benefits, actual full-retirement-age variation by birth year, and claiming optimization are not modeled. A "Social Security begins" milestone on the Timeline page displays the selected claim age whenever a nonzero benefit is modeled.

## Recommendation rules

The app returns at most three recommendations, evaluated in this order: the wealth timeline projecting asset depletion before life expectancy, employee savings rate below 20%, a positive funding gap, a retirement spending goal above safe annual spending, more than half of financial assets in tax-deferred accounts, and the wealth timeline projecting an IRMAA-triggering year. Effects are qualitative unless the app directly recalculates the referenced metric; the two timeline-based rules cite the specific age found in the year-by-year projection.

## Exclusions

The model excludes payroll taxes, itemized deductions, credits, capital-gains holding-period treatment, tax-law changes, inflation-indexed brackets, IRS contribution limits, eligibility checks, employer-match vesting, salary growth, employer-match changes, Social Security claiming optimization, full RMD cash-flow treatment beyond the illustrative divisor table, Monte Carlo simulation, and estate planning. The workbook in this repository is never read or modified at runtime.
