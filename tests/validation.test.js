const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validatePlanSetup,
  lastValidProjectionState,
  isFieldBlockingError,
} = require("../validation.js");

function profile(overrides = {}) {
  return {
    name: "Alex Morgan",
    currentAge: 45,
    targetRetirementAge: 65,
    lifeExpectancy: 90,
    state: "Colorado",
    filingStatus: "Married filing jointly",
    annualSalary: 150000,
    otherAnnualIncome: 0,
    contributionRates: {
      fourOhOneK: 0.1,
    },
    iraContributions: {
      traditionalIraAnnual: 3000,
      rothIraAnnual: 6000,
    },
    savingsAllocation: {
      brokerage: 0.75,
      cash: 0.25,
    },
    employerMatch: { rate: 0.5, salaryCap: 0.03 },
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
    timelineOverrides: {},
    ...overrides,
  };
}

test("accepts valid boundary ages", () => {
  const result = validatePlanSetup(
    profile({ currentAge: 0, targetRetirementAge: 0, lifeExpectancy: 1 }),
  );
  assert.equal(result.blockingErrors.length, 0);
  assert.equal(result.warnings.length, 0);
});

test("flags target retirement age earlier than current age", () => {
  const result = validatePlanSetup(
    profile({ currentAge: 50, targetRetirementAge: 40 }),
  );
  const error = result.blockingErrors.find(
    (item) => item.field === "targetRetirementAge",
  );
  assert.ok(error);
  assert.match(error.message, /cannot be earlier than current age/i);
});

test("flags life expectancy before or equal to retirement age", () => {
  const result = validatePlanSetup(
    profile({ targetRetirementAge: 65, lifeExpectancy: 65 }),
  );
  const error = result.blockingErrors.find(
    (item) => item.field === "lifeExpectancy",
  );
  assert.ok(error);
  assert.match(error.message, /later than target retirement age/i);
});

test("flags ages above 120", () => {
  const result = validatePlanSetup(
    profile({
      currentAge: 121,
      targetRetirementAge: 122,
      lifeExpectancy: 130,
      rmdStartAge: 121,
    }),
  );
  assert.ok(
    result.blockingErrors.some(
      (item) =>
        item.field === "currentAge" && /cannot exceed 120/i.test(item.message),
    ),
  );
  assert.ok(
    result.blockingErrors.some(
      (item) =>
        item.field === "targetRetirementAge" &&
        /cannot exceed 120/i.test(item.message),
    ),
  );
  assert.ok(
    result.blockingErrors.some(
      (item) =>
        item.field === "lifeExpectancy" &&
        /cannot exceed 120/i.test(item.message),
    ),
  );
  assert.ok(
    result.blockingErrors.some(
      (item) =>
        item.field === "rmdStartAge" && /cannot exceed 120/i.test(item.message),
    ),
  );
});

test("flags negative monetary values", () => {
  const result = validatePlanSetup(
    profile({
      annualSalary: -1,
      currentAnnualExpenses: -2,
      assets: { ...profile().assets, brokerage: -50 },
    }),
  );
  assert.ok(
    result.blockingErrors.some((item) => item.field === "annualSalary"),
  );
  assert.ok(
    result.blockingErrors.some(
      (item) => item.field === "currentAnnualExpenses",
    ),
  );
  assert.ok(
    result.blockingErrors.some((item) => item.field === "assets.brokerage"),
  );
});

test("flags percentages outside valid range", () => {
  const result = validatePlanSetup(
    profile({
      expectedAnnualReturn: 1.2,
      safeWithdrawalRate: -0.01,
      socialSecurityTaxablePercent: 1.1,
    }),
  );
  assert.ok(
    result.blockingErrors.some((item) => item.field === "expectedAnnualReturn"),
  );
  assert.ok(
    result.blockingErrors.some((item) => item.field === "safeWithdrawalRate"),
  );
  assert.ok(
    result.blockingErrors.some(
      (item) => item.field === "socialSecurityTaxablePercent",
    ),
  );
});

