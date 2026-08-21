# ETF cross-sectional momentum development v1

Frozen on 2026-08-21 after closing the failed daily setup family and before calculating any real momentum feature, selection, return, or portfolio outcome.

Development ID: `etf-cross-sectional-momentum-development-v1`

Protocol version: `1.0.0`

This is a train-only deterministic strategy experiment. Validation and test features and labels remain sealed.

## Hypothesis

A monthly portfolio that holds the strongest positive 12-minus-1-month ETF in each of four outcome-blind sleeves may capture medium-horizon return persistence while controlling category concentration. A sleeve without a positive candidate remains in cash.

This is one fixed candidate. It changes the source of edge, decision schedule, holding period, and portfolio construction rather than modifying the rejected breakout, pullback, or breakdown plans. It has no AI model, stop-loss, take-profit, leverage, or short position.

## Frozen universe and sleeves

Use the 127 coverage-eligible standard, unleveraged ETFs from the frozen base and expansion histories. Preserve the prior outcome-blind coverage exclusions.

Every frozen source category belongs to exactly one sleeve. Each sleeve targets 24.75%, leaving a 1% operational cash reserve so costs cannot create unintended leverage:

- U.S. broad/style/factor: base `us_style` and `us_factor_and_income`.
- U.S. sector/real-asset equity: base `industry_and_real_asset_equity`; expansion `us_sector_and_industry` and `real_asset_and_resource_equity`.
- International equity: base `international_regional` and `international_country`; expansion `international_and_country`.
- Fixed income/preferred: base `fixed_income_and_preferred`; expansion `fixed_income`.

Do not remove, add, or reassign symbols based on prior strategy outcomes.

## Signal and selection

The signal session is the last completed SPY trading session of each calendar month.

For each candidate with at least 253 completed adjusted daily observations through that session, calculate:

```text
formation return = adjusted close[t - 21] / adjusted close[t - 252] - 1
```

This is the only ranking feature. A candidate must have a formation return strictly above zero and pass the existing completed-signal-session liquidity rule: at least 19 valid observations in the latest 20 sessions, median adjusted-close times reported volume of at least `$10 million`, and the planned 24.75% target notional no greater than 1% of that median dollar volume. Missing liquidity data makes the candidate ineligible.

Within each sleeve, select the eligible candidate with the highest return. Break an exact tie by display symbol ascending. A missing signal-session close makes that candidate ineligible; do not substitute another date.

The first formation month is December 2019 and the last is November 2022, producing 36 train-only monthly holding periods through the end of 2022. The December 2022 formation decision is not calculated because its execution would cross the train boundary.

## Portfolio execution

- Start with `$100,000` cash and allow fractional units.
- Each eligible sleeve winner targets exactly 24.75% of current equity; an ineligible sleeve remains in cash.
- Maximum four positions, 99% gross exposure, a 1% operational cash reserve, no leverage, and no shorts.
- Execute at the next SPY session's adjusted open after the signal, selling before buying.
- Rebalance an unchanged winner back to exactly 24.75%.
- Missing execution data for a selected or held ETF fails the experiment; do not fall back to another symbol or price.
- Value positions daily at adjusted close and keep residual cash at a frozen 0% return.
- Liquidate at the last adjusted close before 2023.

Base costs are 2 bps per transaction side plus 3 bps slippage per fill. The stress scenario doubles both to 4 and 6 bps. One-way monthly turnover is half the absolute weight change across all risky assets and cash; annualize its monthly mean by 12.

## Benchmarks

Report a 99% adjusted SPY buy-and-hold allocation with the same 1% operational cash reserve and the same initial and final base costs, but do not use it as a pass gate.

The gate benchmark is a static four-sleeve portfolio: allocate 24.75% to each sleeve at the first execution, equally divide each sleeve among all its coverage-eligible members, retain 1% operational cash, and hold until final liquidation. Apply the same initial and final base costs. This asks whether momentum selection adds value beyond the same frozen category exposure.

