(function (globalScope) {
  const REQUIRED_FIELDS = [
    "currentAge",
    "targetRetirementAge",
    "lifeExpectancy",
    "expectedAnnualReturn",
    "inflationRate",
    "retirementAnnualSpendingGoal",
  ];

  const MONETARY_FIELDS = [
    "annualSalary",
    "otherAnnualIncome",
    "currentAnnualExpenses",
    "retirementAnnualSpendingGoal",
    "federalStandardDeduction",
    "rothConversionAnnualAmount",
    "socialSecurityAnnualBenefit",
    "niitThreshold",
    "irmaaIncomeThreshold",
    "irmaaAnnualSurcharge",
    "assets.brokerage",
    "assets.fourOhOneK",
    "assets.traditionalIra",
    "assets.rothIra",
    "assets.cash",
    "assets.realEstate",
  ];

  const PERCENT_FIELDS = [
    "expectedAnnualReturn",
    "inflationRate",
    "safeWithdrawalRate",
    "stateIncomeTaxRate",
    "taxableGainsTaxRate",
    "preTaxWithdrawalTaxRate",
    "socialSecurityTaxablePercent",
    "contributionRates.fourOhOneK",
    "contributionRates.traditionalIra",
    "contributionRates.rothIra",
    "contributionRates.brokerage",
    "contributionRates.cash",
    "employerMatch.rate",
    "employerMatch.salaryCap",
  ];

  function isBlank(value) {
    return (
      value === null ||
      value === undefined ||
      value === "" ||
      (typeof value === "string" && value.trim() === "")
    );
  }

  function safeNumber(value) {
    if (isBlank(value)) return null;
    const number = Number(value);
    if (!Number.isFinite(number)) return Number.NaN;
    return number;
  }

  function getPath(profile, path) {
    if (!path) return undefined;
    return path.split(".").reduce((currentValue, segment) => {
      if (currentValue === null || currentValue === undefined) return undefined;
      return currentValue[segment];
    }, profile);
  }

  function addError(errors, field, message) {
    errors.push({ field, message, level: "error" });
  }

  function addWarning(warnings, field, message) {
    warnings.push({ field, message, level: "warning" });
  }

  function checkRequiredNumber(profile, field, errors, label) {
    const value = getPath(profile, field);
    if (isBlank(value)) {
      addError(errors, field, `${label} is required.`);
      return null;
    }

    const parsed = safeNumber(value);
    if (!Number.isFinite(parsed)) {
      addError(errors, field, `${label} must be a valid number.`);
      return null;
    }

    return parsed;
  }

  function validateAgeRelationship(profile, errors) {
    const currentAge = checkRequiredNumber(
      profile,
      "currentAge",
      errors,
      "Current age",
    );
    const targetAge = checkRequiredNumber(
      profile,
      "targetRetirementAge",
      errors,
      "Target retirement age",
    );
    const lifeExpectancy = checkRequiredNumber(
      profile,
      "lifeExpectancy",
      errors,
      "Life expectancy",
    );
    const rmdStartAge = checkRequiredNumber(
      profile,
      "rmdStartAge",
      errors,
      "RMD start age",
    );

    if (currentAge !== null && (currentAge < 0 || currentAge > 120)) {
      addError(errors, "currentAge", "Age cannot exceed 120.");
    }

    if (targetAge !== null && (targetAge < 0 || targetAge > 120)) {
      addError(errors, "targetRetirementAge", "Age cannot exceed 120.");
    }

    if (
      lifeExpectancy !== null &&
      (lifeExpectancy < 0 || lifeExpectancy > 120)
    ) {
      addError(errors, "lifeExpectancy", "Age cannot exceed 120.");
    }

    if (rmdStartAge !== null && (rmdStartAge < 0 || rmdStartAge > 120)) {
      addError(errors, "rmdStartAge", "Age cannot exceed 120.");
    }

    if (currentAge !== null && currentAge < 0) {
      addError(errors, "currentAge", "Current age cannot be negative.");
    }

    if (targetAge !== null && targetAge < 0) {
      addError(
        errors,
        "targetRetirementAge",
        "Target retirement age cannot be negative.",
      );
    }

    if (lifeExpectancy !== null && lifeExpectancy < 0) {
      addError(errors, "lifeExpectancy", "Life expectancy cannot be negative.");
    }

    if (rmdStartAge !== null && rmdStartAge < 0) {
      addError(errors, "rmdStartAge", "RMD start age cannot be negative.");
    }

    if (currentAge !== null && targetAge !== null && targetAge < currentAge) {
      addError(
        errors,
        "targetRetirementAge",
        "Target retirement age cannot be earlier than current age.",
      );
    }

    if (
      targetAge !== null &&
      lifeExpectancy !== null &&
      lifeExpectancy <= targetAge
    ) {
      addError(
        errors,
        "lifeExpectancy",
        "Life expectancy must be later than target retirement age.",
      );
    }

    if (currentAge !== null && currentAge > 120) {
      addError(errors, "currentAge", "Age cannot exceed 120.");
    }
  }

  function validateMonetaryFields(profile, errors) {
    const fields = MONETARY_FIELDS.map((field) => ({
      field,
      value: getPath(profile, field),
    }));

    fields.forEach(({ field, value }) => {
      if (isBlank(value)) return;
      const number = safeNumber(value);
      if (!Number.isFinite(number)) {
        addError(errors, field, "Value must be a valid currency amount.");
        return;
      }
      if (number < 0) {
        addError(errors, field, "Value cannot be negative.");
      }
    });
  }

  function validatePercentFields(profile, errors) {
    const fields = PERCENT_FIELDS.map((field) => ({
      field,
      value: getPath(profile, field),
    }));

    fields.forEach(({ field, value }) => {
      if (isBlank(value)) return;
      const number = safeNumber(value);
      if (!Number.isFinite(number)) {
        addError(errors, field, "Value must be a valid percentage.");
        return;
      }
      if (number < 0 || number > 1) {
        addError(errors, field, "Percentage must be between 0% and 100%.");
      }
    });
  }

  function validateWarnings(profile, warnings) {
    const annualSalary = safeNumber(getPath(profile, "annualSalary")) || 0;
    const otherIncome = safeNumber(getPath(profile, "otherAnnualIncome")) || 0;
    const totalIncome = annualSalary + otherIncome;
    const currentAnnualExpenses =
      safeNumber(getPath(profile, "currentAnnualExpenses")) || 0;
    const retirementSpendingGoal =
      safeNumber(getPath(profile, "retirementAnnualSpendingGoal")) || 0;
    const expectedAnnualReturn =
      safeNumber(getPath(profile, "expectedAnnualReturn")) ?? 0;
    const inflationRate = safeNumber(getPath(profile, "inflationRate")) ?? 0;
    const safeWithdrawalRate =
      safeNumber(getPath(profile, "safeWithdrawalRate")) || 0;
    const targetRetirementAge =
      safeNumber(getPath(profile, "targetRetirementAge")) ?? 0;
    const lifeExpectancy = safeNumber(getPath(profile, "lifeExpectancy")) ?? 0;

    if (currentAnnualExpenses > totalIncome) {
      addWarning(
        warnings,
        "currentAnnualExpenses",
        "Current annual expenses exceed available income.",
      );
    }

    const contributions = [
      "contributionRates.fourOhOneK",
      "contributionRates.traditionalIra",
      "contributionRates.rothIra",
      "contributionRates.brokerage",
      "contributionRates.cash",
    ].reduce((sum, field) => {
      const value = safeNumber(getPath(profile, field)) || 0;
      return sum + value;
    }, 0);

    if (contributions > 1 && totalIncome > 0) {
      addWarning(
        warnings,
        "contributionRates.fourOhOneK",
        "Employee contributions are high relative to available income.",
      );
    }

    if (retirementSpendingGoal === 0) {
      addWarning(
        warnings,
        "retirementAnnualSpendingGoal",
        "Retirement spending goal is zero.",
      );
    }

    if (expectedAnnualReturn < inflationRate) {
      addWarning(
        warnings,
        "expectedAnnualReturn",
        "Expected return is below inflation, which reduces real purchasing power.",
      );
    }

    if (safeWithdrawalRate > 0.1) {
      addWarning(
        warnings,
        "safeWithdrawalRate",
        "Safe withdrawal rate is unusually high for a long retirement horizon.",
      );
    }

    if (
      lifeExpectancy > 0 &&
      targetRetirementAge > 0 &&
      lifeExpectancy - targetRetirementAge <= 5
    ) {
      addWarning(
        warnings,
        "lifeExpectancy",
        "Life expectancy is close to retirement age, which leaves limited planning horizon.",
      );
    }
  }

  function validatePlanSetup(profile) {
    const blockingErrors = [];
    const warnings = [];

    if (!profile || typeof profile !== "object") {
      addError(blockingErrors, "profile", "Plan setup is required.");
      return { blockingErrors, warnings, isValid: false };
    }

    REQUIRED_FIELDS.forEach((field) => {
      const value = getPath(profile, field);
      if (isBlank(value)) {
        const label =
          field === "currentAge"
            ? "Current age"
            : field === "targetRetirementAge"
              ? "Target retirement age"
              : field === "lifeExpectancy"
                ? "Life expectancy"
                : field === "expectedAnnualReturn"
                  ? "Expected annual return"
                  : field === "inflationRate"
                    ? "Inflation rate"
                    : "Retirement spending goal";
        addError(blockingErrors, field, `${label} is required.`);
      }
    });

    validateAgeRelationship(profile, blockingErrors);
    validateMonetaryFields(profile, blockingErrors);
    validatePercentFields(profile, blockingErrors);
    validateWarnings(profile, warnings);

    return {
      blockingErrors,
      warnings,
      isValid: blockingErrors.length === 0,
    };
  }

  function lastValidProjectionState(profile, lastValidProjection) {
    const validation = validatePlanSetup(profile);
    return {
      isValid: validation.blockingErrors.length === 0,
      lastValidProjection:
        validation.blockingErrors.length > 0
          ? lastValidProjection || null
          : null,
      blockingErrors: validation.blockingErrors,
      warnings: validation.warnings,
    };
  }

  function isFieldBlockingError(fieldName, blockingErrors) {
    return (
      Array.isArray(blockingErrors) &&
      blockingErrors.some((entry) => entry.field === fieldName)
    );
  }

  const api = {
    validatePlanSetup,
    lastValidProjectionState,
    isFieldBlockingError,
  };

  if (typeof window !== "undefined") {
    globalScope.PlanSetupValidation = api;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
