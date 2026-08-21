# Daily swing next research plan

> Status update, 2026-08-21: this broader-data and model program completed but did not produce a profitable daily-setup strategy or useful setup-ranking model. The later ETF cross-sectional momentum experiment produced strong train-only returns but was formally rejected after failing both absolute drawdown gates. Its preserved result and the clean-data requirements for any risk-controlled successor are recorded in `docs/etf-cross-sectional-momentum-development-v1-result.md`.

> The risk-controlled successor's source and protocol direction is recorded in `docs/etf-risk-controlled-momentum-v2-source-and-protocol-design.md`: 48 new pre-2008 ETFs, a non-overlapping 2009–2015 development window, and one capped 10% portfolio-volatility overlay. The metadata-only universe is frozen with SHA-256 `2a8fd2e03aab94002edf3e0b4db0ea034f4b328312db46cfb6393cd2cc315464`; no prices were retrieved.

Recorded on 2026-08-19 after rejecting `daily-swing-episode-actionable-logistic-v1`. This is a research plan, not a preregistered model experiment and not authorization to open the sealed test split.

## Decision

Increase data breadth before trying another model. The rejected experiment had only 854 training episodes across 15 ETFs and produced 0.5220 validation AUC. Adding model complexity to that sample would create more overfitting risk without fixing the weak effective sample.

Do not tune the rejected model, change its cutoff, rerun its validation, or evaluate it on test.

## Phase 1: broader development data

Create a new, versioned development source with a universe frozen before outcome inspection. Target at least 5,000 episode-first training observations across at least 50 liquid instruments and multiple market regimes. These are data-coverage goals, not performance gates.

Universe selection must be reproducible and based only on information available at each historical date. Record inception and delisting coverage, avoid choosing symbols from observed strategy returns, and document survivorship limitations when point-in-time membership is unavailable.

The current sealed test labels remain unread. A final holdout policy for the broader source must be frozen before any new holdout features or labels are inspected.

## Phase 2: objective feature candidates

Generate candidates from completed daily OHLCV bars only:

- Liquidity: trailing 20- and 60-session median dollar volume, zero/missing-volume rate, dollar-volume percentile, and an Amihud-style absolute-return-to-dollar-volume proxy.
- Candle structure: body/range ratio, upper- and lower-wick ratios, close location within the range, overnight gap in ATR units, and range in ATR units.
- Price-action context: range compression, breakout displacement in ATR units, distance from entry to structural support/resistance in ATR units, and completed-bar follow-through available at the signal timestamp.
- Structural supply/demand proxies: deterministic pivot-zone touch and rejection counts using only bars completed by the signal.
- Volume confirmation: volume percentile and volume change relative to the size of the price move.

Do not add subjective order blocks. An order-block feature is eligible only after it has a deterministic, testable definition. Do not add news sentiment until trustworthy timestamped historical archives are available.

Every feature must include a no-future-data test and be computed at the signal timestamp. Instrument identity remains excluded from model inputs.

The completed-bar objective feature schema is now frozen as `daily-swing-objective-features-v1` and documented in `docs/daily-swing-objective-features-v1.md`. Its code and synthetic leakage tests were completed before generating any broad-development setup outcomes.

## Phase 3: development process

1. Version the new feature schema and regenerate exhaustive setup rows.
2. Apply episode-first selection independently within every split.
3. Use walk-forward development folds rather than random cross-validation.
4. Compare a constant baseline with one simple regularized model before considering nonlinear models.
5. Freeze the model, preprocessing, score policy, economic gates, artifact checksums, and final holdout policy before opening a development holdout.
6. Reject on any failed gate without tuning and rerunning the same holdout.

No customer signal, live execution, or sealed-test evaluation is authorized by this plan.

## Frozen broader universe

The first phase is now specified in `docs/daily-swing-broad-development-v1.md` and the versioned TypeScript manifest. It freezes 100 non-overlapping ETF candidates, exact Alpaca retrieval dates, coverage gates, and point-in-time liquidity eligibility before retrieval. Fetching uses `npm run fetch:analysis-broad-development` and accepts no overrides or overwrite flag.
