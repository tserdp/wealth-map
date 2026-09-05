const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const indexHtml = fs.readFileSync(
  path.join(__dirname, "../index.html"),
  "utf8",
);
const appJs = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");

const GLOBAL_DISCLAIMER =
  "WealthMap is an educational retirement planning tool, not a tax, legal, or investment advisor. Consult qualified professionals before making important financial decisions.";

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

test("the Social Security claim-age migration notice is removed", () => {
  assert.ok(!indexHtml.includes("moved to Plan Setup"));
  assert.ok(
    !indexHtml.includes(
      "Set your Social Security claim age directly on the Plan Setup page",
    ),
  );
});

test("prototype-boundary and organizational notice panels are removed", () => {
  assert.ok(!indexHtml.includes("Prototype boundary"));
  assert.ok(!appJs.includes("Not modeled in prototype."));
});

test("the global disclaimer appears exactly once in the primary experience", () => {
  assert.equal(countOccurrences(indexHtml, GLOBAL_DISCLAIMER), 1);
});

test("the global disclaimer lives in the footer, not an alert/warning panel", () => {
  const footerMatch = indexHtml.match(
    /<footer class="app-footer">([^<]*)<\/footer>/,
  );
  assert.ok(footerMatch);
  assert.equal(footerMatch[1], GLOBAL_DISCLAIMER);
});

test("the disclaimer is not repeated on individual pages or cards", () => {
  assert.ok(!indexHtml.includes("not financial, tax, or legal advice."));
  assert.ok(!appJs.includes("not financial, tax, or legal advice."));
});

test("required plan setup validation standby message is preserved", () => {
  assert.ok(
    indexHtml.includes(
      "Projections are paused until required plan inputs are valid.",
    ),
  );
});

test("model-generated strategy labels remain understandable", () => {
  assert.ok(appJs.includes("Model-recommended"));
  assert.ok(appJs.includes("Evaluated using your current plan assumptions"));
  assert.ok(
    appJs.includes(
      "Uses your current assumptions to estimate available conversion opportunities",
    ),
  );
});

test("contextual strategy tooltips remain keyboard accessible buttons", () => {
  assert.ok(appJs.includes('id="ss-strategy-help-button"'));
  assert.ok(appJs.includes('id="roth-strategy-help-button"'));
  assert.ok(appJs.includes('aria-label="About the Social Security strategy"'));
  assert.ok(appJs.includes('aria-label="About the Roth conversion strategy"'));
});

test("metric help buttons are wired through delegated, keyboard-triggerable click handling", () => {
  assert.ok(appJs.includes('closest(".metric-help-button")'));
});

test("no blank notice-panel section remains where removed content used to be", () => {
  assert.ok(!indexHtml.includes('<section class="notice-panel">'));
});

test("the cash reserve field uses its renamed user-facing label", () => {
  assert.ok(appJs.includes('"Cash Reserve (Years of Spending)"'));
  assert.ok(!appJs.includes("Retirement cash reserve target"));
  assert.ok(!indexHtml.includes("Retirement cash reserve target"));
});

test("the cash reserve field keeps its internal field key and unit text", () => {
  assert.ok(appJs.includes('"cashReserveTargetYears"'));
  assert.ok(appJs.includes('"years of spending"'));
});

test("plan setup fields with contextual help reuse the metric-help pattern with keyboard-accessible icons", () => {
  assert.ok(appJs.includes("const PLAN_SETUP_FIELD_HELP"));
  assert.ok(
    appJs.includes('helpButton.className = "info-button metric-help-button"'),
  );
  assert.ok(
    appJs.includes('helpButton.setAttribute("aria-expanded", "false")'),
  );
  assert.ok(
    appJs.includes(
      'helpButton.setAttribute("aria-controls", `${helpSlug}-help`)',
    ),
  );
  assert.ok(
    appJs.includes(
      'helpButton.setAttribute("aria-label", `About ${fieldHelp.title}`)',
    ),
  );
  assert.ok(appJs.includes('helpPanel.setAttribute("role", "tooltip")'));
  assert.ok(appJs.includes("helpPanel.dataset.helpButtonId = helpButton.id"));
  assert.ok(appJs.includes("helpPanel.hidden = true"));
});

test("plan setup contextual help covers the required fields with concise, user-focused tooltip text", () => {
  const expectedHelp = {
    "Safe Withdrawal Rate":
      "The percentage of your retirement portfolio that can be withdrawn annually to help support retirement spending. Higher rates require fewer assets but may increase the risk of running out of money later in retirement.",
    "Social Security Annual Benefit":
      "Annual Social Security benefit at Full Retirement Age (67). If Automatic Estimate is selected, WealthMap estimates this value from your earnings. Claim Age adjustments are applied separately.",
    "Social Security Claim Age":
      "The age at which Social Security benefits begin. Claiming earlier reduces benefits. Claiming later increases benefits.",
    "Expected Annual Return":
      "Expected long-term annual portfolio growth before inflation. WealthMap converts this assumption into a real return using your inflation rate.",
    "Inflation Rate":
      "Expected annual increase in the cost of living. WealthMap uses this assumption to express projections in today's purchasing power.",
    "Retirement Spending Goal":
      "Target annual spending during retirement expressed in today's dollars. This value is used throughout readiness, timeline, and retirement asset calculations.",
    "Traditional IRA Annual Contribution":
      "Annual contribution to a Traditional IRA. Contributions are treated as pre-tax retirement savings in the model.",
    "Roth IRA Annual Contribution":
      "Annual contribution to a Roth IRA. Contributions are made with after-tax dollars and can grow tax-free in the model.",
    "Cash Reserve (Years of Spending)":
      "Sets how many years of retirement spending the model aims to keep in cash. In positive-return years, available brokerage assets may be moved to cash to refill this reserve, helping reduce the need to sell investments during market declines.",
    "Pre-Tax Withdrawal Tax Rate":
      "Estimated tax rate applied to future withdrawals from tax-deferred retirement accounts such as 401(k)s and Traditional IRAs.",
    "RMD Start Age":
      "Age at which Required Minimum Distributions (RMDs) begin from eligible tax-deferred retirement accounts.",
    "Taxable Gains Tax Rate":
      "Estimated tax rate applied to investment gains generated within taxable brokerage accounts.",
    "IRMAA Income Threshold":
      "Income level above which Medicare income-related monthly adjustment amounts (IRMAA) may apply.",
    "Annual IRMAA Surcharge":
      "Estimated annual Medicare surcharge applied when income exceeds the IRMAA threshold.",
    "Annual Roth Conversion":
      "Annual amount converted from tax-deferred retirement accounts into Roth accounts when using the manual Roth conversion strategy.",
  };
  Object.entries(expectedHelp).forEach(([title, text]) => {
    assert.ok(
      appJs.includes(`title: "${title}"`),
      `missing help title: ${title}`,
    );
    assert.ok(appJs.includes(text), `missing help text for: ${title}`);
  });
});

test("other assets tooltip informs the user that real estate is shown separately from the retirement portfolio", () => {
  assert.ok(
    indexHtml.includes('id="other-assets-help"') &&
      indexHtml.includes(
        "Real estate is shown separately from the retirement portfolio.",
      ),
  );
});
