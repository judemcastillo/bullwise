# Daily swing combined strategy and target audit v1

Frozen on 2026-08-20 after the combined train diagnostic failed all five stability and drift checks and before calculating strategy or target audit results.

Audit ID: `daily-swing-combined-strategy-target-audit-v1`

Audit version: `1.0.0`

Frozen inputs:

- Train-only fold dataset SHA-256: `6bc63cb4559b2334708110fcd15719eb52d7f0bb9100b8f0032e4e42a1e0f9c9`
- Rejected train diagnostic SHA-256: `c3afd8fffa6c1f02e26902cfaffdfdec8b12965c8ba7d3990aeca59c5faa67ae`

Use only the 2,696 non-overlapping train evaluation episodes from 2020, 2021, and 2022. Expanding fit partitions are excluded so older episodes are not counted repeatedly. Validation and test features and labels remain sealed.

## Purpose

The rejected classifier does not justify immediately adopting another model or strategy. This audit asks two narrower questions:

1. Does a predefined direction-by-setup cohort have stable positive net utility across all three train evaluation years?
2. Does the binary `actionableSuccess` target hide a material share of profitable outcomes between `0R` and `+0.5R`?

`actionableSuccess` is not independent of utility: it must equal `setupUtilityR >= +0.5R`. Utility is net R after the frozen execution costs; untriggered setups have `0R`. The audit must fail if that identity does not hold.

## Frozen calculations

Report loss (`<0R`), flat (`0R`), modest-gain (`>0R` and `<+0.5R`), and actionable-gain (`>=+0.5R`) rates. Also report average and median utility, gross positive and negative utility, and profit factor.

Use the predefined main effects of evaluation fold, source scan, direction, setup type, trend regime, and volatility regime. The only descriptive interactions are direction by setup type, setup type by trend regime, and trend regime by volatility regime. Require at least 100 rows for a reported cohort. Do not produce instrument or symbol results.

Measure how many positive outcomes and how much positive utility fall below the `+0.5R` actionable threshold. Flag target compression when these modest gains contribute at least 25% of all positive utility. The flag can motivate a separately frozen target hypothesis but cannot authorize model fitting.

## Strategy nomination boundary

Only a direction-by-setup cohort may be nominated. It must have:

- At least 300 total rows and 50 rows in every evaluation fold.
- Overall average utility of at least `+0.05R`.
- Non-negative average utility in every fold.
- No more than `0.15R` between its best and worst fold average utility.
- Overall profit factor of at least `1.10` and fold profit factor of at least `1.00` in every fold.

Passing is exploratory train-only evidence. It permits drafting a separate strategy experiment; it does not establish profitability, change the product strategy, authorize model fitting, or open validation.

If no cohort passes, stop adding model complexity and redesign entry, exit, risk, or regime logic under a new train-only protocol.

## Prohibitions

Do not search thresholds, indicators, feature subsets, or model families. Do not alter entries, stops, targets, holding periods, or cost assumptions. Do not rank symbols. Do not open validation or test data.

## Authorized next step

Implement the deterministic audit and no-overwrite report writer with synthetic fixtures. Do not run the real audit until that implementation is verified.
