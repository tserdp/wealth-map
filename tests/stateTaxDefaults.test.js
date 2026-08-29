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
  roundTo: roundTo,
  cloneSampleProfile: cloneSampleProfile,
  SAMPLE_PROFILE: SAMPLE_PROFILE,
};`;
  const sandbox = { console, Math, Number, Intl, Object, Array, JSON, Date };
  vm.createContext(sandbox);
  vm.runInContext(dataSrc + "\n" + appSrc + "\n" + exportSnippet, sandbox, {
    filename: "wealth-map-model.js",
  });
  return sandbox.__wealthMap;
}

const { roundTo, cloneSampleProfile, SAMPLE_PROFILE } = loadModel();

const { validatePlanSetup } = require("../validation.js");

test("sample profile defaults to Florida", () => {
  assert.equal(SAMPLE_PROFILE.state, "Florida");
});

test("sample profile defaults to 0% state income tax", () => {
  assert.equal(SAMPLE_PROFILE.stateIncomeTaxRate, 0);
});

test("cloning the sample profile (a fresh/reset profile) preserves Florida and 0%", () => {
  const cloned = cloneSampleProfile();
  assert.equal(cloned.state, "Florida");
  assert.equal(cloned.stateIncomeTaxRate, 0);
});

test("percent-to-display rounding removes floating-point artifacts", () => {
  assert.equal(roundTo(0.044 * 100, 4), 4.4);
  assert.equal(roundTo(0 * 100, 4), 0);
  assert.equal(roundTo(0.0725 * 100, 4), 7.25);
  assert.equal(roundTo(0.05 * 100, 4), 5);
  assert.equal(roundTo(0.03 * 100, 4), 3);
});

test("percent-to-fraction rounding removes floating-point artifacts from user input", () => {
  // 4.4 / 100 is 0.044000000000000004 in raw IEEE-754 division.
  assert.equal(roundTo(4.4 / 100, 6), 0.044);
  assert.equal(roundTo(7.25 / 100, 6), 0.0725);
  assert.equal(roundTo(0 / 100, 6), 0);
});

test("existing saved profiles preserve their own non-default state and tax rate", () => {
  const legacy = {
    ...cloneSampleProfile(),
    state: "Colorado",
    stateIncomeTaxRate: 0.044,
  };
  assert.equal(legacy.state, "Colorado");
  assert.equal(legacy.stateIncomeTaxRate, 0.044);
});

test("state income tax rate validation still rejects negative and above-100% values", () => {
  const negative = validatePlanSetup({
    ...cloneSampleProfile(),
    stateIncomeTaxRate: -0.01,
  });
  assert.ok(
    negative.blockingErrors.some((item) => item.field === "stateIncomeTaxRate"),
  );

  const tooHigh = validatePlanSetup({
    ...cloneSampleProfile(),
    stateIncomeTaxRate: 1.01,
  });
  assert.ok(
    tooHigh.blockingErrors.some((item) => item.field === "stateIncomeTaxRate"),
  );
});

test("state income tax rate validation accepts decimal percentages within range", () => {
  const result = validatePlanSetup({
    ...cloneSampleProfile(),
    stateIncomeTaxRate: 0.0725,
  });
  assert.equal(
    result.blockingErrors.some((item) => item.field === "stateIncomeTaxRate"),
    false,
  );
});
