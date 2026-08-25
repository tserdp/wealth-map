const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

let workingProfile = cloneSampleProfile();
let currentPage = "readiness";

const pageTitles = {
  readiness: ["READINESS", "Retirement Readiness"],
  profile: ["PROFILE", "Profile"],
  assets: ["ASSETS", "Assets"],
  cashflow: ["CASH FLOW", "Income & Expenses"],
  timeline: ["TIMELINE", "Wealth Timeline"],
  recommendations: ["RECOMMENDATIONS", "Recommendations"],
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const setText = (selector, value) => {
  const element = $(selector);
  if (element) element.textContent = String(value);
};
const setWidth = (selector, value) => {
  const element = $(selector);
  if (element) element.style.width = value;
};
const money = (value) =>
  currencyFormatter.format(Number.isFinite(value) ? value : 0);
const percent = (value) =>
  percentFormatter.format(Number.isFinite(value) ? value : 0);
const numberValue = (value) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

// IRS Uniform Lifetime Table divisors (illustrative, ages 72-100+).
const RMD_DIVISOR_TABLE = {
  72: 27.4,
  73: 26.5,
  74: 25.5,
  75: 24.6,
  76: 23.7,
  77: 22.9,
  78: 22,
  79: 21.1,
  80: 20.2,
  81: 19.4,
  82: 18.5,
  83: 17.7,
  84: 16.8,
  85: 16,
  86: 15.2,
  87: 14.4,
  88: 13.7,
  89: 12.9,
  90: 12.2,
  91: 11.5,
  92: 10.8,
  93: 10.1,
  94: 9.5,
  95: 8.9,
  96: 8.4,
  97: 7.8,
  98: 7.3,
  99: 6.8,
  100: 6.4,
};
const NIIT_RATE = 0.038;
const SOCIAL_SECURITY_FULL_RETIREMENT_AGE = 67;

function rmdDivisor(age) {
  const roundedAge = Math.round(age);
  if (roundedAge <= 72) return RMD_DIVISOR_TABLE[72];
  if (roundedAge >= 100) return RMD_DIVISOR_TABLE[100];
  return RMD_DIVISOR_TABLE[roundedAge] ?? RMD_DIVISOR_TABLE[72];
}

function requiredMinimumDistribution(profile, preTaxBalance, age) {
  if (age < profile.rmdStartAge || preTaxBalance <= 0) return 0;
  const divisor = rmdDivisor(age);
  return divisor > 0 ? preTaxBalance / divisor : 0;
}

// Simplified NIIT: 3.8% of the lesser of investment gain or MAGI over the threshold.
function netInvestmentIncomeTax(profile, ordinaryIncome, investmentGain) {
  if (investmentGain <= 0) return 0;
  const magiOverage = Math.max(
    0,
    ordinaryIncome + investmentGain - profile.niitThreshold,
  );
  return Math.min(investmentGain, magiOverage) * NIIT_RATE;
}

// Taxes annual brokerage gains once (taxable-gains rate + NIIT) instead of compounding pre-tax.
function applyBrokerageGrowth(profile, brokerage, realReturn, ordinaryIncome) {
  if (realReturn <= 0 || brokerage <= 0) {
    return { balance: brokerage * (1 + realReturn), gainsTax: 0, niit: 0 };
  }
  const gain = brokerage * realReturn;
  const gainsTax = gain * profile.taxableGainsTaxRate;
  const niit = netInvestmentIncomeTax(profile, ordinaryIncome, gain);
  return { balance: brokerage + gain - gainsTax - niit, gainsTax, niit };
}

const ILLUSTRATIVE_FEDERAL_BRACKETS = {
  Single: [
    [11925, 0.1],
    [48475, 0.12],
    [103350, 0.22],
    [197300, 0.24],
    [250525, 0.32],
    [626350, 0.35],
    [Infinity, 0.37],
  ],
  "Married filing jointly": [
    [23850, 0.1],
    [96950, 0.12],
    [206700, 0.22],
    [394600, 0.24],
    [501050, 0.32],
    [751600, 0.35],
    [Infinity, 0.37],
  ],
  "Head of household": [
    [17000, 0.1],
    [64850, 0.12],
    [103350, 0.22],
    [197300, 0.24],
    [250500, 0.32],
    [626350, 0.35],
    [Infinity, 0.37],
  ],
};

function progressiveFederalTax(profile, income) {
  const taxableIncome = Math.max(0, income - profile.federalStandardDeduction);
  const brackets =
    ILLUSTRATIVE_FEDERAL_BRACKETS[profile.filingStatus] ||
    ILLUSTRATIVE_FEDERAL_BRACKETS.Single;
  let tax = 0;
  let lowerBound = 0;
  for (const [upperBound, rate] of brackets) {
    const amountInBracket = Math.max(
      0,
      Math.min(taxableIncome, upperBound) - lowerBound,
    );
    tax += amountInBracket * rate;
    lowerBound = upperBound;
    if (taxableIncome <= upperBound) break;
  }
  return tax;
}

function ordinaryIncomeTax(profile, ordinaryIncome) {
  return (
    progressiveFederalTax(profile, ordinaryIncome) +
    Math.max(0, ordinaryIncome) * profile.stateIncomeTaxRate
  );
}

function realAnnualReturn(profile) {
  return (1 + profile.expectedAnnualReturn) / (1 + profile.inflationRate) - 1;
}

function contributionRate(profile, key) {
  return Math.min(1, Math.max(0, numberValue(profile.contributionRates[key])));
}

function calculateContributions(profile, salaryOverride, otherIncomeOverride) {
  const salaryInput =
    salaryOverride != null ? salaryOverride : profile.annualSalary;
  const otherIncomeInput =
    otherIncomeOverride != null
      ? otherIncomeOverride
      : profile.otherAnnualIncome;
  const earnedIncome = Math.max(
    0,
    numberValue(salaryInput) + numberValue(otherIncomeInput),
  );
  const salary = Math.max(0, numberValue(salaryInput));
  const employeeFourOhOneK = salary * contributionRate(profile, "fourOhOneK");
  const traditionalIra =
    earnedIncome * contributionRate(profile, "traditionalIra");
  const employeePreTaxContributions = employeeFourOhOneK + traditionalIra;
  const taxableIncome = Math.max(0, earnedIncome - employeePreTaxContributions);
  const currentFederalTax = progressiveFederalTax(profile, taxableIncome);
  const currentStateTax = taxableIncome * profile.stateIncomeTaxRate;
  const afterTaxIncome = Math.max(
    0,
    taxableIncome - currentFederalTax - currentStateTax,
  );
  const rothIra = afterTaxIncome * contributionRate(profile, "rothIra");
  const brokerage = afterTaxIncome * contributionRate(profile, "brokerage");
  const cash = afterTaxIncome * contributionRate(profile, "cash");
  const employeePostTaxContributions = rothIra + brokerage + cash;
  const matchRate = Math.min(
    1,
    Math.max(0, numberValue(profile.employerMatch.rate)),
  );
  const matchCap = Math.min(
    1,
    Math.max(0, numberValue(profile.employerMatch.salaryCap)),
  );
  const employerFourOhOneKMatch = Math.min(
    employeeFourOhOneK * matchRate,
    salary * matchCap,
  );
  const employeeSavings =
    employeePreTaxContributions + employeePostTaxContributions;

  return {
    earnedIncome,
    taxableIncome,
    currentFederalTax,
    currentStateTax,
    afterTaxIncome,
    employeeFourOhOneK,
    traditionalIra,
    rothIra,
    brokerage,
    cash,
    employeePreTaxContributions,
    employeePostTaxContributions,
    employeeSavings,
    employerFourOhOneKMatch,
    totalRetirementContributions: employeeSavings + employerFourOhOneKMatch,
  };
}

function projectPortfolio(profile, years) {
  const starting = profile.assets;
  const returnRate = realAnnualReturn(profile);
  const contributions = calculateContributions(profile);
  let brokerage = starting.brokerage;
  let preTax = starting.fourOhOneK + starting.traditionalIra;
  let roth = starting.rothIra;
  let cash = starting.cash;
  let conversionTax = 0;
  const baseTax = ordinaryIncomeTax(profile, contributions.taxableIncome);

  for (let year = 0; year < years; year += 1) {
    const growth = applyBrokerageGrowth(
      profile,
      brokerage,
      returnRate,
      contributions.taxableIncome,
    );
    brokerage = growth.balance;
    preTax *= 1 + returnRate;
    roth *= 1 + returnRate;
    cash += contributions.cash;
    brokerage += contributions.brokerage;
    preTax +=
      contributions.employeeFourOhOneK +
      contributions.employerFourOhOneKMatch +
      contributions.traditionalIra;
    roth += contributions.rothIra;

    const conversion = Math.min(
      preTax,
      Math.max(0, profile.rothConversionAnnualAmount),
    );
    if (conversion > 0) {
      const taxOnConversion = Math.max(
        0,
        ordinaryIncomeTax(profile, contributions.taxableIncome + conversion) -
          baseTax,
      );
      preTax -= conversion;
      roth += conversion;
      brokerage = Math.max(0, brokerage - taxOnConversion);
      conversionTax += taxOnConversion;
    }
  }

  return {
    brokerage,
    preTax,
    roth,
    cash,
    conversionTax,
    afterTaxAssets:
      brokerage + roth + cash + preTax * (1 - profile.preTaxWithdrawalTaxRate),
  };
}

function retirementNeed(profile, portfolio, age) {
  const taxableSocialSecurity =
    profile.socialSecurityAnnualBenefit * profile.socialSecurityTaxablePercent;
  const socialSecurityTax = Math.max(
    0,
    ordinaryIncomeTax(profile, taxableSocialSecurity) -
      ordinaryIncomeTax(profile, 0),
  );
  const netSocialSecurity = Math.max(
    0,
    profile.socialSecurityAnnualBenefit - socialSecurityTax,
  );
  const rmd = requiredMinimumDistribution(profile, portfolio.preTax, age);
  const retirementTax = ordinaryIncomeTax(profile, taxableSocialSecurity + rmd);
  const irmaa =
    taxableSocialSecurity + rmd > profile.irmaaIncomeThreshold
      ? profile.irmaaAnnualSurcharge
      : 0;
  const spendingFromPortfolio = Math.max(
    0,
    profile.retirementAnnualSpendingGoal - netSocialSecurity,
  );
  const grossPortfolioSpending =
    profile.preTaxWithdrawalTaxRate < 1
      ? spendingFromPortfolio / (1 - profile.preTaxWithdrawalTaxRate)
      : Infinity;
  const requiredAssets =
    profile.safeWithdrawalRate > 0
      ? (grossPortfolioSpending + irmaa) / profile.safeWithdrawalRate
      : Infinity;
  return {
    requiredAssets,
    rmd,
    irmaa,
    socialSecurityTax,
    netSocialSecurity,
    retirementTax,
  };
}

// Illustrative SSA early/delayed claiming reduction, assuming profile.socialSecurityAnnualBenefit
// is the full retirement age (67) benefit. Single-filer only; no spousal benefit modeling.
function socialSecurityClaimingSchedule(profile) {
  const fraBenefit = Math.max(
    0,
    numberValue(profile.socialSecurityAnnualBenefit),
  );
  const schedule = [];
  for (let claimAge = 62; claimAge <= 70; claimAge += 1) {
    let benefit;
    if (claimAge < SOCIAL_SECURITY_FULL_RETIREMENT_AGE) {
      const monthsEarly = (SOCIAL_SECURITY_FULL_RETIREMENT_AGE - claimAge) * 12;
      const reduction =
        Math.min(monthsEarly, 36) * (5 / 9 / 100) +
        Math.max(monthsEarly - 36, 0) * (5 / 12 / 100);
      benefit = fraBenefit * (1 - reduction);
    } else if (claimAge > SOCIAL_SECURITY_FULL_RETIREMENT_AGE) {
      const monthsLate = (claimAge - SOCIAL_SECURITY_FULL_RETIREMENT_AGE) * 12;
      benefit = fraBenefit * (1 + monthsLate * (2 / 3 / 100));
    } else {
      benefit = fraBenefit;
    }
    schedule.push({ claimAge, annualBenefit: Math.max(0, benefit) });
  }
  return schedule;
}

function calculate(profile) {
  const assets = profile.assets;
  const financialAssets =
    assets.brokerage +
    assets.fourOhOneK +
    assets.traditionalIra +
    assets.rothIra +
    assets.cash;
  const totalAssets = financialAssets + assets.realEstate;
  const contributions = calculateContributions(profile);
  const totalIncome = contributions.earnedIncome;
  const surplus =
    contributions.afterTaxIncome -
    contributions.employeePostTaxContributions -
    profile.currentAnnualExpenses;
  const savingsRate =
    totalIncome > 0 ? contributions.employeeSavings / totalIncome : 0;
  const yearsToTarget = Math.max(
    0,
    profile.targetRetirementAge - profile.currentAge,
  );
  const portfolio = projectPortfolio(profile, yearsToTarget);
  const timelineRows = buildTimelineRows(profile);
  const timeline = timelineSummary(timelineRows, profile);
  const targetRow = timelineRows.find(
    (row) => row.age === Math.round(numberValue(profile.targetRetirementAge)),
  );
  const projectedRetirementBalances = targetRow
    ? targetRow.startBalances
    : {
        brokerage: portfolio.brokerage,
        preTax: portfolio.preTax,
        roth: portfolio.roth,
        cash: portfolio.cash,
      };
  const projectedAssets = afterTaxAssetsFromBalances(
    profile,
    projectedRetirementBalances,
  );
  const requiredAssets = requiredRetirementAssets(
    profile,
    projectedRetirementBalances,
  );
  const fundingDelta = requiredAssets - projectedAssets;
  const expectedRetirementAge = findExpectedRetirementAge(profile);
  const savingsComponent = Math.min(1, Math.max(0, savingsRate / 0.2));
  const fundingComponent =
    requiredAssets > 0
      ? Math.min(1, Math.max(0, projectedAssets / requiredAssets))
      : 1;
  const timingComponent =
    expectedRetirementAge === null
      ? 0
      : expectedRetirementAge <= profile.targetRetirementAge
        ? 1
        : Math.max(
            0,
            1 -
              (expectedRetirementAge - profile.targetRetirementAge) /
                Math.max(
                  1,
                  profile.lifeExpectancy - profile.targetRetirementAge,
                ),
          );
  // A depletion year is already reflected in the horizon-based funding comparison;
  // retain a separate penalty so the score also communicates how early it occurs.
  const sustainabilityPenalty =
    timeline.depletionAge != null
      ? Math.min(
          20,
          ((profile.lifeExpectancy - timeline.depletionAge) /
            Math.max(1, profile.lifeExpectancy - profile.targetRetirementAge)) *
            20,
        )
      : 0;
  const score = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        fundingComponent * 60 +
          savingsComponent * 25 +
          timingComponent * 15 -
          sustainabilityPenalty,
      ),
    ),
  );
  const status =
    score >= 80
      ? "On Track"
      : score >= 50
        ? "Slightly Behind"
        : "Major Shortfall";

  return {
    financialAssets,
    totalAssets,
    totalIncome,
    afterTaxIncome: contributions.afterTaxIncome,
    surplus,
    savingsRate,
    employeeSavings: contributions.employeeSavings,
    employerFourOhOneKMatch: contributions.employerFourOhOneKMatch,
    totalRetirementContributions: contributions.totalRetirementContributions,
    yearsToTarget,
    projectedAssets,
    requiredAssets,
    fundingDelta,
    expectedRetirementAge,
    score,
    status,
    safeSpending: sustainableAnnualSpending(profile),
    currentFederalTax: contributions.currentFederalTax,
    currentStateTax: contributions.currentStateTax,
    projectedConversionTax: portfolio.conversionTax,
    projectedRmd: timeline.cumulativeRmd,
    projectedNiit: timeline.cumulativeNiit,
    projectedSocialSecurityTax: timeline.cumulativeSocialSecurityTax,
    projectedIrmaa: timeline.cumulativeIrmaa,
    afterTaxAssets: projectedAssets,
    timelineDepletionAge: timeline.depletionAge,
    timelineIrmaaAge: timeline.firstIrmaaAge,
  };
}

