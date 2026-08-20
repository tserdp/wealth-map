# Wealth Map Retirement Readiness Page Wireframe

```text
+--------------------------------------------------------------------------------+
| Retirement Readiness                                           [On Track]      |
| Your current retirement projection                                           |
+--------------------------------------------------------------------------------+
|                    RETIREMENT HEALTH SCORE                                   |
|                              92 / 100                                         |
|                              ON TRACK                                          |
|                 Heuristic estimate, not a probability                         |
+--------------------------------------+-----------------------------------------+
| RETIREMENT TIMING                    | FUNDING POSITION                       |
| Target retirement age     65         | Projected assets at target  $1,850,000 |
| Expected retirement age    63        | Required retirement assets   $1,875,000 |
| Years to target             20       | Funding gap                    $25,000 |
+--------------------------------------+-----------------------------------------+
| SPENDING CAPACITY                                                              |
| Safe annual spending estimate                                  $74,000        |
| Retirement spending goal                                       $75,000        |
|                                                                                |
| WHAT DRIVES THIS RESULT?                                                       |
| [x] Current investable assets     [x] Annual savings                           |
| [x] Expected return               [x] Retirement spending goal                 |
| [x] Target retirement age         [x] Safe withdrawal rate                     |
|                                                                                |
| Assumptions: real-dollar projection, end-of-year contributions, 4% SWR.       |
| Not modeled: tax, Roth conversions, Social Security, IRMAA, RMDs.              |
+--------------------------------------------------------------------------------+
```

## Interactions

- Every metric updates when inputs change on another page.
- Show an unambiguous funding gap or surplus.
- If the target is not reached by life expectancy, show `Beyond life expectancy`.
- Never describe the score as a probability of success.
