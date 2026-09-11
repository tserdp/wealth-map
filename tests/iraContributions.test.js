const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");

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
  migrateLegacyIraContributions: migrateLegacyIraContributions,
  iraContributionLimit: iraContributionLimit,
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
  migrateLegacyIraContributions,
  iraContributionLimit,
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
  };
}

test("Traditional IRA annual contribution is a fixed dollar amount, not a percentage of income", () => {
  const contributions = calculateContributions(
    profile({
      annualSalary: 300000,
      iraContributions: { traditionalIraAnnual: 5000, rothIraAnnual: 0 },
    }),
  );
  assert.equal(contributions.traditionalIra, 5000);
});

test("Roth IRA annual contribution is a fixed dollar amount, not a percentage of income", () => {
  const contributions = calculateContributions(
    profile({
      annualSalary: 300000,
      iraContributions: { traditionalIraAnnual: 0, rothIraAnnual: 4000 },
    }),
  );
  assert.equal(contributions.rothIra, 4000);
});

test("zero IRA contributions are handled without affecting other contributions", () => {
  const contributions = calculateContributions(
    profile({
      iraContributions: { traditionalIraAnnual: 0, rothIraAnnual: 0 },
    }),
  );
  assert.equal(contributions.traditionalIra, 0);
  assert.equal(contributions.rothIra, 0);
  assert.ok(contributions.employeeFourOhOneK > 0);
});

test("large IRA contribution amounts flow through without throwing", () => {
  const contributions = calculateContributions(
    profile({
      iraContributions: { traditionalIraAnnual: 100000, rothIraAnnual: 100000 },
    }),
  );
  assert.equal(contributions.traditionalIra, 100000);
  assert.equal(contributions.rothIra, 100000);
});

test("Traditional IRA contribution reduces taxable income", () => {
  const withoutIra = calculateContributions(
    profile({
      iraContributions: { traditionalIraAnnual: 0, rothIraAnnual: 0 },
    }),
  );
  const withIra = calculateContributions(
    profile({
      iraContributions: { traditionalIraAnnual: 5000, rothIraAnnual: 0 },
    }),
  );
  assert.equal(withoutIra.taxableIncome - withIra.taxableIncome, 5000);
  assert.ok(withIra.currentFederalTax < withoutIra.currentFederalTax);
});

test("Roth IRA contribution does not change taxable income (after-tax)", () => {
  const withoutRoth = calculateContributions(
    profile({
      iraContributions: { traditionalIraAnnual: 0, rothIraAnnual: 0 },
    }),
  );
  const withRoth = calculateContributions(
    profile({
      iraContributions: { traditionalIraAnnual: 0, rothIraAnnual: 6000 },
    }),
  );
  assert.equal(withoutRoth.taxableIncome, withRoth.taxableIncome);
  assert.equal(withoutRoth.currentFederalTax, withRoth.currentFederalTax);
});

test("IRA contributions feed employee savings and total retirement contributions", () => {
  const contributions = calculateContributions(
    profile({
      iraContributions: { traditionalIraAnnual: 3000, rothIraAnnual: 6000 },
    }),
  );
  assert.equal(
    contributions.employeeSavings,
    contributions.employeePreTaxContributions +
      contributions.employeePostTaxContributions,
  );
  assert.equal(
    contributions.totalRetirementContributions,
    contributions.employeeSavings + contributions.employerFourOhOneKMatch,
  );
});

test("savings rate updates when IRA contributions change", () => {
  const lower = calculate(
    profile({
      iraContributions: { traditionalIraAnnual: 0, rothIraAnnual: 0 },
    }),
  );
  const higher = calculate(
    profile({
      iraContributions: { traditionalIraAnnual: 5000, rothIraAnnual: 5000 },
    }),
  );
  assert.ok(higher.savingsRate > lower.savingsRate);
});

test("IRA contribution growth compounds in retirement projections", () => {
  const withoutIra = calculate(
    profile({
      iraContributions: { traditionalIraAnnual: 0, rothIraAnnual: 0 },
    }),
  );
  const withIra = calculate(
    profile({
      iraContributions: { traditionalIraAnnual: 5000, rothIraAnnual: 5000 },
    }),
  );
  assert.ok(withIra.projectedAssets > withoutIra.projectedAssets);
});

test("migrates a legacy Traditional IRA contribution percentage to an annual dollar amount", () => {
  const legacy = profile({
    annualSalary: 150000,
    otherAnnualIncome: 0,
    contributionRates: {
      fourOhOneK: 0.1,
      traditionalIra: 0.02,
      rothIra: 0,
      brokerage: 0.06,
      cash: 0.02,
    },
    iraContributions: { traditionalIraAnnual: 0, rothIraAnnual: 0 },
  });
  const migrated = migrateLegacyIraContributions(legacy);
  assert.equal(migrated.iraContributions.traditionalIraAnnual, 3000);
  assert.equal(migrated.contributionRates.traditionalIra, undefined);
});

test("migrates a legacy Roth IRA contribution percentage to an annual dollar amount", () => {
  const legacy = profile({
    annualSalary: 150000,
    otherAnnualIncome: 0,
    contributionRates: {
      fourOhOneK: 0.1,
      traditionalIra: 0,
      rothIra: 0.06,
      brokerage: 0.06,
      cash: 0.02,
    },
    iraContributions: { traditionalIraAnnual: 0, rothIraAnnual: 0 },
  });
  const migrated = migrateLegacyIraContributions(legacy);
  assert.ok(migrated.iraContributions.rothIraAnnual > 0);
  assert.equal(migrated.contributionRates.rothIra, undefined);
});

test("legacy saved profiles continue to load and calculate successfully", () => {
  const legacy = profile({
    contributionRates: {
      fourOhOneK: 0.1,
      traditionalIra: 0.02,
      rothIra: 0.06,
      brokerage: 0.06,
      cash: 0.02,
    },
    iraContributions: { traditionalIraAnnual: 0, rothIraAnnual: 0 },
  });
  const result = calculate(legacy);
  assert.ok(Number.isFinite(result.savingsRate));
  assert.ok(Number.isFinite(result.projectedAssets));
});

test("a profile already using annual IRA contribution amounts is left unchanged by migration", () => {
  const current = profile({
    iraContributions: { traditionalIraAnnual: 4000, rothIraAnnual: 7000 },
  });
  const migrated = migrateLegacyIraContributions(current);
  assert.equal(migrated.iraContributions.traditionalIraAnnual, 4000);
  assert.equal(migrated.iraContributions.rothIraAnnual, 7000);
});

test("current IRS max helper returns the under-50 and catch-up limits", () => {
  assert.equal(iraContributionLimit(45), 7000);
  assert.equal(iraContributionLimit(50), 8000);
  assert.equal(iraContributionLimit(65), 8000);
});
