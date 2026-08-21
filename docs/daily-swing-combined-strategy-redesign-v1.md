# Daily swing combined strategy redesign v1

Frozen on 2026-08-21 after the train-only strategy and target audit rejected every direction-by-setup cohort and before implementing or evaluating a redesigned strategy.

Development ID: `daily-swing-benchmark-risk-filter-development-v1`

Protocol version: `1.0.0`

Frozen result motivating the redesign:

- Strategy audit SHA-256: `dc0b9d9c45352bc941f8402b2a17a9b764823f41a076b838806393676f659e27`
- Overall average utility: `-0.02364269R`
- Overall profit factor: `0.93482115`
- Nominated direction-by-setup cohorts: `0`
- Target compression: not flagged

Validation and test features and labels remain sealed.

## Hypothesis

The existing instrument-level bullish trend test did not protect long setups during broad market weakness. Keep the entire `daily-swing-v1-draft` trade plan unchanged, but accept a setup only when the latest completed SPY bar is above its 200-session simple moving average and SPY's 20-session return is positive.

This is the project's existing simple-momentum baseline definition reused as a market-risk gate. It is one fixed candidate, not a search over benchmarks, averages, lookbacks, or thresholds. Missing or insufficient SPY history rejects the setup.

## Frozen processing order

For each existing base and expansion setup:

1. Generate the unchanged v1 long setup.
2. Apply the unchanged signal-time liquidity gate.
3. Apply the completed-bar-only SPY risk filter.
4. Reselect the first eligible episode independently inside each frozen train walk-forward partition.

The filter must run before episode selection. Filtering the already selected 2,696 episodes would be incorrect because a later eligible setup might have been suppressed by an earlier rejected setup.

Only train rows resolving before 2023 may contribute outcomes. Compute SPY conditions using bars at or before each setup timestamp. Do not calculate validation or test features or inspect their labels.

## Unchanged mechanics

Do not alter the instrument trend or momentum assessment, setup construction, entry, stop, targets, maximum holding period, stop-first policy, transaction costs, slippage, position risk, or signal-time liquidity rule. Do not add short setups or a model.

## Development gates

The single candidate must pass all nine gates:

- At least 750 evaluation episodes overall and 150 in every fold.
- Overall average utility at least `+0.05R` and non-negative in every fold.
- Overall profit factor at least `1.10` and at least `1.00` in every fold.
- Overall average-utility improvement over the unfiltered strategy at least `+0.05R` and positive improvement in all three folds.
- Difference between best and worst fold average utility no greater than `0.20R`.

A pass permits freezing the implementation for a separately preregistered one-shot validation comparison. It does not authorize validation, product signals, or live trading. A failure rejects this exact filter; do not tune and rerun alternative SPY conditions on the same train evidence.

## Frozen inputs

- Combined dataset: `artifacts/analysis/analysis-broad-combined-dataset-v3.json`, SHA-256 `3ce82ae982ef3ac39df72fc3205788536e907cb187db061995c53730ab9b2030`
- Base history: `artifacts/analysis/analysis-broad-history.json`, SHA-256 `a42ea177b110336cb905322370549deefa9a1fd54d620fa94b443757b6414e5f`
- Expansion history: `artifacts/analysis/analysis-broad-v2-expansion-history.json`, SHA-256 `7262c1a32e3cac8651c57daee97812c72edd6d39036e310e4259b25b37559505`

## Prohibitions

Do not test another benchmark, moving average, return window, threshold, feature subset, or model. Do not change trade mechanics. Do not rank symbols. Do not open validation or test features or labels.

## Authorized next step

Implement the fixed SPY-filtered train-only evaluator with synthetic fixtures. Do not run the real development evaluation until the implementation is verified.
