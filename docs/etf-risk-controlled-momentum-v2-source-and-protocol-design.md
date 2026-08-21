# ETF risk-controlled momentum v2 source and protocol design

Recorded on 2026-08-21 after `etf-cross-sectional-momentum-development-v1` was rejected for failing both absolute drawdown gates. This document fixes the research direction and clean-data boundary. It is not yet an executable preregistration and does not authorize price retrieval or outcome calculation.

## Research question

Can the same simple cross-sectional ETF momentum premise retain useful net return while a single ex-ante volatility overlay materially reduces portfolio drawdown on fresh instruments and a temporally non-overlapping development period?

This is a risk-allocation experiment, not an AI experiment. An AI model remains out of scope until a deterministic strategy passes development and a separately registered validation.

## Why this candidate

The rejected v1 produced `12.84154163%` annualized return and `0.73584009` monthly Sharpe but a `32.10338469%` maximum drawdown. It passed every frozen gate except base and stressed maximum drawdown. This supports preserving the momentum hypothesis while changing the risk-allocation mechanism on clean data; it does not justify tuning v1 on its consumed outcomes.

Moreira and Muir report that reducing exposure when volatility is high can improve factor-portfolio Sharpe ratios, including momentum. The exact implementation below uses one common, capped volatility target rather than searching a parameter grid. Marmi et al. caution that favorable tactical-allocation backtests require robust evaluation, which motivates the new source, fixed comparator, stress costs, and all-gates decision rule.

Primary references:

- Moreira and Muir, “Volatility Managed Portfolios”: https://doi.org/10.3386/w22208
- Faber, “A Quantitative Approach to Tactical Asset Allocation”: https://ssrn.com/abstract=962461
- Marmi et al., “A Quantitative Approach to Faber's Tactical Asset Allocation”: https://doi.org/10.2139/ssrn.1476225

## Clean development source

The v2 source must be frozen in two stages.

### Stage 1 — metadata-only universe freeze

Before retrieving any price or volume history, create and hash an exact manifest of 48 ETFs: 12 in each of the existing four economic sleeves.

Every candidate must:

- be a U.S.-listed standard, unleveraged, non-inverse ETF;
- have an issuer-reported inception date on or before `2007-12-31`;
- have a documented investment objective that maps to exactly one sleeve;
- be active and supported by the selected historical-data provider at freeze time;
- not be SPY;
- not appear in any Bullwise development, confirmation, validation, holdout, base, or expansion universe used before this manifest is frozen.

Do not use historical returns, volatility, drawdown, volume, spread, assets under management, or strategy outcomes to choose candidates. The exact manifest is the selection: candidates were chosen to cover distinct objective-defined subsegments within each sleeve using only issuer, inception, objective, current security profile, prior-use exclusion, and provider-support metadata. There is no performance-ranked candidate pool and no substitution after price data become available.

The manifest must record symbol, issuer, inception date, objective source, sleeve, security profile, exclusion-set version, and a SHA-256 checksum. Manual objective classification must be reviewed for exact one-sleeve membership before any market-data command exists.

This present-day surviving-fund design has survivorship bias and is not point-in-time investable-universe evidence. That limitation must remain in every report.

### Frozen metadata manifest

The metadata-only freeze completed on 2026-08-21 before any OHLCV request:

- Machine-readable manifest: `lib/analysis/risk-controlled-momentum-v2-universe.ts`
- Excluded prior symbols: 180
- Exclusion SHA-256: `3bc68c5793fb253653e5cdb1d5d55be114c164da1d0adc6b147d202e22c0a162`
- Manifest SHA-256: `2a8fd2e03aab94002edf3e0b4db0ea034f4b328312db46cfb6393cd2cc315464`
- Metadata verification date: `2026-08-21`
- Alpaca asset metadata: all 48 are `active`, `tradable`, and classed as `us_equity`

The four exact sleeves are:

- U.S. broad/style/factor: `IJK`, `IJJ`, `IJT`, `IJS`, `OEF`, `ISCG`, `ISCV`, `FVD`, `DTD`, `DLN`, `DON`, `DES`.
- U.S. sector/real-asset equity: `IYC`, `IYK`, `IYE`, `IYF`, `IYH`, `IYJ`, `IYM`, `IYW`, `IDU`, `IAT`, `IGE`, `ICF`.
- International equity: `EWK`, `EWO`, `EWQ`, `EPP`, `ILF`, `EZU`, `IEV`, `BKF`, `AIA`, `DLS`, `DTH`, `DOL`.
- Fixed income: `SHV`, `IEI`, `TLH`, `IGSB`, `IGIB`, `USIG`, `GBF`, `GVI`, `NYF`, `BIL`, `SPIP`, `PCY`.

Issuer pages supplied inception and investment-objective provenance. A metadata-only Alpaca asset lookup verified current provider support; it did not request bars, quotes, prices, volume, or performance. The manifest records the source URL and provider metadata for every candidate. Synthetic tests enforce exact sleeve size, uniqueness, prior-use exclusion, inception cutoff, provider state, source presence, and checksum integrity.

### Stage 2 — frozen historical retrieval

Only after the 48-symbol manifest is committed may a guarded command retrieve adjusted daily OHLCV history:

- Formation history starts: `2007-01-01`.
- Portfolio development starts: `2009-01-01`.
- Portfolio development ends before: `2016-01-01`.
- Benchmark: adjusted SPY daily bars over the same complete window.
- Adjustment: splits, cash dividends, and other provider-supported total-return adjustments.
- No overwrite and no symbol, date, provider, feed, or adjustment overrides.

Coverage eligibility is outcome-blind: require enough observations for the frozen formation and risk windows before the first eligible decision. Missing histories remain excluded under the preregistered coverage rule; do not replace them after returns are available. The final eligible count and sleeve minimum must be frozen as coverage gates before strategy evaluation.

This window does not overlap v1's 2020–2022 portfolio outcomes or the existing histories beginning in 2016. The already-declared 2023–2024 validation period and 2025-plus sealed test period remain untouched and may not be repurposed.

## Frozen candidate mechanics

The executable preregistration must preserve these rules without a grid search:

1. Use the v1 last-completed-SPY-session monthly schedule.
2. Rank by the same adjusted 12-minus-1-month return, `close[t-21] / close[t-252] - 1`.
3. Require strictly positive formation return and the same completed-session liquidity rule.
4. Select at most one winner per sleeve, with display symbol ascending as the exact tie breaker.
5. Use four 24.75% unscaled sleeve targets, a 1% operational reserve, long/cash positions, fractional units, no leverage, and no shorts.
6. Execute decisions at the next common session's adjusted open, selling before buying.

The unscaled implementation on the fresh source is a required comparator, not a candidate that can independently advance.

## Single risk-control mechanism

Apply one portfolio-level volatility multiplier to the unscaled risky targets:

```text
base sleeve weights = 24.75% for each currently eligible winner
covariance window = latest 20 completed common sessions
forecast annualized volatility = sqrt(252 × w'Σw)
exposure multiplier = min(1, 10% / forecast annualized volatility)
risk-controlled target weight = base target weight × exposure multiplier
```

`Σ` is the sample covariance matrix of adjusted close-to-close arithmetic returns for the currently selected winners. `w` contains their unscaled 24.75% weights; absent sleeves have zero weight. Use pairwise-complete data only when all selected winners have at least 19 returns on the same 20-session window. Otherwise set the multiplier to zero and remain in cash.

Recalculate after every completed common session and execute any target change at the next common session's adjusted open. The multiplier cannot exceed one, so the overlay may reduce exposure but never lever it. Cash earns 0%. A monthly winner change uses only history completed by that signal session. There is no volatility floor, alternate target, smoothing parameter, trend filter, stop-loss, take-profit, or discretionary override.

The `10%` target and 20-session window are fixed before the new source is retrieved. Do not test nearby targets or windows on the development outcomes.

## Costs and comparators

Freeze the same base costs as v1—2 bps transaction cost per side plus 3 bps slippage per fill—and the same doubled-cost stress of 4 plus 6 bps.

Required comparators on the identical fresh source and dates:

- unscaled v1 momentum mechanics;
- static equal-weight four-sleeve portfolio with the same reserve and entry/exit costs;
- 99% adjusted SPY buy-and-hold with the same reserve and entry/exit costs.

All strategies use shared capital, daily adjusted-close valuation, next-session fills, and final liquidation costs.

## Gates to freeze in the executable preregistration

The exact numeric gate table must be machine-readable before outcomes. At minimum it must require:

- complete monthly coverage and a preregistered minimum candidate count per sleeve;
- positive net annualized return and positive stressed annualized return;
- maximum drawdown no greater than `20%` under base costs and `22%` under stress;
- at least a `5` percentage-point drawdown improvement over the fresh-source unscaled comparator;
- monthly Sharpe no worse than the unscaled comparator;
- annualized return no more than `2` percentage points below the unscaled comparator;
- positive performance in a majority of complete calendar years;
- a frozen annualized turnover ceiling;
- no calendar-year or sleeve/source cohort that violates its preregistered robustness floor.

Every gate must pass. A failure rejects the exact v2 candidate. Do not tune and rerun it on the same development source.

## Required safeguards before outcomes

- Synthetic no-future-data tests for formation, covariance, multiplier, and next-open execution.
- Synthetic zero/missing-volatility, changing-winner, cash, cost, turnover, and liquidation tests.
- Exact manifest, history, predecessor-report, and protocol checksums.
- Aggregate-only reporting without selected symbols or instrument-level outcomes.
- No-overwrite artifact writing.
- Explicit `false` declarations for all existing validation/test feature and label access.

## Authorized next step

The metadata manifest was committed in Git checkpoint `4c35ed5`. The guarded history fetcher is now implemented in `scripts/fetch-analysis-risk-controlled-momentum-v2.ts` with its checksum-bound serialization contract in `lib/analysis/risk-controlled-momentum-v2-history.ts`. Synthetic tests cover argument rejection, exact inventory, manifest integrity, deterministic serialization, and no-overwrite writing. A help-only command check passed; the real history artifact does not exist and no OHLCV request was made.

The executable contract is now frozen in `RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL` and `docs/etf-risk-controlled-momentum-v2-preregistration.md`, including final coverage rules, 19 numeric gates, report schema, source contract, and synthetic evaluator requirements. Review the preregistration and guarded fetcher together and commit them before running `npm run fetch:analysis-risk-controlled-momentum-v2`. Fetching does not authorize outcome calculation; its checksum must be registered first.