function projectAssets(profile, years) {
  return projectPortfolio(profile, years).afterTaxAssets;
}

function findExpectedRetirementAge(profile) {
  for (let age = profile.currentAge; age <= profile.lifeExpectancy; age += 1) {
    const portfolio = projectPortfolio(profile, age - profile.currentAge);
    const balances = {
      brokerage: portfolio.brokerage,
      preTax: portfolio.preTax,
      roth: portfolio.roth,
      cash: portfolio.cash,
    };
    const ageProfile = { ...profile, targetRetirementAge: age };
    const requiredAssets = requiredRetirementAssets(ageProfile, balances);
    if (afterTaxAssetsFromBalances(profile, balances) >= requiredAssets)
      return age;
  }
  return null;
}

function timelineOverrideFor(profile, age) {
  return (profile.timelineOverrides && profile.timelineOverrides[age]) || {};
}

function setTimelineOverride(age, field, rawValue) {
  const overrides = workingProfile.timelineOverrides;
  const existing = overrides[age] ? { ...overrides[age] } : {};
  if (rawValue === "" || rawValue === null || rawValue === undefined) {
    delete existing[field];
  } else {
    existing[field] = rawValue;
  }
  if (Object.keys(existing).length === 0) {
    delete overrides[age];
  } else {
    overrides[age] = existing;
  }
}

