# Daily swing broad development universe v1

Frozen on 2026-08-19 before retrieving or inspecting strategy outcomes for these candidates.

Manifest version: `1.0.0`

Universe name: `daily-swing-broad-development-v1`

## Purpose

The previous model had only 854 training episodes across 15 ETFs and failed validation with 0.5220 AUC. This universe expands data breadth before any new model or feature experiment. Its 100 candidates were chosen for cross-sectional coverage, not from observed strategy returns, and none were candidates in the original, v2, or v3 research universes.

SPY is benchmark data only and is not a candidate.

## Frozen candidates

- U.S. style: `IVV, VOO, ITOT, SCHB, VV, VUG, VTV, IWB, IWF, IWD, VO, VB, VBK, VBR, VOE, VOT, IWC, IWR, IWP, IWS, IWO, IWN, VIG, VYM`
- U.S. factor and income: `DVY, SDY, HDV, NOBL, USMV, MTUM, QUAL, VLUE, DGRO, SPLV, SPHB, PRF`
- International regional: `VXUS, IEFA, IEMG, SCZ, VSS, EFV, EFG, IDV, DEM, DGS, AAXJ, CWI`
- International country: `EWG, EWU, EWC, EWA, EWH, EWS, EWT, EWY, EWW, EZA, INDA, TUR, THD, EPOL, ECH, EIDO`
- Fixed income and preferred: `AGG, GOVT, BSV, BIV, BLV, VCSH, VCIT, JNK, BKLN, PFF, MUB, VTEB, SPSB, SPIB, SPAB, SPHY, ANGL, FLOT, FLRN, VCLT`
- Industry and real-asset equity: `IYR, IYT, IBB, IHI, IHF, KBE, KIE, XHB, XME, XOP, XRT, ITB, IGV, XSD, XES, SOXX`

The TypeScript manifest is authoritative and has tests for count, uniqueness, category breadth, symbol format, and zero overlap with all previously consumed research candidates.

## Frozen retrieval policy

- Alpaca SIP adjusted daily bars.
- Request 2016-01-01 through 2026-08-18.
- Require at least 2,500 bars per coverage-eligible instrument.
- The first available bar may be no more than 31 days after the requested start.
- Require at least 50 coverage-eligible instruments before research can continue.
- Target at least 5,000 episode-first training observations before fitting another model.

Coverage failures are data-quality exclusions only. Rules will not be loosened based on setup outcomes.

## Frozen signal-time liquidity policy

At each signal, use only the latest 20 completed sessions:

- At least 19 sessions must have positive adjusted close and reported volume.
- Median adjusted close multiplied by reported volume must be at least $10 million.
- Planned position notional must be no more than 1% of that median dollar volume.
- Missing or insufficient liquidity data makes the setup ineligible.

This is a historical, point-in-time eligibility rule. Present-day liquidity and future volume cannot determine whether an older setup is included.

## Limitations

This is a static list of funds known during universe design, so fund survival and availability can still bias coverage. Retrieval must record missing, shortened, or unavailable histories. The liquidity rule cannot reproduce bid/ask spread, market depth, or ETF underlying-basket liquidity from daily OHLCV data.

No model, performance experiment, customer signal, or test evaluation is authorized by this manifest. The current sealed test labels remain unread.
