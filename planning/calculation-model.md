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
taxable federal income = max(0, gross annual income - standard deduction)
current federal tax = simplified progressive brackets(taxable federal income)
current state tax = max(0, gross annual income) * state income tax rate
after-tax annual surplus = gross annual income - federal tax - state tax - current annual expenses
savings rate = annual savings / gross annual income
```

The displayed annual surplus does not subtract annual savings. Savings is a separate explicit planning contribution and should not be counted twice. Federal brackets and state tax are illustrative only; payroll taxes, credits, deductions beyond the standard deduction, and local taxes are not modeled.

## Assets and projection

```text
financial assets = brokerage + 401(k) + Traditional IRA + Roth IRA + cash
total assets = financial assets + real estate
```

Real estate is excluded from the retirement portfolio projection and required-retirement-assets calculation.

Starting financial assets determine each account's contribution share. In each projection year, brokerage, pre-tax accounts, and Roth accounts grow at the real return; brokerage growth is reduced by the editable taxable-gains tax rate. Cash does not receive an investment return. The annual savings contribution is added at year end using those starting account shares.

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

The app returns at most three recommendations in this order: savings rate below 20%, a positive funding gap, a retirement spending goal above safe annual spending, and more than half of financial assets in tax-deferred accounts. Effects are qualitative unless the app directly recalculates the referenced metric.

## Exclusions

The model excludes payroll taxes, itemized deductions, credits, detailed capital-gains treatment, tax-law changes, inflation-indexed brackets, Social Security claiming optimization, withdrawal sequencing, full RMD cash-flow treatment, Monte Carlo simulation, and estate planning. The workbook in this repository is never read or modified at runtime.