function clearTimelineOverride(age) {
  delete workingProfile.timelineOverrides[age];
}

function clearAllTimelineOverrides() {
  workingProfile.timelineOverrides = {};
}

// Builds one editable row per age from today through life expectancy: accumulation while
// working, then withdrawal-funded decumulation once the target retirement age is reached.
function buildTimelineRows(profile) {
  const rows = [];
  const startAge = Math.round(numberValue(profile.currentAge));
  const endAge = Math.round(numberValue(profile.lifeExpectancy));
  if (
    !Number.isFinite(startAge) ||
    !Number.isFinite(endAge) ||
    endAge < startAge
  ) {
    return rows;
  }

  let brokerage = profile.assets.brokerage;
  let preTax = profile.assets.fourOhOneK + profile.assets.traditionalIra;
  let roth = profile.assets.rothIra;
  let cash = profile.assets.cash;

  for (let age = startAge; age <= endAge; age += 1) {
    const override = timelineOverrideFor(profile, age);
    const isRetired = age >= profile.targetRetirementAge;
    const startBalances = { brokerage, preTax, roth, cash };
    const startTotal = brokerage + preTax + roth + cash;

    const defaultReturnPercent = profile.expectedAnnualReturn * 100;
    const returnPercent =
      override.returnPercent != null
        ? numberValue(override.returnPercent)
        : defaultReturnPercent;
    const nominalReturn = returnPercent / 100;
    const realReturn = Math.max(
      -0.99,
      (1 + nominalReturn) / (1 + profile.inflationRate) - 1,
    );

    const defaultIncome = isRetired
      ? null
      : profile.annualSalary + profile.otherAnnualIncome;
    const salaryForYear = isRetired
      ? 0
      : override.income != null
        ? numberValue(override.income)
        : profile.annualSalary;

    const defaultExpenses = isRetired
      ? profile.retirementAnnualSpendingGoal
      : profile.currentAnnualExpenses;
    const extraWithdrawal =
      override.extraWithdrawal != null
        ? Math.max(0, numberValue(override.extraWithdrawal))
        : 0;

    let contribution = 0;
    let withdrawal = 0;
    let rmd = 0;
    let niit = 0;
    let rowSocialSecurityTax = 0;
    let rowIrmaa = 0;
    let income = defaultIncome;

    if (!isRetired) {
      const contributions = calculateContributions(
        profile,
        salaryForYear,
        profile.otherAnnualIncome,
      );
      const growth = applyBrokerageGrowth(
        profile,
        brokerage,
        realReturn,
        contributions.taxableIncome,
      );
      brokerage = growth.balance;
      niit = growth.niit;
      preTax *= 1 + realReturn;
      roth *= 1 + realReturn;

      income = salaryForYear + profile.otherAnnualIncome;
      cash += contributions.cash;
      brokerage += contributions.brokerage;
      preTax +=
        contributions.employeeFourOhOneK +
        contributions.employerFourOhOneKMatch +
        contributions.traditionalIra;
      roth += contributions.rothIra;
      contribution =
        contributions.employeeSavings + contributions.employerFourOhOneKMatch;

      const conversion = Math.min(
        preTax,
        Math.max(0, profile.rothConversionAnnualAmount),
      );
      if (conversion > 0) {
        const baseTax = ordinaryIncomeTax(profile, contributions.taxableIncome);
        const taxOnConversion = Math.max(
          0,
          ordinaryIncomeTax(profile, contributions.taxableIncome + conversion) -
            baseTax,
        );
        preTax -= conversion;
        roth += conversion;
        brokerage = Math.max(0, brokerage - taxOnConversion);
      }
    } else {
      const taxableSocialSecurity =
        profile.socialSecurityAnnualBenefit *
        profile.socialSecurityTaxablePercent;
      const socialSecurityTax = Math.max(
        0,
        ordinaryIncomeTax(profile, taxableSocialSecurity) -
          ordinaryIncomeTax(profile, 0),
      );
      const netSocialSecurity = Math.max(
        0,
        profile.socialSecurityAnnualBenefit - socialSecurityTax,
      );
      rowSocialSecurityTax = socialSecurityTax;
      income = netSocialSecurity;

      // RMD is based on the prior year-end pre-tax balance, before this year's growth.
      rmd = requiredMinimumDistribution(profile, preTax, age);
      const irmaa =
        taxableSocialSecurity + rmd > profile.irmaaIncomeThreshold
          ? profile.irmaaAnnualSurcharge
          : 0;

      const growth = applyBrokerageGrowth(
        profile,
        brokerage,
        realReturn,
        taxableSocialSecurity + rmd,
      );
      brokerage = growth.balance;
      niit = growth.niit;
      preTax *= 1 + realReturn;
      roth *= 1 + realReturn;

      const spendingGoal =
        override.expenses != null
          ? numberValue(override.expenses)
          : profile.retirementAnnualSpendingGoal;
      let remaining = Math.max(
        0,
        spendingGoal + extraWithdrawal + irmaa - netSocialSecurity - rmd,
      );

      const fromCash = Math.min(cash, remaining);
      cash -= fromCash;
      remaining -= fromCash;

      const fromBrokerage = Math.min(brokerage, remaining);
      brokerage -= fromBrokerage;
      remaining -= fromBrokerage;

      let fromPreTaxGross = 0;
      if (remaining > 0 && profile.preTaxWithdrawalTaxRate < 1) {
        const grossNeeded = remaining / (1 - profile.preTaxWithdrawalTaxRate);
        fromPreTaxGross = Math.min(preTax, grossNeeded);
        preTax -= fromPreTaxGross;
        remaining -= fromPreTaxGross * (1 - profile.preTaxWithdrawalTaxRate);
      }

      const fromRoth = Math.min(roth, Math.max(0, remaining));
      roth -= fromRoth;

      preTax = Math.max(0, preTax - rmd);
      withdrawal = fromCash + fromBrokerage + fromPreTaxGross + fromRoth + rmd;
      rowIrmaa = irmaa;

      // Sequence-of-returns guard: refill the cash reserve from brokerage only in up years.
      const targetCashBuffer =
        Math.max(0, numberValue(profile.cashReserveTargetYears)) * spendingGoal;
      if (realReturn > 0 && cash < targetCashBuffer && brokerage > 0) {
        const sweep = Math.min(brokerage, targetCashBuffer - cash);
        brokerage -= sweep;
        cash += sweep;
      }
    }

    brokerage = Math.max(0, brokerage);
    preTax = Math.max(0, preTax);
    roth = Math.max(0, roth);
    cash = Math.max(0, cash);
    const endTotal = brokerage + preTax + roth + cash;

    rows.push({
      age,
      isRetired,
      returnPercent,
      defaultReturnPercent,
      income,
      defaultIncome,
      expenses: isRetired
        ? override.expenses != null
          ? numberValue(override.expenses)
          : defaultExpenses
        : defaultExpenses,
      defaultExpenses,
      contribution,
      withdrawal,
      rmd,
      niit,
      socialSecurityTax: rowSocialSecurityTax,
      irmaa: rowIrmaa,
      startTotal,
      startBalances,
      endTotal,
      overrides: override,
      hasOverride: Object.keys(override).length > 0,
    });
  }

  return rows;
}

