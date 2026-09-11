const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");

const { validatePlanSetup } = require("../validation.js");

// app.js and data.js are plain (non-module) browser scripts. Running them together in a single
// vm context lets the tests reach their pure calculation functions without a DOM, while leaving
// the shipped files untouched for the browser.
function loadModel() {
  const dataSrc = fs.readFileSync(path.join(__dirname, "../data.js"), "utf8");
  const appSrc = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  const exportSnippet = `
var __wealthMap = {
  calculate: calculate,
  calculateContributions: calculateContributions,
  migrateLegacySavingsAllocation: migrateLegacySavingsAllocation,
  cloneSampleProfile: cloneSampleProfile,
};`;
  const sandbox = { console, Math, Number, Intl, Object, Array, JSON, Date };
  vm.createContext(sandbox);
  vm.runInContext(dataSrc + "\n" + appSrc + "\n" + exportSnippet, sandbox, {
    filename: "wealth-map-model.js",
  });
  return sandbox.__wealthMap;
}

const {
  calculate,
  calculateContributions,
  migrateLegacySavingsAllocation,
  cloneSampleProfile,
} = loadModel();

function profile(overrides = {}) {
  const base = cloneSampleProfile();
  return {
    ...base,
    ...overrides,
    assets: { ...base.assets, ...(overrides.assets || {}) },
    iraContributions: {
      ...base.iraContributions,
      ...(overrides.iraContributions || {}),
    },
    savingsAllocation: {
      ...base.savingsAllocation,
      ...(overrides.savingsAllocation || {}),
    },
  };
}

test("Brokerage and Cash are allocated from positive available annual savings, not after-tax income", () => {
  const contributions = calculateContributions(
    profile({
      annualSalary: 200000,
      currentAnnualExpenses: 100000,
      iraContributions: { traditionalIraAnnual: 0, rothIraAnnual: 10000 },
      savingsAllocation: { brokerage: 0.8, cash: 0.2 },
    }),
  );
  const expectedAvailable =
    contributions.afterTaxIncome - 100000 - contributions.rothIra;
  assert.ok(contributions.availableAnnualSavings > 0);
  assert.equal(
    Math.round(contributions.availableAnnualSavings),
    Math.round(expectedAvailable),
  );
  assert.equal(
    Math.round(contributions.brokerage),
    Math.round(expectedAvailable * 0.8),
  );
  assert.equal(
    Math.round(contributions.cash),
    Math.round(expectedAvailable * 0.2),
  );
});

test("zero available annual savings produces zero Brokerage and Cash contributions", () => {
  const contributions = calculateContributions(
    profile({
      annualSalary: 60000,
      otherAnnualIncome: 0,
      currentAnnualExpenses: 60000,
      iraContributions: { traditionalIraAnnual: 0, rothIraAnnual: 0 },
      savingsAllocation: { brokerage: 0.5, cash: 0.5 },
    }),
  );
  assert.equal(contributions.availableAnnualSavings, 0);
  assert.equal(contributions.brokerage, 0);
  assert.equal(contributions.cash, 0);
});

test("negative available annual savings is clamped to zero and never produces negative allocations", () => {
  const contributions = calculateContributions(
    profile({
      annualSalary: 40000,
      otherAnnualIncome: 0,
      currentAnnualExpenses: 90000,
      iraContributions: { traditionalIraAnnual: 0, rothIraAnnual: 5000 },
      savingsAllocation: { brokerage: 0.75, cash: 0.25 },
    }),
  );
  assert.equal(contributions.availableAnnualSavings, 0);
  assert.equal(contributions.brokerage, 0);
  assert.equal(contributions.cash, 0);
});

test("Brokerage-only allocation (100/0) sends all available savings to Brokerage", () => {
  const contributions = calculateContributions(
    profile({
      annualSalary: 200000,
      currentAnnualExpenses: 100000,
      iraContributions: { traditionalIraAnnual: 0, rothIraAnnual: 0 },
      savingsAllocation: { brokerage: 1, cash: 0 },
    }),
  );
  assert.ok(contributions.brokerage > 0);
  assert.equal(contributions.cash, 0);
  assert.equal(
    Math.round(contributions.brokerage),
    Math.round(contributions.availableAnnualSavings),
  );
});

test("Cash-only allocation (0/100) sends all available savings to Cash", () => {
  const contributions = calculateContributions(
    profile({
      annualSalary: 200000,
      currentAnnualExpenses: 100000,
      iraContributions: { traditionalIraAnnual: 0, rothIraAnnual: 0 },
      savingsAllocation: { brokerage: 0, cash: 1 },
    }),
  );
  assert.equal(contributions.brokerage, 0);
  assert.ok(contributions.cash > 0);
  assert.equal(
    Math.round(contributions.cash),
    Math.round(contributions.availableAnnualSavings),
  );
});

test("50/50 allocation splits available annual savings evenly", () => {
  const contributions = calculateContributions(
    profile({
      annualSalary: 200000,
      currentAnnualExpenses: 100000,
      iraContributions: { traditionalIraAnnual: 0, rothIraAnnual: 0 },
      savingsAllocation: { brokerage: 0.5, cash: 0.5 },
    }),
  );
  assert.equal(
    Math.round(contributions.brokerage),
    Math.round(contributions.cash),
  );
});

