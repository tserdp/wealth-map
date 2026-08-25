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
| Target retirement age     65         | Projected assets at retirement  $1,850,000 |
| Expected retirement age    63        | Required at retirement for life expectancy $1,875,000 |
| Years to target             20       | Funding gap                    $25,000 |
+--------------------------------------+-----------------------------------------+
| SPENDING CAPACITY                                                              |
| Safe Spending: sustainable through life expectancy              $74,000        |
| Retirement spending goal                                       $75,000        |
| Projected IRMAA (cumulative through life expectancy)             $0          |
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
- Projected Assets is the after-tax target-year portfolio from the Timeline; Required Assets is the minimum target-year portfolio that remains solvent through life expectancy under the same Timeline engine.
- A plan that depletes before life expectancy must not appear fully funded because of a target-date-only snapshot.
- If the target is not reached by life expectancy, show `Beyond life expectancy`.
- Never describe the score as a probability of success.
- Provide score context on demand through the information control: it summarizes funding progress, savings, retirement timing, and Timeline sustainability; it updates with assumptions and is a planning aid rather than a guarantee.