function timelineSummary(rows, profile) {
  if (!rows.length) {
    return {
      finalAssets: 0,
      depletionAge: null,
      overriddenYears: 0,
      firstIrmaaAge: null,
      cumulativeRmd: 0,
      cumulativeNiit: 0,
      cumulativeSocialSecurityTax: 0,
      cumulativeIrmaa: 0,
    };
  }
  const finalAssets = rows[rows.length - 1].endTotal;
  const depletionRow = rows.find((row) => row.isRetired && row.endTotal <= 0);
  const irmaaRow = rows.find((row) => row.isRetired && row.irmaa > 0);
  return {
    finalAssets,
    depletionAge: depletionRow ? depletionRow.age : null,
    overriddenYears: rows.filter((row) => row.hasOverride).length,
    firstIrmaaAge: irmaaRow ? irmaaRow.age : null,
    cumulativeRmd: rows.reduce((total, row) => total + row.rmd, 0),
    cumulativeNiit: rows.reduce((total, row) => total + row.niit, 0),
    cumulativeSocialSecurityTax: rows.reduce(
      (total, row) => total + row.socialSecurityTax,
      0,
    ),
    cumulativeIrmaa: rows.reduce((total, row) => total + row.irmaa, 0),
  };
}

function afterTaxAssetsFromBalances(profile, balances) {
  return (
    balances.brokerage +
    balances.roth +
    balances.cash +
    balances.preTax * (1 - profile.preTaxWithdrawalTaxRate)
  );
}

