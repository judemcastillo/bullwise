# Transparent analysis AI explanation v1 preregistration

Status: contract, prompt, provider boundary, synthetic fixtures, and local candidate evaluator implemented; production integration not authorized

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

The provider request includes the frozen strict JSON schema exported as `TRANSPARENT_ANALYSIS_AI_OUTPUT_SCHEMA`. The model must return structured JSON containing:

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

The frozen system prompt is version `1.0.0` and is checksum-bound in `lib/analysis/transparent-analysis-ai-prompt.ts`. The vendor-neutral interface and fail-safe runner are in `lib/analysis/transparent-analysis-ai-provider.ts`. Exactly 32 synthetic scenarios are frozen in `lib/analysis/transparent-analysis-ai-fixtures.ts`, covering the context matrix, factor states, partial data, conflicting and numeric evidence, unavailable inputs, provider failure, and eight adversarial-output classes.

The runner never calls a provider for unavailable analysis. Provider exceptions and invalid output return the original deterministic panel with a closed fallback reason and no raw error or partial AI prose.

This preregistration now authorizes selecting candidate providers and models, implementing local-only adapters, and running the frozen development evaluation. It does not authorize production model calls, AI trading signals, backtests, model training on market outcomes, portfolio advice, or order execution.

## Local candidate evaluation

The local-only Google adapter uses the Gemini GenerateContent API with structured JSON output, the frozen prompt, and the minimized deterministic input. Google documents the evaluated Flash candidates as supporting structured outputs and providing free-tier input and output. Free-tier availability remains subject to Google's current quotas and account eligibility, and Google states that free-tier data may be used to improve its products.

An initial endpoint check selected `gemini-2.5-flash-lite` from Google's published free-tier table, but Google returned `NOT_FOUND` for every attempted request and stated that the model is unavailable to new users. Those requests produced zero model outputs and were retained only as an invalid-model diagnostic. The candidate was corrected to Google's recommended `gemini-3.5-flash-lite` before any fixture output was observed, so this did not tune the candidate against development outcomes.

The first `gemini-3.5-flash-lite` adapter check also produced zero outputs because that model rejected an explicit zero thinking budget. A minimal configuration diagnostic isolated that unsupported field; it was removed before the development evaluation without changing the prompt, output contract, fixtures, or gates.

With the corrected adapter, `gemini-3.5-flash-lite` passed 7/10 automated gates but was rejected: 9/20 outputs were fully valid, 10 fixtures contained novel numeric tokens, and two contained prohibited language. That report is preserved as a rejected development result. The next frozen Google-only candidate is the stronger free-tier `gemini-3.5-flash`; the prompt, fixtures, validator, and gates remain unchanged.

Run `npm run evaluate:transparent-analysis-ai-candidate` with `GEMINI_API_KEY` configured. The command makes 20 free-tier generation calls and writes a non-overwriting, gitignored report to `artifacts/analysis/transparent-analysis-ai-development-evaluation-v1.json`. It does not call market-data services, inspect strategy validation or holdout data, or connect AI to the application.

Ten gates are evaluated automatically. The manual-groundedness gate remains pending until every generated explanation in the report is reviewed against its cited facts. A candidate cannot pass or be integrated into the product until that manual gate and all automated gates pass. A failed candidate is rejected; the frozen fixture results must not be used to weaken a gate.

## Development results

The corrected `gemini-3.5-flash-lite` run produced 20 outputs. Only 9/20 passed the full deterministic validator; the candidate passed 7/10 automated gates and was rejected for structured-output validity, novel numeric claims, and prohibited directional language. The model frequently repeated fact IDs inside prose or rewrote exact numeric units, both of which violate the frozen grounding contract.

The stronger `gemini-3.5-flash` candidate produced no output inside the frozen five-second deadline and was also rejected. Its report exposed an evaluator accounting defect: a missing output was not initially counted against the separate state-fidelity and citation-validity percentages. That metric bug was corrected without changing any gate, prompt, fixture, or candidate result. Neither rejected model is authorized for product integration.
