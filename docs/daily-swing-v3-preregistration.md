# Daily swing v3 portfolio preregistration

Frozen before retrieving or inspecting the v3 confirmation universe on 2026-08-19.

Confirmation ID: `daily-swing-v3-ranked-portfolio-2026-08-19`

## Hypothesis

V3 changes portfolio allocation rather than entry, stop, target, or holding-period rules. When multiple candidate trades have the same entry session and portfolio capacity cannot accept all of them, candidates are ordered using only values recorded at their signal time:

1. Breakout before pullback before breakdown.
2. Strong before moderate before weak before unavailable evidence.
3. Higher 20-day relative strength versus SPY.
4. Higher 20-day volume z-score.
5. Higher planned reward/risk.
6. Display symbol as the final deterministic tie-breaker.

The baseline uses display-symbol order. Both versions use identical candidate trades, 1% risk per accepted trade, five-position limit, 5% aggregate committed-risk limit, 100% gross-exposure admission limit, transaction costs, slippage, stop-first candle policy, and completed-bar mark-to-market accounting. Existing positions are never displaced by a later candidate.

## Untouched confirmation universe

`ACWI, VEA, VWO, SCHD, RSP, IJH, IJR, VGK, EWJ, EWZ, MBB, TIP, SHY, BND, EMB, PDBC, DBC, IAU, GDX, KRE`

SPY is used only as the relative-strength benchmark. The requested history begins 2016-01-01 and ends at the latest completed session available at retrieval. Alpaca SIP daily bars with `adjustment=all` are required.

## Pass criteria

Every criterion and the existing 1,250-bar coverage gate must pass:

- At least 300 ranked-portfolio accepted trades.
- Ranked average R multiple at least 0.10.
- Ranked profit factor at least 1.20.
- Ranked annualized return at least 5%.
- Ranked completed-bar maximum drawdown no greater than 15%.
- Ranked annualized return at least 0.5 percentage points above the symbol-order baseline.
- Ranked average R at least 0.02 above the symbol-order baseline.

## Decision rule

This is one sequential research confirmation. Failure rejects v3; rules and thresholds will not be changed and rerun on this universe. Passing would advance the ranking policy only to forward paper validation because earlier experiments informed this research program and the surviving-ETF universe still has selection bias. It would not authorize customer signals or live execution.
