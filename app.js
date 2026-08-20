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
  recommendations: ["RECOMMENDATIONS", "Recommendations"],
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const money = (value) =>
  currencyFormatter.format(Number.isFinite(value) ? value : 0);
const percent = (value) =>
  percentFormatter.format(Number.isFinite(value) ? value : 0);
const numberValue = (value) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

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
  return (
    (1 + profile.expectedAnnualReturn) / (1 + profile.inflationRate) - 1
  );
}

function projectPortfolio(profile, years) {
  const starting = profile.assets;
  const returnRate = realAnnualReturn(profile);
  const startingFinancialAssets =
    starting.brokerage +
    starting.fourOhOneK +
    starting.traditionalIra +
    starting.rothIra +
    starting.cash;
  const contributionShares =
    startingFinancialAssets > 0
      ? {
          brokerage: starting.brokerage / startingFinancialAssets,
          fourOhOneK: starting.fourOhOneK / startingFinancialAssets,
          traditionalIra: starting.traditionalIra / startingFinancialAssets,
          rothIra: starting.rothIra / startingFinancialAssets,
          cash: starting.cash / startingFinancialAssets,
        }
      : { brokerage: 0, fourOhOneK: 1, traditionalIra: 0, rothIra: 0, cash: 0 };
  let brokerage = starting.brokerage;
  let preTax = starting.fourOhOneK + starting.traditionalIra;
  let roth = starting.rothIra;
  let cash = starting.cash;
  let conversionTax = 0;
  const currentOrdinaryIncome =
    profile.annualSalary + profile.otherAnnualIncome;
  const baseTax = ordinaryIncomeTax(profile, currentOrdinaryIncome);

  for (let year = 0; year < years; year += 1) {
    brokerage *=
      1 + returnRate * (1 - profile.taxableGainsTaxRate);
    preTax *= 1 + returnRate;
    roth *= 1 + returnRate;
    cash += profile.annualSavings * contributionShares.cash;
    brokerage += profile.annualSavings * contributionShares.brokerage;
    preTax +=
      profile.annualSavings *
      (contributionShares.fourOhOneK + contributionShares.traditionalIra);
    roth += profile.annualSavings * contributionShares.rothIra;

    const conversion = Math.min(
      preTax,
      Math.max(0, profile.rothConversionAnnualAmount),
    );
    if (conversion > 0) {
      const taxOnConversion = Math.max(
        0,
        ordinaryIncomeTax(profile, currentOrdinaryIncome + conversion) -
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
  const rmd =
    age >= profile.rmdStartAge ? portfolio.preTax * profile.rmdRate : 0;
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

function calculate(profile) {
  const assets = profile.assets;
  const financialAssets =
    assets.brokerage +
    assets.fourOhOneK +
    assets.traditionalIra +
    assets.rothIra +
    assets.cash;
  const totalAssets = financialAssets + assets.realEstate;
  const totalIncome = profile.annualSalary + profile.otherAnnualIncome;
  const currentFederalTax = progressiveFederalTax(profile, totalIncome);
  const currentStateTax = Math.max(0, totalIncome) * profile.stateIncomeTaxRate;
  const afterTaxIncome = Math.max(0, totalIncome - currentFederalTax - currentStateTax);
  const surplus = afterTaxIncome - profile.currentAnnualExpenses;
  const savingsRate = totalIncome > 0 ? profile.annualSavings / totalIncome : 0;
  const yearsToTarget = Math.max(
    0,
    profile.targetRetirementAge - profile.currentAge,
  );
  const portfolio = projectPortfolio(profile, yearsToTarget);
  const retirement = retirementNeed(
    profile,
    portfolio,
    profile.targetRetirementAge,
  );
  const projectedAssets = portfolio.afterTaxAssets;
  const requiredAssets = retirement.requiredAssets;
  const fundingDelta = requiredAssets - projectedAssets;
  const expectedRetirementAge = findExpectedRetirementAge(
    profile,
    financialAssets,
    requiredAssets,
  );
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
  const score = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        fundingComponent * 60 + savingsComponent * 25 + timingComponent * 15,
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
    afterTaxIncome,
    surplus,
    savingsRate,
    yearsToTarget,
    projectedAssets,
    requiredAssets,
    fundingDelta,
    expectedRetirementAge,
    score,
    status,
    safeSpending:
      projectedAssets * profile.safeWithdrawalRate +
      retirement.netSocialSecurity -
      retirement.irmaa,
    currentFederalTax,
    currentStateTax,
    projectedConversionTax: portfolio.conversionTax,
    projectedRmd: retirement.rmd,
    projectedSocialSecurityTax: retirement.socialSecurityTax,
    projectedIrmaa: retirement.irmaa,
    afterTaxAssets: projectedAssets,
  };
}

function projectAssets(profile, years) {
  return projectPortfolio(profile, years).afterTaxAssets;
}

function findExpectedRetirementAge(profile, startingAssets, requiredAssets) {
  if (!Number.isFinite(requiredAssets)) return null;
  for (let age = profile.currentAge; age <= profile.lifeExpectancy; age += 1) {
    const portfolio = projectPortfolio(profile, age - profile.currentAge);
    const need = retirementNeed(profile, portfolio, age).requiredAssets;
    if (portfolio.afterTaxAssets >= need) return age;
  }
  return null;
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
        [
          ["real_dollars", "Real dollars"],
        ],
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
      ["rmdRate", "Illustrative RMD rate", "percent", "%", 4],
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
      ["annualSavings", "Annual savings", "currency", "per year", 30000],
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
  };
}

function createField(config) {
  const [key, label, type, unit, fallback, options] = config;
  const value = workingProfile[key];
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

function recommendations(metrics, profile) {
  const items = [];
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

function renderMetrics() {
  const metrics = calculate(workingProfile);
  $("#sidebar-name").textContent = workingProfile.name || "Unnamed plan";
  $("#sidebar-timeline").textContent =
    `Age ${workingProfile.currentAge} → Retire ${workingProfile.targetRetirementAge}`;
  $("#score-value").textContent = metrics.score;
  $("#score-bar").style.width = `${metrics.score}%`;
  $("#score-status").textContent = metrics.status;
  $("#readiness-status").textContent = metrics.status;
  $("#readiness-status").className =
    `status-pill ${metrics.status === "On Track" ? "" : "neutral"}`;
  $("#target-age").textContent = workingProfile.targetRetirementAge;
  $("#expected-age").textContent =
    metrics.expectedRetirementAge ?? "Beyond life expectancy";
  $("#years-to-target").textContent = metrics.yearsToTarget;
  $("#projected-assets").textContent = money(metrics.projectedAssets);
  $("#required-assets").textContent = Number.isFinite(metrics.requiredAssets)
    ? money(metrics.requiredAssets)
    : "Unavailable";
  $("#funding-label").textContent =
    metrics.fundingDelta > 0 ? "Funding gap" : "Projected surplus";
  $("#funding-gap").textContent = money(Math.abs(metrics.fundingDelta));
  $("#safe-spending").textContent = money(metrics.safeSpending);
  $("#spending-goal").textContent = money(
    workingProfile.retirementAnnualSpendingGoal,
  );
  $("#financial-assets-total").textContent = money(metrics.financialAssets);
  $("#financial-assets-total-bottom").textContent = money(
    metrics.financialAssets,
  );
  $("#total-assets").textContent = money(metrics.totalAssets);
  $("#total-income").textContent = money(metrics.totalIncome);
  $("#annual-surplus").textContent = money(metrics.surplus);
  $("#savings-rate").textContent = percent(metrics.savingsRate);
  $("#current-federal-tax").textContent = money(metrics.currentFederalTax);
  $("#current-state-tax").textContent = money(metrics.currentStateTax);
  $("#after-tax-assets").textContent = money(metrics.afterTaxAssets);
  $("#projected-rmd").textContent = money(metrics.projectedRmd);
  $("#projected-ss-tax").textContent = money(
    metrics.projectedSocialSecurityTax,
  );
  $("#projected-irmaa").textContent = money(metrics.projectedIrmaa);
  $("#readiness-updated").textContent =
    `Updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  renderRecommendations(metrics);
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
  $("#open-menu").addEventListener("click", () => {
    $("#sidebar").classList.add("open");
    $("#scrim").hidden = false;
  });
  $("#close-menu").addEventListener("click", closeMenu);
  $("#scrim").addEventListener("click", closeMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

document.addEventListener("DOMContentLoaded", init);
