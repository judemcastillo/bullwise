# Daily swing symmetric regime development v1

Frozen on 2026-08-21 after the fixed SPY benchmark-risk filter failed its train-only development gates and before generating any short outcomes.

Development ID: `daily-swing-symmetric-regime-development-v1`

Protocol version: `1.0.0`

Validation and test features and labels remain sealed.

## Why this is next

The original strategy only traded long. It earned `-0.02364269R` per train episode with a `0.93482115` profit factor. The subsequent SPY filter still earned `-0.02027695R`, passed only `2/9` gates, and was rejected.

The next experiment tests a materially different economic hypothesis: the same price-action engine may work symmetrically if it can participate in bearish ETF regimes instead of merely avoiding them. This is one fixed strategy candidate, not a search over short rules.

## Frozen candidate

Use the existing `daily-swing-v1-draft` engine across the frozen 127 standard, unleveraged ETFs:

- Long when the instrument trend is bullish and momentum is not bearish, using the unchanged breakout and pullback plans.
- Short when the instrument trend is bearish and momentum is not bullish, using the engine's existing breakdown and resistance-pullback plans.
- Set `allowShortSetups` to `true`.
- Do not apply a SPY filter and do not use an AI model.

Entry zones, triggers, stops, profit targets, maximum holding period, stop-first ambiguity policy, the liquidity gate, transaction costs, slippage, and position risk remain unchanged.

## Short-specific cost stress

Every triggered short must include the existing trading costs plus a frozen `5%` annual borrow charge. Accrue it on short entry notional using elapsed calendar days divided by 365, with a minimum of one charged day, and subtract it before calculating utility and profit factor.

This is a conservative modeling assumption, not proof of historical borrow availability. OHLCV data cannot show whether shares were available to borrow. Even if this experiment passes, live use would still require broker-side shortability and borrow-rate checks.

## Frozen processing order

The existing combined dataset contains long setups only, so it cannot simply be relabeled. Recompute exhaustive long and short setups from the frozen base and expansion histories, apply the unchanged signal-time liquidity gate, then select the first eligible episode by `[instrumentId, direction]` independently inside each train walk-forward partition.

Only episodes resolving before 2023 may contribute outcomes. Do not calculate or inspect validation or test features or labels.

## Development gates

The single candidate must pass all 12 gates after the short-borrow charge:

- At least 1,000 episodes overall and 250 short episodes.
- At least 200 episodes and 40 short episodes in every fold.
- Overall average utility at least `+0.05R` and non-negative average utility in every fold.
- Overall profit factor at least `1.10` and at least `1.00` in every fold.
- Both the long and short direction cohorts must have non-negative average utility.
- Overall average-utility improvement over the frozen long-only baseline at least `+0.05R`, with positive improvement in all three folds.
- Difference between best and worst fold average utility no greater than `0.20R`.

A pass only permits freezing the implementation for a separately preregistered one-shot validation comparison. It does not authorize validation access, product signals, or live trading. A failure rejects this exact candidate and requires a research stop; do not tune it on the same train evidence.

## Frozen inputs

- Base history: `artifacts/analysis/analysis-broad-history.json`, SHA-256 `a42ea177b110336cb905322370549deefa9a1fd54d620fa94b443757b6414e5f`
- Expansion history: `artifacts/analysis/analysis-broad-v2-expansion-history.json`, SHA-256 `7262c1a32e3cac8651c57daee97812c72edd6d39036e310e4259b25b37559505`
- Rejected SPY-filter report: `artifacts/analysis/analysis-broad-strategy-redesign-development-v1.json`, SHA-256 `2b82ed55f49bb3b0ff52146a2914bf306ae1f542a1c50db0ba3e7c0e88a698c8`

## Prohibitions

Do not reuse or tune the rejected SPY filter. Do not tune indicators, lookbacks, thresholds, setup geometry, or direction mechanics. Do not change the short-borrow stress after seeing outcomes. Do not add a model, rank symbols, remove weak symbols, or report instrument-level results. Do not open validation or test features or labels.

## Authorized next step

Implement the train-only exhaustive symmetric setup builder and evaluator with synthetic fixtures. The implementation must verify source hashes, refuse overwrite, include the frozen short-borrow charge, and emit only aggregate cohorts. Do not run the real train scan until those guards pass targeted tests, lint, and type checking.
