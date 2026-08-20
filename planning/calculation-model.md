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

Each contribution rate calculates an annual dollar contribution for its matching bucket. In each projection year, brokerage, pre-tax accounts, and Roth accounts grow at the real return; brokerage growth is reduced by the editable taxable-gains tax rate. Cash does not receive an investment return. Calculated contributions are added at year end to their matching account. Employee and employer 401(k) contributions are both added to the pre-tax 401(k) balance.

```text
brokerage growth = brokerage * (1 + real return * (1 - taxable gains tax rate))
pre-tax and Roth growth = balance * (1 + real return)
```

The loop-based implementation also handles a zero return without dividing by zero.

## Roth conversions and after-tax assets

For each projected year, the model moves the editable annual Roth conversion amount from pre-tax accounts to the Roth account, limited by the available pre-tax balance. It estimates the incremental federal and state tax caused by that conversion against current ordinary income. The full converted amount moves to Roth; the estimated conversion tax is removed from taxable brokerage. This avoids charging conversion tax twice.

At the target age:

```text
after-tax projected assets = brokerage + Roth + cash
                             + pre-tax assets * (1 - pre-tax withdrawal tax rate)
```

This is an account-level tax-treatment approximation. It does not optimize conversion size, withdrawal order, or the account used to pay conversion taxes. A conversion tax that exceeds the available taxable brokerage balance is not a complete cash-flow model.

## Retirement need and readiness

The model estimates the taxable portion of Social Security from the editable benefit and taxable percentage. It subtracts its simplified tax estimate from the benefit. If the age being evaluated is at or above the editable RMD start age, it calculates an illustrative RMD as pre-tax assets times the RMD rate. The RMD and taxable Social Security can trigger the editable IRMAA surcharge.

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
score = round(clamp(funding + savings + timing, 0, 100))
```

Scores of 80-100 are `On Track`, 50-79 are `Slightly Behind`, and 0-49 are `Major Shortfall`.

## Recommendation rules

The app returns at most three recommendations in this order: employee savings rate below 20%, a positive funding gap, a retirement spending goal above safe annual spending, and more than half of financial assets in tax-deferred accounts. Effects are qualitative unless the app directly recalculates the referenced metric.

## Exclusions

The model excludes payroll taxes, itemized deductions, credits, detailed capital-gains treatment, tax-law changes, inflation-indexed brackets, IRS contribution limits, eligibility checks, employer-match vesting, salary growth, employer-match changes, Social Security claiming optimization, withdrawal sequencing, full RMD cash-flow treatment, Monte Carlo simulation, and estate planning. The workbook in this repository is never read or modified at runtime.