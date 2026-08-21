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

The history artifact is `artifacts/analysis/analysis-risk-controlled-momentum-v3-history.json` and must be created once. Its SHA-256 is intentionally null until retrieval. That checksum must be registered in a separate committed checkpoint before any coverage or performance outcome is calculated.

## Decision

All 19 existing gates must pass. A failure permanently rejects this exact v3 candidate on the Tiingo source. A pass permits only a separately preregistered validation on genuinely new data.

This source substitution does not authorize customer signals, live trading, existing 2016-plus data, or any validation/test access.

## Authorized next step

Review and commit this preregistration, the Tiingo provider, and the guarded fetcher together. Only then may `npm run fetch:analysis-risk-controlled-momentum-v3` retrieve the frozen history. Retrieval does not authorize strategy evaluation.
