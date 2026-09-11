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
  buildTimelineRows: buildTimelineRows,
  timelineSummary: timelineSummary,
  benefitForClaimAge: benefitForClaimAge,
  socialSecurityClaimingSchedule: socialSecurityClaimingSchedule,
  resolveSocialSecurityPlan: resolveSocialSecurityPlan,
  resolveEffectiveProfile: resolveEffectiveProfile,
  cloneSampleProfile: cloneSampleProfile,
  SAMPLE_PROFILE: SAMPLE_PROFILE,
  SOCIAL_SECURITY_FULL_RETIREMENT_AGE: SOCIAL_SECURITY_FULL_RETIREMENT_AGE,
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
  buildTimelineRows,
  timelineSummary,
  benefitForClaimAge,
  resolveSocialSecurityPlan,
  resolveEffectiveProfile,
  cloneSampleProfile,
  SOCIAL_SECURITY_FULL_RETIREMENT_AGE,
} = loadModel();

function profile(overrides = {}) {
  const base = cloneSampleProfile();
  return {
    ...base,
    ...overrides,
    assets: { ...base.assets, ...(overrides.assets || {}) },
  };
}

function retiringSoonProfile(claimAge, overrides = {}) {
  return profile({
    currentAge: 60,
    targetRetirementAge: 62,
    lifeExpectancy: 90,
    socialSecurityStrategy: "manual",
    socialSecurityBenefitMode: "manual",
    socialSecurityAnnualBenefit: 24000,
    socialSecurityClaimAge: claimAge,
    socialSecurityTaxablePercent: 0.85,
    retirementAnnualSpendingGoal: 90000,
    // Explicit non-zero rate so these Social Security tax assertions don't depend on the app's
    // default state income tax rate (Florida/0% by default).
    stateIncomeTaxRate: 0.044,
    ...overrides,
  });
}

test("claim age 62 reduces the benefit below the FRA amount", () => {
  const fraBenefit = 24000;
  const reduced = benefitForClaimAge(fraBenefit, 62);
  assert.ok(reduced < fraBenefit);
  assert.ok(reduced > 0);
});

test("claim age 67 (Full Retirement Age) pays the baseline benefit", () => {
  const fraBenefit = 24000;
  assert.equal(benefitForClaimAge(fraBenefit, 67), fraBenefit);
  assert.equal(SOCIAL_SECURITY_FULL_RETIREMENT_AGE, 67);
});

test("claim age 70 increases the benefit above the FRA amount", () => {
  const fraBenefit = 24000;
  const increased = benefitForClaimAge(fraBenefit, 70);
  assert.ok(increased > fraBenefit);
});

test("the engine uses the claim-age-adjusted benefit, not the raw FRA amount", () => {
  const early = retiringSoonProfile(62);
  const { ssPlan } = resolveEffectiveProfile(early);
  assert.equal(ssPlan.fraBenefit, 24000);
  assert.ok(ssPlan.annualBenefit < ssPlan.fraBenefit);

  const rows = buildTimelineRows(
    resolveEffectiveProfile(early).effectiveProfile,
  );
  const ssRow = rows.find((row) => row.socialSecurityGrossBenefit > 0);
  assert.ok(ssRow);
  assert.equal(ssRow.socialSecurityGrossBenefit, ssPlan.annualBenefit);
});

test("Social Security income and tax are zero before the claim age", () => {
  const claimAge = 67;
  const { effectiveProfile } = resolveEffectiveProfile(
    retiringSoonProfile(claimAge),
  );
  const rows = buildTimelineRows(effectiveProfile);
  const beforeClaim = rows.filter((row) => row.isRetired && row.age < claimAge);
  assert.ok(beforeClaim.length > 0);
  beforeClaim.forEach((row) => {
    assert.equal(row.socialSecurityGrossBenefit, 0);
    assert.equal(row.socialSecurityTax, 0);
  });
});

test("Social Security income and tax begin at and after the claim age", () => {
  const claimAge = 67;
  const { effectiveProfile } = resolveEffectiveProfile(
    retiringSoonProfile(claimAge),
  );
  const rows = buildTimelineRows(effectiveProfile);
  const atOrAfterClaim = rows.filter(
    (row) => row.isRetired && row.age >= claimAge,
  );
  assert.ok(atOrAfterClaim.length > 0);
  atOrAfterClaim.forEach((row) => {
    assert.ok(row.socialSecurityGrossBenefit > 0);
    assert.ok(row.socialSecurityTax > 0);
  });
});

test("timeline withdrawal need drops once Social Security begins", () => {
  const claimAge = 67;
  const { effectiveProfile } = resolveEffectiveProfile(
    retiringSoonProfile(claimAge),
  );
  const rows = buildTimelineRows(effectiveProfile);
  const lastBeforeClaim = [...rows]
    .reverse()
    .find((row) => row.isRetired && row.age === claimAge - 1);
  const firstAtClaim = rows.find(
    (row) => row.isRetired && row.age === claimAge,
  );
  assert.ok(lastBeforeClaim);
  assert.ok(firstAtClaim);
  assert.ok(firstAtClaim.withdrawal < lastBeforeClaim.withdrawal);
});

test("retirement readiness metrics respond to claim age changes", () => {
  const metrics62 = calculate(retiringSoonProfile(62));
  const metrics70 = calculate(retiringSoonProfile(70));
  assert.notEqual(metrics62.requiredAssets, metrics70.requiredAssets);
  assert.notEqual(
    metrics62.projectedSocialSecurityTax,
    metrics70.projectedSocialSecurityTax,
  );
});

test("portfolio longevity can differ across claim ages", () => {
  const summary62 = timelineSummary(
    buildTimelineRows(
      resolveEffectiveProfile(retiringSoonProfile(62)).effectiveProfile,
    ),
    resolveEffectiveProfile(retiringSoonProfile(62)).effectiveProfile,
  );
  const summary70 = timelineSummary(
    buildTimelineRows(
      resolveEffectiveProfile(retiringSoonProfile(70)).effectiveProfile,
    ),
    resolveEffectiveProfile(retiringSoonProfile(70)).effectiveProfile,
  );
  assert.ok(summary62.depletionAge != null);
  assert.ok(summary70.depletionAge != null);
  assert.notEqual(summary62.depletionAge, summary70.depletionAge);
});

test("a saved profile missing a claim age falls back to Full Retirement Age (67)", () => {
  const legacyProfile = retiringSoonProfile(62);
  delete legacyProfile.socialSecurityClaimAge;
  const { ssPlan } = resolveEffectiveProfile(legacyProfile);
  assert.equal(ssPlan.claimAge, SOCIAL_SECURITY_FULL_RETIREMENT_AGE);
});

test("no Social Security benefit produces no Social Security income at any age", () => {
  const noBenefit = retiringSoonProfile(67, { socialSecurityAnnualBenefit: 0 });
  const { effectiveProfile } = resolveEffectiveProfile(noBenefit);
  const rows = buildTimelineRows(effectiveProfile);
  rows
    .filter((row) => row.isRetired)
    .forEach((row) => {
      assert.equal(row.socialSecurityGrossBenefit, 0);
      assert.equal(row.socialSecurityTax, 0);
    });
});