test("flags missing required fields without silently zeroing them", () => {
  const result = validatePlanSetup(
    profile({
      currentAge: null,
      targetRetirementAge: "",
      lifeExpectancy: undefined,
      expectedAnnualReturn: null,
      inflationRate: "",
      retirementAnnualSpendingGoal: null,
    }),
  );
  assert.ok(result.blockingErrors.some((item) => item.field === "currentAge"));
  assert.ok(
    result.blockingErrors.some((item) => item.field === "targetRetirementAge"),
  );
  assert.ok(
    result.blockingErrors.some((item) => item.field === "lifeExpectancy"),
  );
  assert.ok(
    result.blockingErrors.some((item) => item.field === "expectedAnnualReturn"),
  );
  assert.ok(
    result.blockingErrors.some((item) => item.field === "inflationRate"),
  );
  assert.ok(
    result.blockingErrors.some(
      (item) => item.field === "retirementAnnualSpendingGoal",
    ),
  );
});

test("allows optional fields to be zero", () => {
  const result = validatePlanSetup(
    profile({
      otherAnnualIncome: 0,
      rothConversionAnnualAmount: 0,
      socialSecurityAnnualBenefit: 0,
      irmaaAnnualSurcharge: 0,
    }),
  );
  assert.equal(result.blockingErrors.length, 0);
});

test("rejects malformed numeric input", () => {
  const result = validatePlanSetup(
    profile({
      expectedAnnualReturn: Number.NaN,
      annualSalary: Number.POSITIVE_INFINITY,
      assets: { ...profile().assets, fourOhOneK: Number.NaN },
    }),
  );
  assert.ok(
    result.blockingErrors.some((item) => item.field === "expectedAnnualReturn"),
  );
  assert.ok(
    result.blockingErrors.some((item) => item.field === "annualSalary"),
  );
  assert.ok(
    result.blockingErrors.some((item) => item.field === "assets.fourOhOneK"),
  );
});

test("clears errors when field values are corrected", () => {
  const invalid = validatePlanSetup(
    profile({ targetRetirementAge: 30, lifeExpectancy: 45 }),
  );
  assert.ok(
    invalid.blockingErrors.some((item) => item.field === "targetRetirementAge"),
  );
  const valid = validatePlanSetup(
    profile({ targetRetirementAge: 65, lifeExpectancy: 90 }),
  );
  assert.equal(valid.blockingErrors.length, 0);
});

test("preserves the last valid projection state while invalid", () => {
  const profileWithErrors = profile({ targetRetirementAge: 30 });
  const state = lastValidProjectionState(profileWithErrors, { score: 92 });
  assert.equal(state.isValid, false);
  assert.equal(state.lastValidProjection.score, 92);
});

test("marks warnings distinctly from blocking errors", () => {
  const result = validatePlanSetup(
    profile({
      currentAnnualExpenses: 120000,
      contributionRates: { ...profile().contributionRates, fourOhOneK: 0.8 },
      retirementAnnualSpendingGoal: 0,
    }),
  );
  assert.ok(
    result.warnings.some(
      (item) =>
        item.field === "currentAnnualExpenses" ||
        item.field === "retirementAnnualSpendingGoal",
    ),
  );
  assert.equal(result.blockingErrors.length, 0);
});

test("reset values are valid", () => {
  const result = validatePlanSetup(profile());
  assert.equal(result.blockingErrors.length, 0);
});

test("invalid saved profile loads with validation instead of silent replacement", () => {
  const result = validatePlanSetup(
    profile({ currentAge: 200, targetRetirementAge: 65, lifeExpectancy: 90 }),
  );
  assert.ok(result.blockingErrors.some((item) => item.field === "currentAge"));
  assert.equal(isFieldBlockingError("currentAge", result.blockingErrors), true);
});

test("accepts Social Security claim ages within 62-70", () => {
  const result = validatePlanSetup(profile({ socialSecurityClaimAge: 62 }));
  assert.equal(result.blockingErrors.length, 0);
  const resultFra = validatePlanSetup(profile({ socialSecurityClaimAge: 67 }));
  assert.equal(resultFra.blockingErrors.length, 0);
  const resultDelayed = validatePlanSetup(
    profile({ socialSecurityClaimAge: 70 }),
  );
  assert.equal(resultDelayed.blockingErrors.length, 0);
});

