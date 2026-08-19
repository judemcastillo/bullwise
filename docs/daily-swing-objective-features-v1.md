# Daily swing objective features v1

Frozen on 2026-08-19 before generating setup outcomes from the broad-development history.

Feature version: `1.0.0`

Setup-scan version: `2.0.0`

## Scope and timing

Each snapshot is calculated from adjusted daily OHLCV bars completed through the signal timestamp. The builder accepts no future bars, validates that its final bar matches the analysis result, and stores the feature timestamp beside the setup. Instrument identity is provenance only and is not a model input.

The broad-development scan first applies the frozen outcome-blind coverage gate. It then applies the frozen liquidity gate at every setup timestamp. A liquidity failure is recorded but is not simulated or labeled. The command is `npm run scan:analysis-broad-development`; it has not been run as part of this feature checkpoint.

## Frozen formulas

All ratios below are unitless unless stated otherwise. Percentile ranks use the fraction of observed values less than or equal to the current value. Medians ignore missing or non-positive volume observations; the separate missing-rate and eligibility rules preserve that missingness.

### Liquidity

- `medianDollarVolume20` and `medianDollarVolume60`: median of adjusted close multiplied by reported positive volume over the latest 20 or 60 completed sessions.
- `missingOrZeroVolumeRate20`: one minus positive close-and-volume observations divided by 20.
- `dollarVolumePercentile252`: current dollar-volume percentile among as many as 252 completed sessions.
- `amihudIlliquidity20PerBillion`: mean absolute close-to-close fractional return divided by dollar volume over 20 sessions, multiplied by one billion for numerical scale.
- Planned position notional: entry-zone midpoint multiplied by units, where units equal reference risk capital divided by the absolute midpoint-to-stop distance.
- Liquidity eligibility: at least 19 valid observations in 20 sessions, median dollar volume of at least $10 million, valid planned notional, and planned notional no greater than 1% of median dollar volume.

### Candle structure

- `bodyToRange`: absolute close-minus-open divided by high-minus-low.
- `upperWickToRange`: high minus the greater of open and close, divided by range.
- `lowerWickToRange`: the lesser of open and close minus low, divided by range.
- `closeLocationInRange`: close minus low, divided by range. A zero-range candle uses 0.5; its body and wick ratios use zero.
- `overnightGapAtr`: current open minus prior close, divided by signal-time ATR(14).
- `rangeAtr`: current high-low range divided by ATR(14).

### Price action

- `rangeCompression20`: current range divided by the median range of the preceding 20 completed sessions.
- `directionalFollowThrough3Atr`: signed three-session close change divided by ATR; positive means movement in the setup direction.
- `breakoutDisplacementAtr`: for a long breakout, close minus entry-zone low divided by ATR; for a short breakdown, entry-zone high minus close divided by ATR. Pullbacks are null.
- `entryToNearestSupportAtr` and `entryToNearestResistanceAtr`: signed distance from entry-zone midpoint to the nearest signal-time level divided by ATR.

### Structural supply/demand proxies

- The nearest public support and resistance retain the engine's deterministic pivot or range-boundary touch count.
- Zone tolerance is the greater of 0.5 ATR and 0.25% of close, matching the market-structure engine.
- `supportZoneTouches120` and `resistanceZoneTouches120`: completed candles in the latest 120 sessions whose range intersects the nearest level's zone.
- A support rejection is a zone touch that closes above the level in the upper 40% of its range. A resistance rejection closes below the level in the lower 40%. Counts are null when the corresponding level is unavailable.

These are deterministic structural proxies, not subjective order blocks and not actual order-book supply or demand.

### Volume confirmation

- `volumePercentile252`: current positive volume percentile over as many as 252 completed sessions.
- `relativeVolume20`: current positive volume divided by median positive volume over the preceding 20 sessions.
- `volumeToPriceMove20`: relative volume divided by the absolute one-session price move in ATR units, with the denominator floored at 0.1 ATR.

## Leakage and limitations

Synthetic tests alter every bar after a signal and require an identical snapshot. Scanner tests also verify that the broad-development liquidity policy rejects a setup before future-bar simulation. Daily bars cannot measure bid/ask spread, market depth, ETF basket liquidity, intraday order flow, news, or true supply and demand.

This schema creates feature candidates, not proof of predictive value or profitability. It does not authorize model fitting, validation inspection, sealed-test access, live signals, or trading.