function requiredRetirementAssets(profile, startingBalances) {
  const balanceTotal =
    startingBalances.brokerage +
    startingBalances.preTax +
    startingBalances.roth +
    startingBalances.cash;
  const allocation =
    balanceTotal > 0
      ? startingBalances
      : { brokerage: 0, preTax: 0, roth: 0, cash: 1 };
  const targetAge = Math.round(numberValue(profile.targetRetirementAge));
  const retirementProfile = (scale) => ({
    ...profile,
    currentAge: targetAge,
    assets: {
      brokerage: allocation.brokerage * scale,
      fourOhOneK: allocation.preTax * scale,
      traditionalIra: 0,
      rothIra: allocation.roth * scale,
      cash: allocation.cash * scale,
      realEstate: 0,
    },
  });
  const isSustainable = (scale) =>
    timelineSummary(
      buildTimelineRows(retirementProfile(scale)),
      retirementProfile(scale),
    ).depletionAge == null;

  let high = 1;
  while (!isSustainable(high) && high < 1048576) high *= 2;
  if (!isSustainable(high)) return Infinity;

  let low = 0;
  for (let iteration = 0; iteration < 40; iteration += 1) {
    const middle = (low + high) / 2;
    if (isSustainable(middle)) high = middle;
    else low = middle;
  }
  return afterTaxAssetsFromBalances(profile, {
    brokerage: allocation.brokerage * high,
    preTax: allocation.preTax * high,
    roth: allocation.roth * high,
    cash: allocation.cash * high,
  });
}

function sustainableAnnualSpending(profile) {
  const isSustainable = (spendingGoal) => {
    const spendingProfile = {
      ...profile,
      retirementAnnualSpendingGoal: spendingGoal,
    };
    const rows = buildTimelineRows(spendingProfile);
    return timelineSummary(rows, spendingProfile).depletionAge == null;
  };

  if (!isSustainable(0)) return 0;

  let high = Math.max(1000, numberValue(profile.retirementAnnualSpendingGoal));
  while (isSustainable(high) && high < 1048576) high *= 2;
  if (isSustainable(high)) return high;

  let low = 0;
  for (let iteration = 0; iteration < 40; iteration += 1) {
    const middle = (low + high) / 2;
    if (isSustainable(middle)) low = middle;
    else high = middle;
  }
  return low;
}

function inputConfig() {
  return {
    profile: [
      ["name", "Name", "text", "", "Alex Morgan"],
      ["currentAge", "Current age", "number", "years", 45],
      ["targetRetirementAge", "Target retirement age", "number", "years", 65],
      ["lifeExpectancy", "Life expectancy", "number", "years", 90],
      ["state", "State", "text", "", "Colorado"],
      [
        "filingStatus",
        "Tax filing status",
        "select",
        "",
        "Married filing jointly",
        ["Single", "Married filing jointly", "Head of household"],
      ],
    ],
    assumptions: [
      [
        "expectedAnnualReturn",
        "Expected annual return (nominal)",
        "percent",
        "%",
        5,
      ],
      ["inflationRate", "Inflation rate", "percent", "%", 2.5],
      ["safeWithdrawalRate", "Safe withdrawal rate", "percent", "%", 4],
      [
        "projectionBasis",
        "Projection basis",
        "select",
        "",
        "real_dollars",
        [["real_dollars", "Real dollars"]],
      ],
    ],
    tax: [
      [
        "federalStandardDeduction",
        "Federal standard deduction",
        "currency",
        "per year",
        30000,
      ],
      ["stateIncomeTaxRate", "State income tax rate", "percent", "%", 4.4],
      ["taxableGainsTaxRate", "Taxable gains tax rate", "percent", "%", 15],
      [
        "preTaxWithdrawalTaxRate",
        "Pre-tax withdrawal tax rate",
        "percent",
        "%",
        22,
      ],
      [
        "rothConversionAnnualAmount",
        "Annual Roth conversion",
        "currency",
        "per year",
        0,
      ],
      [
        "socialSecurityAnnualBenefit",
        "Annual Social Security benefit",
        "currency",
        "per year",
        0,
      ],
      [
        "socialSecurityTaxablePercent",
        "Social Security taxable percentage",
        "percent",
        "%",
        85,
      ],
      ["rmdStartAge", "RMD start age", "number", "years", 73],
      [
        "niitThreshold",
        "Net investment income tax (NIIT) MAGI threshold",
        "currency",
        "per year",
        250000,
      ],
      [
        "cashReserveTargetYears",
        "Retirement cash reserve target",
        "number",
        "years of spending",
        1,
      ],
      [
        "irmaaIncomeThreshold",
        "IRMAA income threshold",
        "currency",
        "per year",
        200000,
      ],
      [
        "irmaaAnnualSurcharge",
        "Annual IRMAA surcharge",
        "currency",
        "per year",
        0,
      ],
    ],
    income: [
      ["annualSalary", "Annual salary", "currency", "per year", 150000],
      ["otherAnnualIncome", "Other annual income", "currency", "per year", 0],
    ],
    expenses: [
      [
        "currentAnnualExpenses",
        "Current annual expenses",
        "currency",
        "per year",
        85000,
      ],
      [
        "retirementAnnualSpendingGoal",
        "Retirement spending goal",
        "currency",
        "per year",
        75000,
      ],
    ],
    contributions: [
      [
        "contributionRates.fourOhOneK",
        "Employee 401(k) contribution",
        "percent",
        "% of salary",
        10,
      ],
      [
        "contributionRates.traditionalIra",
        "Traditional IRA contribution",
        "percent",
        "% of gross earned income",
        2,
      ],
      [
        "contributionRates.rothIra",
        "Roth IRA contribution",
        "percent",
        "% of income after simplified taxes and employee pre-tax contributions",
        6,
      ],
      [
        "contributionRates.brokerage",
        "Brokerage contribution",
        "percent",
        "% of income after simplified taxes and employee pre-tax contributions",
        6,
      ],
      [
        "contributionRates.cash",
        "Cash contribution",
        "percent",
        "% of income after simplified taxes and employee pre-tax contributions",
        2,
      ],
      [
        "employerMatch.rate",
        "Employer match rate",
        "percent",
        "% of employee 401(k) contribution",
        50,
      ],
      [
        "employerMatch.salaryCap",
        "Employer match cap",
        "percent",
        "% of salary",
        3,
      ],
    ],
  };
}