test("flags a Social Security claim age outside 62-70", () => {
  const tooEarly = validatePlanSetup(profile({ socialSecurityClaimAge: 61 }));
  assert.ok(
    tooEarly.blockingErrors.some(
      (item) => item.field === "socialSecurityClaimAge",
    ),
  );
  const tooLate = validatePlanSetup(profile({ socialSecurityClaimAge: 71 }));
  assert.ok(
    tooLate.blockingErrors.some(
      (item) => item.field === "socialSecurityClaimAge",
    ),
  );
});

test("allows a missing Social Security claim age for backward compatibility", () => {
  const legacy = profile();
  delete legacy.socialSecurityClaimAge;
  const result = validatePlanSetup(legacy);
  assert.equal(result.blockingErrors.length, 0);
});

test("rejects a negative IRA contribution amount", () => {
  const result = validatePlanSetup(
    profile({
      iraContributions: { traditionalIraAnnual: -1000, rothIraAnnual: 6000 },
    }),
  );
  assert.ok(
    result.blockingErrors.some(
      (item) => item.field === "iraContributions.traditionalIraAnnual",
    ),
  );
});

test("allows a blank IRA contribution amount", () => {
  const result = validatePlanSetup(
    profile({
      iraContributions: { traditionalIraAnnual: "", rothIraAnnual: 6000 },
    }),
  );
  assert.equal(result.blockingErrors.length, 0);
});

test("rejects a non-numeric or non-finite IRA contribution amount", () => {
  const nonNumeric = validatePlanSetup(
    profile({
      iraContributions: { traditionalIraAnnual: "abc", rothIraAnnual: 6000 },
    }),
  );
  assert.ok(
    nonNumeric.blockingErrors.some(
      (item) => item.field === "iraContributions.traditionalIraAnnual",
    ),
  );

  const infinite = validatePlanSetup(
    profile({
      iraContributions: {
        traditionalIraAnnual: 3000,
        rothIraAnnual: Number.POSITIVE_INFINITY,
      },
    }),
  );
  assert.ok(
    infinite.blockingErrors.some(
      (item) => item.field === "iraContributions.rothIraAnnual",
    ),
  );
});

test("accepts valid Social Security benefit modes", () => {
  assert.equal(
    validatePlanSetup(profile({ socialSecurityBenefitMode: "auto" }))
      .blockingErrors.length,
    0,
  );
  assert.equal(
    validatePlanSetup(profile({ socialSecurityBenefitMode: "manual" }))
      .blockingErrors.length,
    0,
  );
  assert.equal(
    validatePlanSetup(profile({ socialSecurityBenefitMode: undefined }))
      .blockingErrors.length,
    0,
  );
});

test("rejects an invalid Social Security benefit mode", () => {
  const result = validatePlanSetup(
    profile({ socialSecurityBenefitMode: "custom" }),
  );
  assert.ok(
    result.blockingErrors.some(
      (item) => item.field === "socialSecurityBenefitMode",
    ),
  );
});

test("warns when total contributions exceed available income", () => {
  const result = validatePlanSetup(
    profile({
      annualSalary: 20000,
      otherAnnualIncome: 0,
      iraContributions: { traditionalIraAnnual: 15000, rothIraAnnual: 10000 },
    }),
  );
  assert.ok(
    result.warnings.some(
      (item) => item.field === "iraContributions.traditionalIraAnnual",
    ),
  );
  assert.equal(result.blockingErrors.length, 0);
});

test("warns when IRA contributions are unusually high relative to income", () => {
  const result = validatePlanSetup(
    profile({
      annualSalary: 40000,
      otherAnnualIncome: 0,
      iraContributions: { traditionalIraAnnual: 15000, rothIraAnnual: 15000 },
    }),
  );
  assert.ok(
    result.warnings.some(
      (item) => item.field === "iraContributions.rothIraAnnual",
    ),
  );
});

test("warns when contributions create a negative annual cash-flow position", () => {
  const result = validatePlanSetup(
    profile({
      annualSalary: 50000,
      otherAnnualIncome: 0,
      currentAnnualExpenses: 40000,
      iraContributions: { traditionalIraAnnual: 8000, rothIraAnnual: 8000 },
    }),
  );
  assert.ok(
    result.warnings.some(
      (item) => item.field === "iraContributions.rothIraAnnual",
    ),
  );
});
