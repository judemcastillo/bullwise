# ETF cross-sectional momentum development v1 result

Completed once on 2026-08-21 under the frozen `etf-cross-sectional-momentum-development-v1` protocol.

This is train-only development evidence. It is not validation evidence and does not authorize product signals or live trading.

## Artifact

- Report: `artifacts/analysis/etf-cross-sectional-momentum-development-v1.json`
- SHA-256: `1e476977c19913731446490d7c19b23df2a81c116732b657cbb40142ae15dde9`
- Decision: `reject_cross_sectional_momentum_strategy`
- Gates passed: `11/13`
- Validation features and labels read: `false`
- Test features and labels read: `false`

The report is locally preserved under the existing generated-analysis ignore rule. Do not replace, regenerate, or commit the JSON artifact.

## Development evidence

The strategy produced a `43.61029307%` total net return, `12.84154163%` annualized return, `0.73584009` monthly Sharpe, `32.10338469%` daily maximum drawdown, and `429.35918784%` annualized one-way turnover across 36 monthly holding periods.

All three calendar years were positive: `20.28471516%` in 2020, `12.29485694%` in 2021, and `6.32007105%` in 2022. The minimum eligible candidate count in any sleeve decision was 16, and the strategy had at least one invested sleeve in all 36 months.

The doubled-cost stress produced `12.40629423%` annualized return, `0.71474406` monthly Sharpe, and `32.13093509%` maximum drawdown.

The static four-sleeve benchmark returned `3.07068077%` annualized with `0.25805119` monthly Sharpe and `29.66525876%` maximum drawdown. The report-only 99% SPY benchmark returned `7.34142281%` annualized with `0.43981291` monthly Sharpe and `33.4863618%` maximum drawdown.

## Failed gates and decision

Only the two absolute drawdown gates failed:

- Base maximum drawdown was `32.10338469%`; the frozen maximum was `20%`.
- Stress maximum drawdown was `32.13093509%`; the frozen maximum was `22%`.

The strong return, Sharpe, calendar-year, benchmark-improvement, cost-stress, coverage, and turnover results are useful evidence that medium-horizon ETF momentum merits separate research. They do not override the preregistered all-gates requirement. The exact v1 strategy is rejected and must not proceed to validation.

## Research boundary

Do not lower the drawdown gates, change the four sleeves, tune the 12-minus-1 lookback, alter the cash rule, or rerun variants on the consumed pre-2023 development outcomes.

The already-declared 2023–2024 validation period and 2025-plus sealed test period must remain sealed. Neither may be relabeled as development data for a risk-control variant.

A momentum v2 requires a fresh, outcome-blind development source that excludes all previously consumed research and confirmation instruments. Before retrieving or calculating its outcomes, freeze:

1. The exact non-overlapping universe, point-in-time eligibility limitations, coverage rules, and development period.
2. One literature-supported risk-control mechanism with every parameter fixed; do not scan alternative volatility targets, regime filters, exposure caps, or drawdown thresholds.
3. Formation, ranking, allocation, execution, cost, missing-data, and portfolio-accounting rules.
4. Absolute and relative performance, drawdown, turnover, stress, and coverage gates.
5. Source checksums, aggregate-only reporting, no-overwrite behavior, and new validation/holdout boundaries.

The source and protocol direction is now fixed in `docs/etf-risk-controlled-momentum-v2-source-and-protocol-design.md`. Its metadata-only 48-ETF manifest is frozen with SHA-256 `2a8fd2e03aab94002edf3e0b4db0ea034f4b328312db46cfb6393cd2cc315464`. It does not authorize market-data retrieval, outcome calculation, or access to any existing validation or test split.