function createField(config) {
  const [key, label, type, unit, fallback, options] = config;
  const value = key
    .split(".")
    .reduce((currentValue, path) => currentValue?.[path], workingProfile);
  const fieldId = `field-${key}`;
  const wrapper = document.createElement("div");
  wrapper.className = "field";
  const labelEl = document.createElement("label");
  labelEl.htmlFor = fieldId;
  labelEl.textContent = label;
  const control =
    type === "select"
      ? document.createElement("select")
      : document.createElement("input");
  control.id = fieldId;
  control.dataset.field = key;
  control.dataset.type = type;
  if (type === "select") {
    const normalizedOptions = options.map((option) =>
      Array.isArray(option) ? option : [option, option],
    );
    normalizedOptions.forEach(([optionValue, optionLabel]) => {
      const optionEl = document.createElement("option");
      optionEl.value = optionValue;
      optionEl.textContent = optionLabel;
      control.append(optionEl);
    });
  } else {
    control.type = type === "percent" ? "number" : type;
    if (type === "currency" || type === "number" || type === "percent") {
      control.min = type === "percent" ? "0" : "0";
      if (type === "percent") control.max = "100";
      control.step =
        type === "percent" ? "0.1" : type === "currency" ? "100" : "1";
      control.inputMode = "decimal";
    }
  }
  control.value =
    type === "percent" ? numberValue(value) * 100 : (value ?? fallback);
  const unitEl = document.createElement("small");
  unitEl.textContent = unit || "Edit to recalculate";
  wrapper.append(labelEl, control, unitEl);
  return wrapper;
}

function renderFormFields() {
  const config = inputConfig();
  [
    ["#profile-fields", config.profile],
    ["#assumption-fields", config.assumptions],
    ["#tax-fields", config.tax],
    ["#income-fields", config.income],
    ["#expense-fields", config.expenses],
    ["#contribution-fields", config.contributions],
  ].forEach(([selector, fields]) => {
    const container = $(selector);
    container.replaceChildren(...fields.map(createField));
  });
}

function renderAssetFields() {
  const container = $("#asset-fields");
  const rows = Object.keys(ASSET_METADATA)
    .filter((key) => key !== "realEstate")
    .map((key) => {
      const metadata = ASSET_METADATA[key];
      const row = document.createElement("div");
      row.className = "asset-row";
      row.innerHTML = `<div class="asset-label"><span>${metadata.label}</span><small>${metadata.interpretation}</small></div><span class="tax-tag">${metadata.treatment}</span><input data-field="assets.${key}" data-type="currency" type="number" min="0" step="1000" value="${workingProfile.assets[key]}" aria-label="${metadata.label} balance" />`;
      return row;
    });
  container.replaceChildren(...rows);
  $("#realEstate").value = workingProfile.assets.realEstate;
  $("#realEstate").dataset.type = "currency";
}

function renderSocialSecuritySchedule() {
  const body = $("#ss-claiming-table-body");
  if (!body) return;
  const schedule = socialSecurityClaimingSchedule(workingProfile);
  body.innerHTML = schedule
    .map(
      (row) =>
        `<tr class="${row.claimAge === SOCIAL_SECURITY_FULL_RETIREMENT_AGE ? "ss-fra-row" : ""}"><td>${row.claimAge}</td><td>${money(row.annualBenefit)}</td><td>${money(row.annualBenefit / 12)}</td></tr>`,
    )
    .join("");
}

function recommendations(metrics, profile) {
  const items = [];
  if (metrics.timelineDepletionAge != null)
    items.push({
      priority: "HIGH PRIORITY",
      className: "",
      title: "Address a projected shortfall year",
      trigger: `The year-by-year timeline projects assets reaching $0 at age ${metrics.timelineDepletionAge}, before life expectancy.`,
      metric: `Depletes at age ${metrics.timelineDepletionAge}`,
      action:
        "Open the Timeline page to see which years drive the shortfall and adjust spending, returns, or retirement age.",
      effect:
        "Calculated from the year-by-year timeline, including any per-year overrides.",
    });
  if (metrics.savingsRate < 0.2)
    items.push({
      priority: "HIGH PRIORITY",
      className: "",
      title: "Increase annual savings",
      trigger: "Savings rate is below the 20% target threshold.",
      metric: `${percent(metrics.savingsRate)} savings rate`,
      action: "Consider increasing the annual savings input.",
      effect: "Qualitative; may reduce the projected funding gap.",
    });
  if (metrics.fundingDelta > 0)
    items.push({
      priority: "MEDIUM PRIORITY",
      className: "medium",
      title: "Review retirement timing",
      trigger: "Projected assets do not fully cover the retirement target.",
      metric: `${money(metrics.fundingDelta)} funding gap`,
      action: "Compare a later retirement age or a higher savings amount.",
      effect: "Qualitative; scenario effects update when inputs change.",
    });
  if (profile.retirementAnnualSpendingGoal > metrics.safeSpending)
    items.push({
      priority: "MEDIUM PRIORITY",
      className: "medium",
      title: "Review retirement spending goal",
      trigger: "The spending goal is above the current safe-spending estimate.",
      metric: `${money(profile.retirementAnnualSpendingGoal)} annual goal`,
      action: "Compare a lower spending scenario.",
      effect: "Qualitative; may improve readiness.",
    });
  const taxDeferred = profile.assets.fourOhOneK + profile.assets.traditionalIra;
  if (taxDeferred > metrics.financialAssets * 0.5)
    items.push({
      priority: "INFORMATIONAL",
      className: "info",
      title: "Review tax diversification",
      trigger: "Most investable assets are tax-deferred.",
      metric: `${percent(taxDeferred / metrics.financialAssets)} tax-deferred share`,
      action: "Learn about future account withdrawal sequencing.",
      effect: "Not modeled in prototype.",
    });
  if (metrics.timelineIrmaaAge != null)
    items.push({
      priority: "INFORMATIONAL",
      className: "info",
      title: "Watch for an IRMAA surcharge year",
      trigger: `The timeline projects Medicare income-related surcharges starting at age ${metrics.timelineIrmaaAge}.`,
      metric: `First IRMAA year: age ${metrics.timelineIrmaaAge}`,
      action:
        "Review projected RMD and Social Security timing on the Timeline page.",
      effect:
        "Calculated from the year-by-year timeline; the surcharge amount itself is a fixed illustrative input.",
    });
  return items.slice(0, 3);
}

function renderRecommendations(metrics) {
  const items = recommendations(metrics, workingProfile);
  $("#recommendation-count").textContent =
    `${items.length} action${items.length === 1 ? "" : "s"}`;
  const list = $("#recommendation-list");
  if (!items.length) {
    list.innerHTML =
      '<div class="panel" style="padding:24px"><strong>Your current inputs do not trigger a recommendation.</strong><p class="notice-panel">Continue reviewing your assumptions as your plan changes.</p></div>';
    return;
  }
  list.innerHTML = items
    .map(
      (item, index) =>
        `<article class="recommendation-card"><div class="recommendation-number">${String(index + 1).padStart(2, "0")}</div><div><h3>${item.title}</h3><p><strong>Trigger:</strong> ${item.trigger}</p><p><strong>Current metric:</strong> ${item.metric}</p><p><strong>Suggested action:</strong> ${item.action}</p><p><strong>Effect:</strong> ${item.effect}</p></div><span class="priority ${item.className}">${item.priority}</span></article>`,
    )
    .join("");
}

