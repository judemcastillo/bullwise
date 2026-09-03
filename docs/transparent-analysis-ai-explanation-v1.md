# Transparent analysis AI explanation v1 preregistration

Status: contract frozen; provider integration not authorized

Recorded: 2026-09-03

Prerequisite: the first transparent-analysis operational review passed 9/9 gates on 2026-09-02 with 85 valid requests across eight UTC days, 97.64705882% availability, no 10-second requests, and no invalid telemetry.

## Purpose

The optional AI layer answers: “How can the deterministic daily market context be explained more clearly?” It does not predict returns, discover a strategy, or answer whether someone should trade.

The deterministic panel remains the source of truth and remains fully usable when AI is disabled, slow, invalid, or unavailable. AI prose is supplementary and may never replace or modify the panel.

## Frozen input boundary

`buildTransparentAnalysisAiInput` creates model input only from a `ready` or `partial` `AnalysisPanelResponse`. An `unavailable` response returns no model input and must cause zero model calls.

The model receives only:

- contract version and daily timeframe;
- deterministic context;
- the four deterministic factor states;
- allow-listed supporting and counter-evidence sentences, each with a deterministic fact ID;
- closed limitation codes for missing participation, missing relative strength, or another data-quality warning.

The model never receives raw bars, levels or prices outside approved evidence, provider information, canonical keys, instrument names or symbols, engine results, signals, trade plans, research artifacts, validation or holdout data, user identity, holdings, watchlists, credentials, cookies, or arbitrary user text.

## Frozen output boundary

The model must return strict structured JSON containing:

- version `1.0.0`;
- the unchanged deterministic context label;
- one overview of at most 480 characters with one or more fact IDs;
- exactly four factor explanations in the order trend, momentum, volatility, participation;
- each unchanged factor state, at most 320 explanation characters, and one or more same-factor fact IDs;
- the unchanged ordered limitation-code array;
- the exact deterministic disclaimer.

Unknown fields, missing fields, duplicate citations, unknown citations, cross-factor citations, state changes, changed limitations, changed disclaimer, empty prose, or over-length prose invalidate the entire output. Invalid output is never partially rendered.

Every numeric token in generated prose must occur in the specifically cited facts. The validator rejects trading recommendations and unsupported claims about news, earnings, fundamentals, sentiment, options, order books, market depth, liquidity, supply, demand, or order blocks.

Prohibited trading language includes buy, sell, hold, long, short, entry, exit, stop-loss, take-profit, price target, position sizing, recommendation, and instructions to invest. The AI output has no fields for confidence, probability, expected return, signal, trade plan, or orders.

## Failure and caching contract

Provider selection, model version, prompt text, privacy terms, region, retention, caching, rate limits, and cost controls require a separate implementation checkpoint. No external model call is authorized by this preregistration.

At integration time, parsing or validation failure must return the unchanged deterministic panel with the AI explanation absent. It must not convert a ready panel to unavailable. Cache keys must bind the model, prompt version, AI contract version, and deterministic input hash; cached prose must pass the same validator before use.

## Frozen evaluation suite

Before any user-facing release, construct at least 32 version-controlled fixtures without reading strategy validation or holdout data. They must cover:

- all nine trend/momentum combinations and all three context labels;
- every volatility and participation state;
- ready and partial panels, missing participation, missing SPY-relative strength, and other warnings;
- conflicting supporting and counter evidence;
- evidence containing RSI, volatility, percentile, moving-average, and volume numbers;
- unavailable inputs and provider, timeout, malformed JSON, extra-field, and truncated-output failures;
- adversarial outputs containing advice, altered states, altered limitations, fake citations, cross-factor citations, invented numbers, unsupported domains, and changed disclaimers.

The candidate model and frozen prompt must pass every gate in `TRANSPARENT_ANALYSIS_AI_EVALUATION_GATES`:

1. 100% strict structured-output validity.
2. 100% deterministic factor-state fidelity.
3. 100% citation validity.
4. Zero novel numeric claims.
5. Zero prohibited advice claims.
6. Zero unsupported-domain claims.
7. Zero model calls for unavailable inputs.
8. 100% deterministic-panel fallback success for provider and validation failures.
9. 100% groundedness on a manually reviewed fixed fixture set.
10. Generation-only p95 latency at or below 5,000 milliseconds.
11. Mean generation cost at or below one U.S. cent per successful explanation.

All eleven gates are mandatory. Model or prompt selection may use development fixtures only. After selection, create a separate one-shot acceptance set before viewing its outcomes; failure rejects the candidate rather than triggering acceptance-set tuning.

## Authorized next step

This preregistration authorizes only synthetic fixtures, a provider abstraction, a frozen prompt, local development evaluation, and deterministic fallback tests. It does not authorize production model calls, AI trading signals, backtests, model training on market outcomes, portfolio advice, or order execution.
