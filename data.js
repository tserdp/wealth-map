const SAMPLE_PROFILE = Object.freeze({
  name: "Alex Morgan",
  currentAge: 45,
  targetRetirementAge: 65,
  lifeExpectancy: 90,
  state: "Colorado",
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
  stateIncomeTaxRate: 0.044,
  taxableGainsTaxRate: 0.15,
  preTaxWithdrawalTaxRate: 0.22,
  rothConversionAnnualAmount: 0,
  socialSecurityAnnualBenefit: 0,
  socialSecurityTaxablePercent: 0.85,
  rmdStartAge: 73,
  rmdRate: 0.04,
  irmaaIncomeThreshold: 200000,
  irmaaAnnualSurcharge: 0,
  assets: Object.freeze({
    brokerage: 180000,
    fourOhOneK: 420000,
    traditionalIra: 90000,
    rothIra: 80000,
    cash: 50000,
    realEstate: 350000,
  }),
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
  };
}
