# ETF risk-controlled momentum v3 preregistration

Frozen on 2026-08-21 after the Alpaca-sourced v2 attempt was closed as source-infeasible without a history artifact or strategy outcomes.

Development ID: `etf-risk-controlled-momentum-development-v3`

The complete machine-readable contract is `RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL` in `lib/analysis/risk-controlled-momentum-v3-development.ts`. The source-feasibility record is `docs/etf-risk-controlled-momentum-v2-source-feasibility-result.md`.

## Sole change from v2

Use Tiingo's end-of-day composite history instead of Alpaca SIP history. Tiingo documents raw and split-and-cash-dividend-adjusted open, high, low, close, and volume fields: https://www.tiingo.com/documentation/end-of-day.

Everything that can affect outcomes remains identical to v2:

- exact 48-ETF manifest SHA-256 `2a8fd2e03aab94002edf3e0b4db0ea034f4b328312db46cfb6393cd2cc315464` plus SPY;
- 2007 formation history and exactly 84 monthly holding periods from 2009 through 2015;
- coverage requirements of 40 total and 10 per sleeve, with no replacements;
- 12-minus-1 momentum, liquidity, selection, tie-break, and next-open rules;
- four 24.75% sleeve targets and 1% operational reserve;
- one capped 10% portfolio-volatility target using a 20-common-session sample covariance;
- base and stressed costs, unscaled/static/SPY comparators, all 19 gates, and aggregate-only reports.

No Alpaca and Tiingo bars may be mixed. The present-day surviving-fund limitation remains unchanged.

## Source contract

The guarded command requests one adjusted daily Tiingo EOD series for SPY and each exact manifest member from 2007-01-01 through 2015-12-31. It accepts no symbols, dates, provider, adjustment, output, or overwrite overrides. Empty, malformed, wrongly attributed, unordered, out-of-range, or incomplete-inventory inputs fail before artifact writing.

The history artifact is `artifacts/analysis/analysis-risk-controlled-momentum-v3-history.json` and must be created once. Its SHA-256 was intentionally null until retrieval and had to be registered in a separate committed checkpoint before any coverage or performance outcome could be calculated.

## Registered history

The guarded retrieval completed on 2026-08-21 before any coverage or strategy outcome was calculated:

- SHA-256: `4d128a2e7782f6554f1f274aa92485064df97cda495ea5566c73b734206000f2`
- Bytes: `27,239,858`
- Provider/feed: Tiingo EOD composite
- Adjustment: split-and-cash-dividend-adjusted OHLCV
- Existing 2016-plus, validation, or test data accessed: no

This registration changes no symbol, period, strategy mechanic, cost, comparator, report field, or gate.

## Decision

All 19 existing gates must pass. A failure permanently rejects this exact v3 candidate on the Tiingo source. A pass permits only a separately preregistered validation on genuinely new data.

This source substitution does not authorize customer signals, live trading, existing 2016-plus data, or any validation/test access.

## Execution result and closure

The user authorized the one real development run on 2026-08-21. The command verified the registered artifact and began evaluation, then failed before report writing because a held instrument lacked a valuation bar.

A limited, aggregate-only source diagnostic found:

- 1,762 benchmark sessions in the portfolio period;
- 1,761 sessions common to the complete manifest;
- one incomplete benchmark session, `2010-05-06T00:00:00.000Z`;
- two affected instruments, each missing no more than one session.

The incomplete session is the Flash Crash session. Maximum drawdown is a primary gate, so deleting that date, forward-filling it, excluding an affected instrument, or mixing another provider's bars would change the frozen experiment after observing a consequential source defect. None of those repairs is authorized.

Closure decision: `source_infeasible_without_complete_valuation_data`.

No development report was written, no aggregate performance evaluation or gate decision was completed, and no 2016-plus, validation, or test features or labels were read. The failed execution does not establish that v3 passed or failed its performance gates.

## Closed next step

Do not rerun or repair exact v3, and do not create a v4 that merely retries the same strategy family on the same incomplete source. The registered history remains preserved as ignored research evidence, while the evaluator and synthetic tests remain available for audit. The standard development command now reports the closure and exits before reading the history.

This closes the current strategy-search family. It authorizes no validation, holdout evaluation, customer signal, live trading, or new strategy experiment. Product work should instead proceed toward transparent market analysis and risk context as described in `docs/analysis-feature-product-direction.md`.
