# Daily swing v2 preregistration

Frozen before retrieving or inspecting the confirmation universe on 2026-08-19.

Confirmation ID: `daily-swing-v2-cross-asset-etf-2026-08-19`

## Hypothesis

The v1 development results suggest that confirmed breakouts have a more durable edge than pullbacks. V2 keeps the v1 risk model and plan geometry unchanged and accepts a setup only when all of these conditions hold on the completed signal bar:

1. Direction is long.
2. Entry type is breakout.
3. Setup status is active, meaning the breakout already closed inside its entry zone; watched breakouts are rejected.
4. Twenty-day relative strength versus SPY is strictly positive.
5. Volume participation is normal or strong. Weak or unavailable participation is rejected.

No other trend, momentum, ATR, entry-zone, stop, target, position-sizing, expiration, holding-period, or cost parameter changes are permitted for this confirmation.

## Untouched confirmation universe

`VTI, MDY, EFA, EEM, VNQ, TLT, IEF, HYG, LQD, GLD, SLV, USO, DBA, XBI, SMH`

SPY is used only as the relative-strength benchmark. The planned window begins 2016-01-01 and ends at the latest completed session available at retrieval time. Alpaca SIP daily bars with `adjustment=all` are required.

## Pass criteria

Every criterion must pass, along with the existing 1,250-bar minimum coverage gate:

- At least 150 completed trades.
- Pooled average R multiple at least 0.08 after configured costs.
- Pooled profit factor at least 1.15 after configured costs.
- At least 60% of instruments profitable.
- Equal-weight average maximum closed-trade drawdown no greater than 10%.
- Stressed-cost pooled profit factor at least 0.90 using 10 bps transaction cost and 15 bps slippage per fill.

Buy-and-hold outperformance is reported but is not a pass criterion because this is a selective signal engine rather than a continuously invested allocation strategy.

## Decision rule

This is one confirmation run. If it fails, v2 is rejected; thresholds or rules will not be changed and re-run on this universe. Any later strategy becomes v3 and requires a newly declared validation design. If it passes, it advances only to portfolio-aware, point-in-time, and paper-trading validation—not directly to product signals or live execution.