## Metrics

Build a daily shared-capital equity curve. Report net total and annualized return, daily maximum drawdown, monthly Sharpe, calendar-year returns, time invested, turnover, and sleeve/source aggregate selection counts. Monthly Sharpe is `sqrt(12) × mean monthly return / sample standard deviation`, with a zero cash rate.

Do not emit selected symbols or instrument-level returns.

## Development gates

The candidate must pass all 13 gates:

1. Exactly 36 monthly holding periods.
2. At least 10 candidates in every sleeve decision.
3. At least 18 months with any investment.
4. Base net annualized return at least `5%`.
5. Base monthly Sharpe at least `0.50`.
6. Base maximum drawdown no greater than `20%`.
7. At least two positive calendar years.
8. Worst calendar-year return at least `-10%`.
9. Annualized return no worse than the static-sleeve benchmark.
10. Monthly Sharpe no worse than the static-sleeve benchmark.
11. Stressed net annualized return at least `3%`.
12. Stressed maximum drawdown no greater than `22%`.
13. Base annualized one-way turnover no greater than `800%`.

A pass permits freezing this implementation for a separately preregistered one-shot validation evaluation. It does not authorize validation access, product signals, or trading. A failure rejects the exact strategy; do not tune the sleeves, formation window, skip period, selection rule, cash rule, costs, or gates on the same train evidence.

## Frozen inputs

- Base history: `artifacts/analysis/analysis-broad-history.json`, SHA-256 `a42ea177b110336cb905322370549deefa9a1fd54d620fa94b443757b6414e5f`
- Expansion history: `artifacts/analysis/analysis-broad-v2-expansion-history.json`, SHA-256 `7262c1a32e3cac8651c57daee97812c72edd6d39036e310e4259b25b37559505`
- Rejected symmetric report: `artifacts/analysis/analysis-broad-symmetric-regime-development-v1.json`, SHA-256 `e9b28bf7e7c72cf985783eff23559a87a21d505730db082ad63693006a120fa8`

Output: `artifacts/analysis/etf-cross-sectional-momentum-development-v1.json`, no overwrite.

## Prohibitions

Do not calculate real outcomes until the deterministic evaluator has synthetic tests for no-future-data formation returns, month-end scheduling, sleeve membership, ranking and tie breaking, cash allocation, next-session fills, costs, turnover, daily equity, benchmarks, gates, source hashes, no overwrite, and sealed boundaries.

Do not add AI, volatility scaling, stops, targets, shorts, leverage, symbol exclusions, or instrument-level reporting. Do not open validation or test features or labels.

## Implementation checkpoint

Before the one-shot run, the deterministic evaluator and guarded report command were implemented. Synthetic fixtures covered the frozen month-end schedule, no-future-data formation calculation, category-to-sleeve membership, ranking and tie breaking, shared-capital evaluation, cost stress, aggregate-only output, source checksum rejection, sealed-boundary declarations, and no-overwrite report writing. No real momentum outcome had been calculated at that checkpoint.

## Authorized one-shot step — consumed

The authorized `npm run develop:etf-cross-sectional-momentum` run completed once on 2026-08-21. It produced `artifacts/analysis/etf-cross-sectional-momentum-development-v1.json` with SHA-256 `1e476977c19913731446490d7c19b23df2a81c116732b657cbb40142ae15dde9`.

The candidate passed 11 of 13 gates but failed both absolute drawdown gates: base maximum drawdown was `32.10338469%` against a `20%` maximum, and stressed maximum drawdown was `32.13093509%` against a `22%` maximum. The formal decision is `reject_cross_sectional_momentum_strategy`.

Do not rerun or tune this exact candidate. Validation and test data remain sealed. The complete aggregate result and next research boundary are recorded in `docs/etf-cross-sectional-momentum-development-v1-result.md`.
