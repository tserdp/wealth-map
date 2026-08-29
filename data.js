const SAMPLE_PROFILE = Object.freeze({
  name: "Alex Morgan",
  currentAge: 45,
  targetRetirementAge: 65,
  lifeExpectancy: 90,
  state: "Colorado",
  filingStatus: "Married filing jointly",
  annualSalary: 150000,
  otherAnnualIncome: 0,
  contributionRates: Object.freeze({
    fourOhOneK: 0.1,
    brokerage: 0.06,
    cash: 0.02,
  }),
  // Fixed annual dollar IRA contributions (replaces legacy percentage-based contributionRates
  // traditionalIra/rothIra fields; legacy profiles are migrated automatically at calculation time).
  iraContributions: Object.freeze({
    traditionalIraAnnual: 3000,
    rothIraAnnual: 6000,
  }),
  employerMatch: Object.freeze({
    rate: 0.5,
    salaryCap: 0.03,
  }),
  currentAnnualExpenses: 85000,
  retirementAnnualSpendingGoal: 75000,
  expectedAnnualReturn: 0.05,
  inflationRate: 0.025,
  projectionBasis: "real_dollars",
  safeWithdrawalRate: 0.04,
  federalStandardDeduction: 30000,
  stateIncomeTaxRate: 0.044,
  taxableGainsTaxRate: 0.15,
  preTaxWithdrawalTaxRate: 0.22,
  // "auto" lets the model generate a recommended strategy; "manual" uses the fields below.
  rothConversionStrategy: "auto",
  rothConversionAnnualAmount: 0,
  // "manual" uses the Plan Setup Social Security Claim Age field directly; "auto" (selectable on
  // the Timeline page) instead searches for a model-recommended claiming age.
  socialSecurityStrategy: "manual",
  socialSecurityAnnualBenefit: 0,
  // Full Retirement Age (67) is the default claim age; supported range is 62-70.
  socialSecurityClaimAge: 67,
  socialSecurityTaxablePercent: 0.85,
  rmdStartAge: 73,
  irmaaIncomeThreshold: 200000,
  irmaaAnnualSurcharge: 0,
  // Simplified NIIT MAGI threshold; the 3.8% rate itself is a fixed illustrative constant.
  niitThreshold: 250000,
  // Years of retirement spending held as a buffer to avoid selling brokerage after a down year.
  cashReserveTargetYears: 1,
  assets: Object.freeze({
    brokerage: 180000,
    fourOhOneK: 420000,
    traditionalIra: 90000,
    rothIra: 80000,
    cash: 50000,
    realEstate: 350000,
  }),
  // Per-age user adjustments layered on top of the modeled timeline; empty by default.
  timelineOverrides: Object.freeze({}),
});

const ASSET_METADATA = Object.freeze({
  brokerage: {
    label: "Taxable brokerage",
    treatment: "Taxable",
    interpretation: "Flexible withdrawals; gains may be taxable",
  },
  fourOhOneK: {
    label: "401(k)",
    treatment: "Tax-deferred",
    interpretation: "Future withdrawals may be taxable",
  },
  traditionalIra: {
    label: "Traditional IRA",
    treatment: "Tax-deferred",
    interpretation: "Future withdrawals may be taxable",
  },
  rothIra: {
    label: "Roth IRA",
    treatment: "Tax-free qualified",
    interpretation: "Tax-free retirement flexibility",
  },
  cash: {
    label: "Cash",
    treatment: "Liquid",
    interpretation: "Short-term spending reserve",
  },
  realEstate: {
    label: "Real estate",
    treatment: "Separate asset",
    interpretation: "Not automatically spendable portfolio assets",
  },
});

function cloneSampleProfile() {
  return {
    ...SAMPLE_PROFILE,
    assets: { ...SAMPLE_PROFILE.assets },
    contributionRates: { ...SAMPLE_PROFILE.contributionRates },
    iraContributions: { ...SAMPLE_PROFILE.iraContributions },
    employerMatch: { ...SAMPLE_PROFILE.employerMatch },
    timelineOverrides: {},
  };
}