test("allocation shares are normalized when they do not sum to 100%, without creating negative cash flow", () => {
  const contributions = calculateContributions(
    profile({
      annualSalary: 200000,
      currentAnnualExpenses: 100000,
      iraContributions: { traditionalIraAnnual: 0, rothIraAnnual: 0 },
      savingsAllocation: { brokerage: 0.7, cash: 0.2 },
    }),
  );
  assert.equal(
    Math.round(contributions.brokerage + contributions.cash),
    Math.round(contributions.availableAnnualSavings),
  );
});

test("validation rejects Brokerage/Cash allocations that do not total 100%", () => {
  const result = validatePlanSetup({
    currentAge: 45,
    targetRetirementAge: 65,
    lifeExpectancy: 90,
    expectedAnnualReturn: 0.05,
    inflationRate: 0.025,
    retirementAnnualSpendingGoal: 75000,
    savingsAllocation: { brokerage: 0.7, cash: 0.2 },
  });
  assert.ok(
    result.blockingErrors.some(
      (item) => item.field === "savingsAllocation.brokerage",
    ),
  );
  assert.ok(
    result.blockingErrors.some(
      (item) => item.field === "savingsAllocation.cash",
    ),
  );
});

test("validation accepts Brokerage/Cash allocations that total exactly 100%", () => {
  const result = validatePlanSetup({
    currentAge: 45,
    targetRetirementAge: 65,
    lifeExpectancy: 90,
    expectedAnnualReturn: 0.05,
    inflationRate: 0.025,
    retirementAnnualSpendingGoal: 75000,
    savingsAllocation: { brokerage: 0.6, cash: 0.4 },
  });
  assert.equal(
    result.blockingErrors.some((item) =>
      item.field.startsWith("savingsAllocation"),
    ),
    false,
  );
});

test("savings rate reflects the actual allocated Brokerage and Cash amounts", () => {
  const lowAllocation = calculate(
    profile({ savingsAllocation: { brokerage: 0.1, cash: 0.9 } }),
  );
  const highAllocation = calculate(
    profile({ savingsAllocation: { brokerage: 0.9, cash: 0.1 } }),
  );
  // Total allocated dollars are identical (same available savings pool), so the savings rate
  // should be unchanged by the split between Brokerage and Cash.
  assert.equal(
    Math.round(lowAllocation.savingsRate * 1e6),
    Math.round(highAllocation.savingsRate * 1e6),
  );
});

test("readiness score, timeline projections, and funding gap remain finite and consistent", () => {
  const result = calculate(
    profile({ savingsAllocation: { brokerage: 0.75, cash: 0.25 } }),
  );
  assert.ok(Number.isFinite(result.score));
  assert.ok(result.score >= 0 && result.score <= 100);
  assert.ok(Number.isFinite(result.projectedAssets));
  assert.ok(Number.isFinite(result.requiredAssets));
  assert.ok(Number.isFinite(result.fundingDelta));
});

test("existing saved plans using legacy Brokerage/Cash contribution percentages migrate to an equivalent allocation split", () => {
  const legacy = profile({});
  delete legacy.savingsAllocation;
  legacy.contributionRates = {
    fourOhOneK: 0.1,
    brokerage: 0.06,
    cash: 0.02,
  };
  const migrated = migrateLegacySavingsAllocation(legacy);
  assert.ok(Math.abs(migrated.savingsAllocation.brokerage - 0.75) < 0.001);
  assert.ok(Math.abs(migrated.savingsAllocation.cash - 0.25) < 0.001);
  assert.equal(migrated.contributionRates.brokerage, undefined);
  assert.equal(migrated.contributionRates.cash, undefined);
});

test("legacy saved plans continue to calculate successfully after migration", () => {
  const legacy = profile({});
  delete legacy.savingsAllocation;
  legacy.contributionRates = {
    fourOhOneK: 0.1,
    brokerage: 0.06,
    cash: 0.02,
  };
  const result = calculate(legacy);
  assert.ok(Number.isFinite(result.savingsRate));
  assert.ok(Number.isFinite(result.projectedAssets));
  assert.ok(result.brokerageContribution >= 0);
  assert.ok(result.cashContribution >= 0);
});

test("a profile already using savingsAllocation is left unchanged by migration", () => {
  const current = profile({ savingsAllocation: { brokerage: 0.6, cash: 0.4 } });
  const migrated = migrateLegacySavingsAllocation(current);
  assert.equal(migrated.savingsAllocation.brokerage, 0.6);
  assert.equal(migrated.savingsAllocation.cash, 0.4);
});

test("contribution reporting exposes the actual dollar amounts allocated to Brokerage and Cash", () => {
  const result = calculate(profile({}));
  assert.ok(Number.isFinite(result.availableAnnualSavings));
  assert.ok(Number.isFinite(result.brokerageContribution));
  assert.ok(Number.isFinite(result.cashContribution));
  assert.equal(
    Math.round(result.brokerageContribution + result.cashContribution),
    Math.round(result.availableAnnualSavings),
  );
});
