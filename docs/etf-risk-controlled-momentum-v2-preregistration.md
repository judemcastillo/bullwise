# ETF risk-controlled momentum v2 preregistration

Frozen on 2026-08-21 after committing the metadata-only universe and implementing the guarded history fetcher, before retrieving OHLCV history or calculating any outcome.

Development ID: `etf-risk-controlled-momentum-development-v2`

The complete machine-readable contract is `RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL` in `lib/analysis/risk-controlled-momentum-v2-development.ts`. The research rationale and issuer metadata are recorded in `docs/etf-risk-controlled-momentum-v2-source-and-protocol-design.md`.

## Source and period

Use only the exact 48-ETF manifest with SHA-256 `2a8fd2e03aab94002edf3e0b4db0ea034f4b328312db46cfb6393cd2cc315464`. Retrieve adjusted Alpaca SIP daily bars from 2007 through 2015. Formation begins in December 2008; the shared-capital portfolio runs from January 2009 through December 2015 for exactly 84 monthly holding periods.

An instrument is coverage-eligible only with at least 2,000 bars and a first bar no later than the end of 2007. Require at least 40 eligible instruments and at least 10 in every sleeve. Missing histories are excluded without replacement. Existing 2016-plus histories, 2023–2024 validation, and 2025-plus test data remain protected.

The history SHA-256 is intentionally null until the guarded fetch completes. Registering that checksum is the only permitted source amendment before outcomes; it may not change symbols, periods, mechanics, costs, gates, or reports.

## Strategy and risk control

Preserve v1's last-session monthly 12-minus-1 ranking, positive-return and liquidity eligibility, one winner per sleeve, 24.75% unscaled sleeve targets, 1% operational reserve, next-open fills, and long/cash shared-capital accounting.

After every completed common session, calculate the 20-session sample covariance matrix of the currently selected winners' adjusted arithmetic returns. Scale all unscaled risky weights by:

```text
min(1, 10% / sqrt(252 × w'Σw))
```

Trade the resulting target at the next common adjusted open. Missing or nonpositive volatility produces a zero multiplier. Never lever, smooth, floor, or substitute this signal. No alternate volatility target, window, estimator, trend filter, stop-loss, take-profit, or AI model is allowed.

Base costs are 2 bps per side plus 3 bps slippage; stress costs are 4 plus 6 bps. Required comparators are the same-source unscaled momentum portfolio, static equal-weight sleeves, and 99% SPY buy-and-hold.

## Decision

All 19 machine-readable coverage, return, Sharpe, drawdown, comparator, calendar-year, sleeve, stress, and turnover gates must pass. Any failure permanently rejects this exact v2 candidate on this development source. A pass permits only a separately preregistered validation using genuinely new data.

Reports are aggregate-only, refuse overwrite, and cannot contain selected symbols or instrument-level outcomes. Neither result authorizes existing validation/test access, customer signals, or live trading.

## Authorized next step

Review this preregistration and the guarded fetch implementation together. If unchanged, commit them. Only then may the exact no-override command `npm run fetch:analysis-risk-controlled-momentum-v2` retrieve the frozen history. Fetching does not authorize strategy evaluation; the resulting history checksum must be registered first.
