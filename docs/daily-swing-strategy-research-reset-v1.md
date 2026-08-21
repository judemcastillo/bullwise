# Daily swing strategy research reset v1

Recorded on 2026-08-21 after the frozen symmetric long/short experiment failed its train-only economic gates. This document closes a failed strategy family and nominates a new research question. It is not a strategy preregistration and does not authorize outcome calculation, validation access, product signals, or trading.

## What the evidence now says

The current signal family has failed in every tested form:

- Original long-only: `-0.02364269R` average utility and `0.93482115` profit factor.
- Fixed SPY-filtered long-only: `-0.02027695R` and `0.94238951` profit factor; `2/9` gates passed.
- Symmetric long/short: `-0.04862554R` and `0.87656265` profit factor; `5/12` gates passed.
- Symmetric short leg: `-0.08314822R` and `0.80974406` profit factor after the frozen borrow charge.

The model program also failed to rank these setup outcomes reliably. More model complexity cannot manufacture an economic edge in the same labels.

## Closed strategy family

For this research cycle, close the individual-instrument daily breakout, pullback, and breakdown plans with their current entry zones, ATR/structure stops, two fixed targets, and 20-bar maximum holding period.

Do not continue by tuning:

- SPY or another benchmark filter;
- trend, momentum, volume, liquidity, or price-action thresholds;
- entry, stop, target, expiry, or holding-period geometry;
- long/short direction rules or borrow cost;
- model family, features, cutoff, or symbol selection.

Those would be variations of the rejected hypothesis tested on already-consumed train evidence.

## Evidence for a materially different direction

Medium-horizon momentum is a more defensible research premise than another daily setup filter. Jegadeesh and Titman documented positive cross-sectional winner-minus-loser returns over 3- to 12-month holding periods. Moskowitz, Ooi, and Pedersen documented persistence over one to 12 months across diversified futures markets.

The evidence is not conclusive. Later work argues that time-series momentum predictability is weak and that volatility scaling can explain much of the reported alpha. Independent analysis of simple tactical-allocation rules also recommends bootstrap testing and caution rather than treating a favorable historical curve as proof.

This mixed evidence supports one controlled experiment, not an assumption that momentum will be profitable in Bullwise's ETF universe.

Primary references:

- Jegadeesh and Titman, “Returns to Buying Winners and Selling Losers” (1993): https://doi.org/10.1111/j.1540-6261.1993.tb04702.x
- Moskowitz, Ooi, and Pedersen, “Time Series Momentum” (2012): https://pages.stern.nyu.edu/~lpederse/papers/TimeSeriesMomentum.pdf
- Huang et al., “Time Series Momentum: Is It There?” (2020): https://doi.org/10.1016/j.jfineco.2019.08.004
- Kim, Tse, and Wald, “Time Series Momentum and Volatility Scaling” (2016): https://doi.org/10.1016/j.finmar.2016.05.003
- Marmi et al., “A Quantitative Approach to Faber's Tactical Asset Allocation” (2012): https://doi.org/10.2139/ssrn.1476225

## Nominated research question

Can a deterministic, long/cash, monthly cross-sectional momentum portfolio across liquid standard ETFs produce positive net portfolio performance and acceptable drawdown?

This is materially different from the rejected strategy:

- portfolio allocation rather than independent setup labels;
- medium/long holding period rather than 5–20 trading days;
- relative and absolute return persistence rather than chart-pattern geometry;
- scheduled monthly decisions rather than signals on every daily bar;
- long/cash only, avoiding historical short-availability assumptions;
- portfolio-level turnover, exposure, return, and drawdown accounting from the start.

Alpaca's `adjustment=all` includes split, cash-dividend, and spin-off adjustments, making the frozen adjusted histories suitable in principle for return ranking. Survivorship bias, overlapping ETFs, category concentration, and incomplete point-in-time fund availability remain material limitations.

## Required work before outcomes

Freeze exactly one versioned protocol before calculating any momentum return or portfolio result. It must specify:

1. An outcome-blind ETF universe and category-concentration policy.
2. One fixed formation return, skip period, rebalance schedule, selection count, and cash rule.
3. Next-session execution, transaction costs, slippage, turnover, and missing-data behavior.
4. Shared-capital portfolio accounting with no leverage or shorts.
5. Train-only calendar folds, benchmarks, economic gates, robustness gates, and report schema.
6. Source checksums, no-overwrite behavior, aggregate-only reporting, and sealed validation/test safeguards.
7. Synthetic no-future-data, rebalance, ranking, cost, and portfolio-accounting tests.

Do not add AI to the first experiment. A deterministic baseline must demonstrate a stable economic edge before an AI model is allowed to rank allocations or adjust risk.

## Authorized next step

The exact cross-sectional ETF momentum experiment is now frozen in `docs/etf-cross-sectional-momentum-development-v1.md` and `ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_PROTOCOL`. Its four sleeves, 12-minus-1-month signal, monthly schedule, long/cash allocation, execution, costs, benchmarks, 13 gates, source hashes, output, and sealed-data rules must not change after outcomes are observed.

The deterministic evaluator and guarded report command were implemented with synthetic guards before real outcomes were calculated. The exact one-shot train-only command then completed on 2026-08-21. It produced a `12.84154163%` annualized return and `0.73584009` monthly Sharpe but failed both frozen drawdown gates with a `32.10338469%` base maximum drawdown and `32.13093509%` stressed maximum drawdown. The exact strategy is rejected after passing 11 of 13 gates.

The preserved result, checksum, and next research boundary are recorded in `docs/etf-cross-sectional-momentum-development-v1-result.md`. Existing 2023–2024 validation and 2025-plus test periods remain sealed. A risk-controlled momentum v2 requires a separately frozen, non-overlapping development source and protocol before any new outcomes are calculated.
