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
Traditional IRA contribution = gross annual income * Traditional IRA rate
taxable income before standard deduction = max(0, gross annual income - employee pre-tax contributions)
current federal tax = simplified progressive brackets(taxable income before standard deduction)
current state tax = taxable income before standard deduction * state income tax rate
income available after taxes = taxable income before standard deduction - federal tax - state tax
Roth, brokerage, and cash contributions = their rates * income available after taxes
employee savings = all employee account contributions
employer 401(k) match = min(employee 401(k) contribution * match rate, annual salary * match cap)
after-tax annual surplus = income available after taxes - post-tax contributions - current annual expenses
savings rate = employee savings / gross annual income
```

Employee pre-tax contributions reduce the simplified tax base. Employer match is not employee income or cash spending: it does not reduce take-home pay, annual surplus, or the savings-rate denominator. It is shown separately and added to projected 401(k) assets. Federal brackets and state tax are illustrative only; payroll taxes, credits, deductions beyond the standard deduction, and local taxes are not modeled.

## Assets and projection

```text
financial assets = brokerage + 401(k) + Traditional IRA + Roth IRA + cash
total assets = financial assets + real estate
```

Real estate is excluded from the retirement portfolio projection and required-retirement-assets calculation.

Each contribution rate calculates an annual dollar contribution for its matching bucket. In each projection year, brokerage, pre-tax accounts, and Roth accounts grow at the real return. Cash does not receive an investment return. Calculated contributions are added at year end to their matching account. Employee and employer 401(k) contributions are both added to the pre-tax 401(k) balance.

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

At the target age:

```text
after-tax projected assets = brokerage + Roth + cash
                             + pre-tax assets * (1 - pre-tax withdrawal tax rate)
```

This is an account-level tax-treatment approximation. It does not optimize conversion size, withdrawal order, or the account used to pay conversion taxes. A conversion tax that exceeds the available taxable brokerage balance is not a complete cash-flow model.

## Retirement need and readiness

The model estimates the taxable portion of Social Security from the editable benefit and taxable percentage. It subtracts its simplified tax estimate from the benefit. If the age being evaluated is at or above the editable RMD start age, it divides pre-tax assets by an illustrative IRS Uniform Lifetime Table divisor (ages 72-100, clamped at both ends) to estimate the RMD. The RMD and taxable Social Security can trigger the editable IRMAA surcharge.

```text
portfolio spending need = max(0, retirement spending goal - net Social Security)
gross portfolio spending need = portfolio spending need / (1 - pre-tax withdrawal tax rate)
required retirement assets = (gross portfolio spending need + IRMAA surcharge)
                           / safe withdrawal rate
funding gap = required retirement assets - after-tax projected assets
safe annual spending = after-tax projected assets * safe withdrawal rate
                       + net Social Security - IRMAA surcharge
```

The expected retirement age is the first age from current age through life expectancy where projected after-tax assets meet that age's required retirement assets. Otherwise, the app reports `Beyond life expectancy`.

The Retirement Health Score is a heuristic, not a probability:

```text
funding component = clamp(projected assets / required assets, 0, 1) * 60
savings component = clamp(savings rate / 20%, 0, 1) * 25
timing component = 15 when expected age is at or before target age
                   otherwise declines linearly to 0 at life expectancy
sustainability penalty = 0 when the timeline never depletes before life expectancy,
                         otherwise up to 20, scaled by how many years early it depletes
score = round(clamp(funding + savings + timing - sustainability penalty, 0, 100))
```

The sustainability penalty is the only place the year-by-year wealth timeline (see below), rather than the single target-age snapshot, feeds back into the score. Scores of 80-100 are `On Track`, 50-79 are `Slightly Behind`, and 0-49 are `Major Shortfall`.

## Wealth timeline

The Timeline view builds one row per age from the current age through life expectancy, reusing the same contribution, growth, tax, and RMD rules described above. Each row can be overridden by the user for that single age only; a blank override falls back to the modeled value. Supported overrides: expected annual return, income (working years only), retirement spending goal (retired years only), and a one-time extra withdrawal (retired years only). Overrides are stored separately from the sample data so Reset always clears them.

While working, each year accumulates contributions and grows balances exactly as in the accumulation projection above, including the annual Roth conversion. Once the target retirement age is reached, each year instead:

```text
RMD = pre-tax balance (prior year-end) / RMD divisor for that age, or 0 before the RMD start age
IRMAA = surcharge when (taxable Social Security + RMD) exceeds the IRMAA threshold, else 0
spending need = max(0, spending goal + extra withdrawal + IRMAA - net Social Security - RMD)
```

The spending need is withdrawn in order: cash, then brokerage, then pre-tax (grossed up by the pre-tax withdrawal tax rate), then Roth. The RMD amount is always removed from the pre-tax balance for that year, whether or not it was needed for spending. After withdrawals, if the year's real return was positive and cash is below a target buffer (`cash reserve target years * spending goal`), the model sweeps brokerage into cash to refill the buffer — but never sells brokerage to refill the buffer after a down year, to reduce sequence-of-returns risk. Balances are floored at zero; a year that cannot fully fund its spending need simply ends at $0 rather than going negative.

## Social Security claiming-age comparison

The Profile view shows an illustrative, read-only comparison of the annual Social Security benefit at claiming ages 62 through 70, treating the entered benefit as the full-retirement-age (67) amount. Early claims reduce the benefit 5/9% per month for the first 36 months early and 5/12% per month beyond that; delayed claims add 2/3% per month (8% per year) after age 67. This is a single-filer estimate; spousal benefits, actual full-retirement-age variation by birth year, and claiming optimization are not modeled.

## Recommendation rules

The app returns at most three recommendations, evaluated in this order: the wealth timeline projecting asset depletion before life expectancy, employee savings rate below 20%, a positive funding gap, a retirement spending goal above safe annual spending, more than half of financial assets in tax-deferred accounts, and the wealth timeline projecting an IRMAA-triggering year. Effects are qualitative unless the app directly recalculates the referenced metric; the two timeline-based rules cite the specific age found in the year-by-year projection.

## Exclusions

The model excludes payroll taxes, itemized deductions, credits, capital-gains holding-period treatment, tax-law changes, inflation-indexed brackets, IRS contribution limits, eligibility checks, employer-match vesting, salary growth, employer-match changes, Social Security claiming optimization, full RMD cash-flow treatment beyond the illustrative divisor table, Monte Carlo simulation, and estate planning. The workbook in this repository is never read or modified at runtime.