function renderTimelineSummary(rows) {
  const summary = timelineSummary(rows, workingProfile);
  $("#timeline-final-assets").textContent = money(summary.finalAssets);
  $("#timeline-depletion-age").textContent = summary.depletionAge
    ? `Age ${summary.depletionAge}`
    : "Not projected to deplete";
  $("#timeline-overridden-count").textContent = String(summary.overriddenYears);
}

function renderTimelineChart(rows) {
  const container = $("#timeline-chart");
  if (!rows.length) {
    container.innerHTML =
      '<p class="notice-panel">Enter a valid current age and life expectancy to see the timeline chart.</p>';
    return;
  }
  const width = 800;
  const height = 240;
  const padding = 28;
  const maxValue = Math.max(1, ...rows.map((row) => row.endTotal));
  const xStep = (width - padding * 2) / Math.max(1, rows.length - 1);
  const points = rows
    .map((row, index) => {
      const x = padding + index * xStep;
      const y =
        height - padding - (row.endTotal / maxValue) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const retirementIndex = rows.findIndex((row) => row.isRetired);
  const retirementX =
    retirementIndex >= 0 ? padding + retirementIndex * xStep : null;
  const retirementMarker =
    retirementX != null
      ? `<line x1="${retirementX.toFixed(1)}" y1="${padding}" x2="${retirementX.toFixed(1)}" y2="${height - padding}" stroke="var(--coral)" stroke-dasharray="4 4" />`
      : "";
  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Projected financial assets by age" class="timeline-svg">
    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="var(--line)" />
    ${retirementMarker}
    <polyline points="${points}" fill="none" stroke="var(--blue)" stroke-width="2.5" />
    <text x="${padding}" y="${padding - 10}" class="chart-label">${money(maxValue)}</text>
    <text x="${padding}" y="${height - padding + 18}" class="chart-label">Age ${rows[0].age}</text>
    <text x="${width - padding}" y="${height - padding + 18}" class="chart-label" text-anchor="end">Age ${rows[rows.length - 1].age}</text>
  </svg>`;
}

function timelineInputCell(age, field, value, defaultValue, disabled, type) {
  const displayDefault =
    type === "percent"
      ? Number(defaultValue ?? 0).toFixed(1)
      : Math.round(numberValue(defaultValue));
  const rawValue = value != null ? value : "";
  return `<input type="number" step="${type === "percent" ? "0.1" : "100"}" inputmode="decimal" data-timeline-age="${age}" data-timeline-field="${field}" placeholder="${displayDefault}" value="${rawValue}" ${disabled ? "disabled" : ""} aria-label="${field} override for age ${age}" />`;
}

function timelineRowMarkup(row) {
  const override = row.overrides;
  return `<tr data-timeline-row="${row.age}" class="${row.hasOverride ? "has-override" : ""}">
    <td>${row.age}<span class="timeline-status">${row.isRetired ? "Retired" : "Working"}</span></td>
    <td>${timelineInputCell(row.age, "returnPercent", override.returnPercent, row.defaultReturnPercent, false, "percent")}</td>
    <td>${timelineInputCell(row.age, "income", override.income, row.isRetired ? row.income : row.defaultIncome, row.isRetired, "currency")}</td>
    <td>${timelineInputCell(row.age, "expenses", override.expenses, row.defaultExpenses, !row.isRetired, "currency")}</td>
    <td>${timelineInputCell(row.age, "extraWithdrawal", override.extraWithdrawal, 0, !row.isRetired, "currency")}</td>
    <td data-col="contribution">${row.isRetired ? "—" : money(row.contribution)}</td>
    <td data-col="withdrawal">${row.isRetired ? money(row.withdrawal) : "—"}</td>
    <td data-col="rmd">${row.rmd > 0 ? money(row.rmd) : "—"}</td>
    <td data-col="endTotal" class="timeline-total">${money(row.endTotal)}</td>
    <td><button type="button" class="button button-quiet timeline-clear" data-timeline-clear="${row.age}" ${row.hasOverride ? "" : "disabled"}>Clear</button></td>
  </tr>`;
}

function renderTimelineTable(rows) {
  const body = $("#timeline-table-body");
  if (!rows.length) {
    body.innerHTML =
      '<tr><td colspan="10">Enter a valid current age and life expectancy to build a timeline.</td></tr>';
    return;
  }
  body.innerHTML = rows.map(timelineRowMarkup).join("");
}

function updateTimelineComputedCells(rows) {
  rows.forEach((row) => {
    const tr = document.querySelector(`[data-timeline-row="${row.age}"]`);
    if (!tr) return;
    tr.classList.toggle("has-override", row.hasOverride);
    tr.querySelector('[data-col="contribution"]').textContent = row.isRetired
      ? "—"
      : money(row.contribution);
    tr.querySelector('[data-col="withdrawal"]').textContent = row.isRetired
      ? money(row.withdrawal)
      : "—";
    tr.querySelector('[data-col="rmd"]').textContent =
      row.rmd > 0 ? money(row.rmd) : "—";
    tr.querySelector('[data-col="endTotal"]').textContent = money(row.endTotal);
    const clearButton = tr.querySelector(".timeline-clear");
    if (clearButton) clearButton.disabled = !row.hasOverride;
  });
}

function renderTimeline() {
  const rows = buildTimelineRows(workingProfile);
  renderTimelineTable(rows);
  renderTimelineChart(rows);
  renderTimelineSummary(rows);
  return rows;
}

function handleTimelineTableInput(event) {
  const clearAge = event.target.dataset.timelineClear;
  if (clearAge !== undefined) {
    clearTimelineOverride(Number(clearAge));
    renderMetrics();
    return;
  }
  const age = event.target.dataset.timelineAge;
  const field = event.target.dataset.timelineField;
  if (age === undefined || !field) return;
  setTimelineOverride(Number(age), field, event.target.value);
  const rows = buildTimelineRows(workingProfile);
  updateTimelineComputedCells(rows);
  renderTimelineChart(rows);
  renderTimelineSummary(rows);
}

function renderMetrics() {
  const metrics = calculate(workingProfile);
  setText("#sidebar-name", workingProfile.name || "Unnamed plan");
  setText(
    "#sidebar-timeline",
    `Age ${workingProfile.currentAge} → Retire ${workingProfile.targetRetirementAge}`,
  );
  setText("#score-value", metrics.score);
  setWidth("#score-bar", `${metrics.score}%`);
  setText("#score-status", metrics.status);
  setText("#readiness-status", metrics.status);
  const readinessStatus = $("#readiness-status");
  if (readinessStatus) {
    readinessStatus.className = `status-pill ${metrics.status === "On Track" ? "" : "neutral"}`;
  }
  setText("#target-age", workingProfile.targetRetirementAge);
  setText(
    "#expected-age",
    metrics.expectedRetirementAge ?? "Beyond life expectancy",
  );
  setText("#years-to-target", metrics.yearsToTarget);
  setText("#projected-assets", money(metrics.projectedAssets));
  setText(
    "#required-assets",
    Number.isFinite(metrics.requiredAssets)
      ? money(metrics.requiredAssets)
      : "Unavailable",
  );
  setText(
    "#funding-label",
    metrics.fundingDelta > 0 ? "Funding gap" : "Projected surplus",
  );
  setText("#funding-gap", money(Math.abs(metrics.fundingDelta)));
  setText("#safe-spending", money(metrics.safeSpending));
  setText("#spending-goal", money(workingProfile.retirementAnnualSpendingGoal));
  setText("#financial-assets-total", money(metrics.financialAssets));
  setText("#financial-assets-total-bottom", money(metrics.financialAssets));
  setText("#total-assets", money(metrics.totalAssets));
  setText("#total-income", money(metrics.totalIncome));
  setText("#annual-surplus", money(metrics.surplus));
  setText("#savings-rate", percent(metrics.savingsRate));
  setText("#employee-savings", money(metrics.employeeSavings));
  setText("#employer-match", money(metrics.employerFourOhOneKMatch));
  setText(
    "#retirement-contributions",
    money(metrics.totalRetirementContributions),
  );
  setText("#current-federal-tax", money(metrics.currentFederalTax));
  setText("#current-state-tax", money(metrics.currentStateTax));
  setText("#after-tax-assets", money(metrics.afterTaxAssets));
  setText("#projected-rmd", money(metrics.projectedRmd));
  setText("#projected-niit", money(metrics.projectedNiit));
  setText("#projected-ss-tax", money(metrics.projectedSocialSecurityTax));
  setText("#projected-irmaa", money(metrics.projectedIrmaa));
  setText(
    "#readiness-updated",
    `Updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
  );
  renderRecommendations(metrics);
  renderSocialSecuritySchedule();
  renderTimeline();
  return metrics;
}

function updateWorkingValue(field, rawValue, type) {
  const path = field.split(".");
  const value =
    type === "percent"
      ? numberValue(rawValue) / 100
      : type === "number" || type === "currency"
        ? numberValue(rawValue)
        : rawValue;
  if (path.length === 2) workingProfile[path[0]][path[1]] = value;
  else workingProfile[path[0]] = value;
}

function handleInput(event) {
  const field = event.target.dataset.field;
  if (!field) return;
  updateWorkingValue(field, event.target.value, event.target.dataset.type);
  renderMetrics();
}

function showPage(page) {
  currentPage = pageTitles[page] ? page : "readiness";
  $$(".page-view").forEach((view) => {
    view.hidden = view.dataset.view !== currentPage;
  });
  $$(".nav-item").forEach((item) =>
    item.classList.toggle("active", item.dataset.page === currentPage),
  );
  const [breadcrumb, title] = pageTitles[currentPage];
  $("#breadcrumb").textContent = breadcrumb;
  $("#page-title").textContent = title;
  closeMenu();
}

function closeMenu() {
  $("#sidebar").classList.remove("open");
  $("#scrim").hidden = true;
}

function closeScoreHelp() {
  const button = $("#score-help-button");
  const help = $("#score-help");
  if (!button || !help) return;
  help.hidden = true;
  button.setAttribute("aria-expanded", "false");
}

function closeMetricHelps() {
  document.querySelectorAll(".metric-help").forEach((help) => {
    help.hidden = true;
    const button = document.getElementById(help.dataset.helpButtonId);
    if (button) button.setAttribute("aria-expanded", "false");
  });
}

function toggleScoreHelp() {
  const button = $("#score-help-button");
  const help = $("#score-help");
  if (!button || !help) return;
  const isOpen = !help.hidden;
  help.hidden = isOpen;
  button.setAttribute("aria-expanded", String(!isOpen));
}

function toggleMetricHelp(button) {
  if (!button) return;
  const targetId = button.dataset.helpTarget;
  const help = targetId ? document.getElementById(targetId) : null;
  if (!help) return;
  const isOpen = !help.hidden;
  closeMetricHelps();
  help.hidden = isOpen;
  button.setAttribute("aria-expanded", String(!isOpen));
}

function resetSample() {
  workingProfile = cloneSampleProfile();
  renderFormFields();
  renderAssetFields();
  bindFieldListeners();
  renderMetrics();
}

function bindFieldListeners() {
  $$("[data-field]").forEach((input) => {
    input.removeEventListener("input", handleInput);
    input.addEventListener("input", handleInput);
  });
}

function init() {
  renderFormFields();
  renderAssetFields();
  renderMetrics();
  bindFieldListeners();
  $$(".nav-item").forEach((item) =>
    item.addEventListener("click", () => showPage(item.dataset.page)),
  );
  $("#reset-button").addEventListener("click", resetSample);
  $("#timeline-reset-button").addEventListener("click", () => {
    clearAllTimelineOverrides();
    renderMetrics();
  });
  $("#timeline-table-body").addEventListener("input", handleTimelineTableInput);
  $("#timeline-table-body").addEventListener("click", handleTimelineTableInput);
  $("#open-menu").addEventListener("click", () => {
    $("#sidebar").classList.add("open");
    $("#scrim").hidden = false;
  });
  $("#close-menu").addEventListener("click", closeMenu);
  $("#scrim").addEventListener("click", closeMenu);
  $("#score-help-button").addEventListener("click", (event) => {
    event.stopPropagation();
    closeMetricHelps();
    toggleScoreHelp();
  });
  $("#score-help").addEventListener("click", (event) =>
    event.stopPropagation(),
  );
  document.querySelectorAll(".metric-help-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      closeScoreHelp();
      toggleMetricHelp(button);
    });
  });
  document.querySelectorAll(".metric-help").forEach((help) => {
    help.addEventListener("click", (event) => event.stopPropagation());
  });
  document.addEventListener("click", () => {
    closeScoreHelp();
    closeMetricHelps();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      closeScoreHelp();
      closeMetricHelps();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
