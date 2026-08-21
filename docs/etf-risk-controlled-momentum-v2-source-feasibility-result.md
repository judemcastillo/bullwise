# ETF risk-controlled momentum v2 source-feasibility result

Recorded on 2026-08-21 after the exact committed command `npm run fetch:analysis-risk-controlled-momentum-v2` completed its provider requests but could not build an artifact.

## Observed result

- Frozen provider and period: adjusted Alpaca SIP daily bars, 2007-01-01 through 2015-12-31.
- First artifact-validation failure: `SPY returned no daily bars`.
- History artifact written: no.
- Strategy outcomes calculated: no.
- Existing 2016-plus, validation, or test data accessed: no.

Alpaca documents that its Data API does not have equity data before 2016: https://alpaca.markets/support/alpaca-data-timeline. The successful API responses with no pre-2016 bars are consistent with that boundary. This is a source-feasibility failure, not evidence for or against the registered strategy.

## Decision

`source_infeasible_without_strategy_outcomes`

The frozen v2 contract prohibited provider, date, symbol, mechanics, and gate changes. It therefore cannot be amended to use another provider. It remains unevaluated and closed.

The only permitted continuation is a separately preregistered successor that preserves the exact manifest, untouched period, mechanics, costs, comparators, and gates while naming a different historical provider before retrieving its data.
