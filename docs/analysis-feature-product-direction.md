# Analysis feature product direction

Recorded on 2026-08-21 after the current strategy-research family produced no validated profitable signal and the final frozen experiment closed as source-infeasible.

## Product conclusion

Bullwise must not present the researched strategies or models as validated buy, sell, or hold systems. The research infrastructure remains useful, but the evidence does not support authoritative trade recommendations, automatic orders, or claims of profitability.

The next product direction is transparent market analysis and risk context. It should help users understand what the observable data says without pretending that a tested trading edge exists.

## Useful analysis to expose

- trend, momentum, volatility, liquidity, and volume context;
- relative strength against an appropriate benchmark;
- support, resistance, recent range, and relevant price-action evidence;
- data freshness, provider, adjustment method, missing-data warnings, and confidence limits;
- bullish and bearish evidence shown together;
- scenario-based risk levels and invalidation points when they can be computed deterministically.

Use language such as “bullish evidence,” “bearish evidence,” “risk is elevated,” or “setup detected.” Do not call an output a validated buy, sell, or hold signal. Entry, stop-loss, and take-profit levels may be presented only as clearly labelled educational scenarios until a separately preregistered strategy demonstrates robust out-of-sample value.

## Role of AI

Deterministic code should calculate indicators, levels, provenance, and risk facts. AI may explain those facts in plain language, organize competing evidence, summarize uncertainty, and help users compare scenarios. It must not invent market data, hide missing inputs, claim certainty, or place orders.

## Completed specification checkpoint

The existing engine, market-data path, API surface, and placeholder UI were audited. The implementation contract for the smallest transparent panel is `docs/transparent-analysis-panel-v1-contract.md`. It freezes the initial eligibility, deterministic output, evidence labels, availability and data-quality states, AI boundary, user-facing language, and required tests.

The next step is contract item 1: implement product DTO types and a pure allow-listing adapter around the existing deterministic engine. That adapter must exclude all strategy signals and trade-plan fields.

This document does not authorize another strategy experiment or access to sealed validation or holdout data.

Future strategy research is parked, not abandoned. If it resumes, follow `docs/future-strategy-research-resumption.md` rather than modifying or rerunning the closed candidates.
