# Wealth Map Recommendations Page Wireframe

```text
+--------------------------------------------------------------------------------+
| Recommendations                                                               |
| Suggested next actions based on your current inputs                           |
+--------------------------------------------------------------------------------+
| TOP ACTIONS                                                                    |
|                                                                                |
| 01  HIGH PRIORITY     Increase annual savings                                 |
|     Trigger: savings rate is below the target threshold.                      |
|     Current metric: 20.0% savings rate.                                       |
|     Suggested action: increase savings by $200 per month.                    |
|     Effect: qualitative; may reduce the projected funding gap.                |
|                                                                                |
| 02  MEDIUM PRIORITY   Review retirement spending goal                          |
|     Trigger: spending goal is high relative to projected assets.              |
|     Current metric: $75,000 annual retirement spending goal.                  |
|     Suggested action: compare a lower spending scenario.                      |
|     Effect: qualitative; may improve readiness.                               |
|                                                                                |
| 03  INFORMATIONAL     Review tax diversification                              |
|     Trigger: most investable assets are tax-deferred.                         |
|     Current metric: tax-deferred share of investable assets.                   |
|     Suggested action: learn about account withdrawal sequencing.               |
|     Effect: not modeled in prototype.                                         |
|                                                                                |
| Tax, Roth conversion, Social Security, IRMAA, and RMD suggestions are          |
| educational future-feature examples only; no related calculation is performed.|
+--------------------------------------------------------------------------------+
```

## Interactions

- Display zero to three recommendations ordered by priority.
- Each recommendation shows its trigger, metric, rationale, and effect type.
- Recommendations regenerate when editable inputs change.
- Do not invent tax savings, conversion amounts, benefits, IRMAA costs, or RMDs.
