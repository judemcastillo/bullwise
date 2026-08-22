# Transparent analysis panel v1 contract

Status: implementation-ready specification

Recorded: 2026-08-21

Product mode: deterministic market context, not a trading strategy

## Current-system audit

### What already exists

- `lib/analysis/technical-analysis.ts` is a pure daily-bar engine with synthetic tests. It validates instrument identity, currency, adjusted data, completed-bar boundaries, duplicates, ordering, minimum history, and staleness.
- The engine calculates trend, momentum, volatility, volume participation, benchmark-relative strength, and deterministic support and resistance.
- `lib/market-data/service.ts` selects an enabled provider binding with the `bars` capability and caches historical results. The production factory currently supplies Massive daily bars.
- The authenticated instrument page already renders a disabled analysis preview below the TradingView chart. TradingView data are explicitly separated from analysis data.

### Gaps and unsafe assumptions

- There is no analysis API, server orchestration service, response DTO, or active UI data path.
- The preview says “Overall signal,” shows “Confidence,” includes “Invalidation,” and is titled “AI technical analysis.” Those labels imply a validated recommendation that the research does not support.
- The existing engine result includes `signal` and `tradePlan`, which belong to the rejected daily-swing research strategy and must not cross the product boundary.
- The page marks analysis as planned when any Massive binding exists; it does not require an enabled `bars` capability.
- The preview is shown for forex, crypto, and commodities even though the engine currently accepts only eligible equities.
- The engine requires ETFs to be explicitly classified as standard, but the catalog does not store its `etfProfile`. ETF eligibility therefore cannot be established safely in the app today.
- Callers must provide `completedThrough`, but the app has no exchange-calendar service that identifies the latest fully completed U.S. session.
- The engine can accept benchmark bars, but the app has no product benchmark-selection or benchmark-fetch path.
- There is no generative-AI provider, prompt contract, structured response validator, attribution mechanism, or AI failure state.
- Current tests cover the deterministic engine and data service, but not product DTO redaction, orchestration, API authorization, or the panel UI.

## V1 outcome

The panel answers: “What does completed daily price and volume data show right now, and how trustworthy are the inputs?”

It does not answer: “Should I buy or sell?”

V1 is a daily market-context panel for U.S. common stocks. It is descriptive and educational. It neither predicts returns nor claims a profitable edge.

### Included

- daily trend state;
- daily momentum state;
- volatility condition;
- volume-participation condition;
- relative strength versus SPY when benchmark data are complete;
- up to three deterministic support and resistance levels;
- balanced supporting and counter evidence;
- provider, interval, adjustment, freshness, history, and warning details.

### Excluded

- buy, sell, hold, long-setup, or short-setup labels;
- entry, stop-loss, take-profit, invalidation, reward/risk, or position sizing;
- probability or confidence percentages;
- automated orders, alerts based on the analysis, or portfolio advice;
- ETFs until standard, leveraged, and inverse classification is stored and tested;
- forex, crypto, commodities, indices, intraday, weekly, monthly, swing-duration, and long-term modes;
- news, sentiment, fundamentals, options, actual order-book liquidity, market depth, supply/demand, and subjective order blocks;
- a generative narrative in the initial implementation checkpoint.

The existing research `signal` and `tradePlan` may remain available to research code, but the product adapter must discard them.

## Eligibility and data contract

An instrument is eligible only when all of these are true:

1. the authenticated user requests an existing active catalog instrument by canonical key;
2. `assetClass` is `equity` and `securityType` is `common_stock`;
3. `calendarId` is `us-equities`;
4. an enabled provider binding explicitly contains the `bars` capability;
5. the service returns adjusted `1d` bars in the instrument's quote currency;
6. at least 300 unique completed bars survive validation;
7. the final bar is not stale under the frozen engine rule.

The server, not the browser, resolves the provider symbol and provider. The endpoint accepts no symbol, provider, date-range, adjustment, strategy, short-selling, or model overrides.

The server requests enough history to obtain at least 300 completed sessions, capped at 500 returned bars for v1. It separately loads SPY from the catalog as the fixed U.S.-equity benchmark. A missing or unusable benchmark makes relative strength unavailable; it must not make absolute price analysis appear unavailable.

Before product orchestration, add a deterministic U.S.-equity completed-session resolver. It must account for the exchange timezone, weekends, holidays, early closes, and whether the current daily bar is still forming. Do not use the server's calendar date alone as `completedThrough`.

The initial calendar is versioned as `nyse-2026-2028-v1` from the official [NYSE holidays and trading-hours schedule](https://www.nyse.com/markets/hours-calendars). It must fail closed outside those published years rather than infer future holidays. A reviewed calendar update is required before 2029, and an exceptional unscheduled closure requires an explicit versioned update.

## Product response

The proposed authenticated endpoint is:

`GET /api/instruments/[canonicalKey]/analysis`

Successful HTTP transport does not imply analysis availability. The body is a discriminated response:

```ts
type AnalysisPanelResponse =
	| {
			version: "1.0.0";
			status: "ready" | "partial";
			instrument: {
				canonicalKey: string;
				displaySymbol: string;
				name: string;
				currency: string;
			};
			asOf: string;
			timeframe: { interval: "1d"; description: "Daily context" };
			context: "constructive" | "mixed" | "defensive";
			factors: {
				trend: EvidenceFactor<"bullish" | "mixed" | "bearish">;
				momentum: EvidenceFactor<"bullish" | "mixed" | "bearish">;
				volatility: EvidenceFactor<"low" | "normal" | "high">;
				participation: EvidenceFactor<"weak" | "normal" | "strong" | "unavailable">;
			};
			levels: {
				support: AnalysisLevel[];
				resistance: AnalysisLevel[];
			};
			dataQuality: AnalysisPanelDataQuality;
			disclaimer: "Descriptive market context—not investment advice or a trading signal.";
		}
	| {
			version: "1.0.0";
			status: "unavailable";
			reason: AnalysisPanelUnavailableReason;
			message: string;
			dataQuality?: AnalysisPanelDataQuality;
			disclaimer: "Descriptive market context—not investment advice or a trading signal.";
		};

type EvidenceFactor<TState extends string> = {
	state: TState;
	evidence: string[];
	counterEvidence: string[];
};

type AnalysisLevel = {
	kind: "support" | "resistance";
	price: string;
	distancePercent: number;
	touches: number;
	source: "swing_cluster" | "range_boundary";
};

type AnalysisPanelDataQuality = {
	provider: string;
	interval: "1d";
	adjusted: true;
	barsUsed: number;
	firstBarAt: string;
	lastBarAt: string;
	completedThrough: string;
	warnings: string[];
};

type AnalysisPanelUnavailableReason =
	| "unsupported_instrument"
	| "bars_provider_unavailable"
	| "completed_session_unavailable"
	| "invalid_market_data"
	| "insufficient_history"
	| "stale_market_data"
	| "analysis_failed";
```

Numeric price values remain normalized decimal strings. Data quality intentionally omits the provider symbol and raw bars.

`context` is a label, not an action:

- `constructive` only when trend and momentum are both bullish;
- `defensive` only when trend and momentum are both bearish;
- `mixed` for every other combination.

The product adapter must construct a new allow-listed object. It must never serialize the engine result with object spreading or pass arbitrary engine prose through to users. Evidence uses explicitly approved product templates derived from deterministic states and indicator values. For example, the existing sentence about high volatility widening stops is replaced with neutral price-range context. The following engine fields are prohibited in the response: `signal`, `tradePlan`, `strategyVersion`, research scores, and research gate or performance data.

### Availability states

- `ready`: core bars, recent volume, and benchmark-relative inputs are valid, with no material data warning.
- `partial`: absolute daily analysis is valid, but relative strength or participation is unavailable, bars were reordered, future/incomplete bars were excluded, or another non-fatal data warning exists.
- `unavailable`: known but ineligible instrument, no enabled bars provider, provider failure, invalid/unadjusted/mismatched data, fewer than 300 completed bars, stale data, or no safely resolved completed session.

Expected provider failures must map to a stable public reason and generic message. API keys, provider response bodies, stack traces, and internal symbols must not be returned.

HTTP behavior is separate from analysis state:

- `401` for no authenticated user;
- `400` for a malformed canonical key;
- `404` for an unknown or inactive instrument;
- `200` for `ready`, `partial`, and non-transient `unavailable` analysis responses;
- `503` with an `unavailable` body for a transient bars-provider failure.

## UI contract

Rename the card to “Daily market analysis” and “Overall signal” to “Market context.” Remove the confidence box, invalidation row, generate button, lock icon, and “AI” preview badge.

The ready or partial panel contains:

1. context label and “As of [completed session]” timestamp;
2. trend, momentum, volatility, and participation cards;
3. nearest support and resistance with distance and touch count;
4. expandable supporting and counter evidence;
5. a visible data-quality and provenance section;
6. the fixed disclaimer.

Partial state must name the missing factor instead of silently omitting it. Unavailable state must explain what the user can do, when actionable, without showing placeholder confidence or recommendation language.

The provider label comes from the actual returned bars, not merely from a catalog binding. TradingView remains display-only and must not be described as an analysis source.

## AI boundary after v1

A later AI explanation may summarize only the allow-listed deterministic response. Raw bars, hidden research fields, user holdings, and API credentials are not model inputs. Each generated claim must reference one or more deterministic fact IDs, and a schema validator must reject unsupported states, prices, or claims.

AI may improve wording; it may not change `context`, factor states, levels, warnings, availability, or the disclaimer. If generation fails, the deterministic panel remains complete and usable. Adding AI requires a separate provider, privacy, prompt, model-version, evaluation, caching, and cost contract.

## Required tests before release

### Pure product adapter

- maps every trend/momentum pair to the frozen context label;
- emits only approved product evidence templates, levels, and data-quality fields;
- recursively proves prohibited property keys such as `signal`, `tradePlan`, and `strategyVersion` are absent;
- proves user-facing text contains no buy/sell, entry, stop-loss, take-profit, trading-signal, or confidence claims;
- maps missing benchmark or volume to `partial` without inventing evidence;
- maps every engine-unavailable reason to a stable product reason.

### Orchestration and data

- requires an active U.S. common stock and an enabled `bars` binding;
- rejects unsupported assets and ETFs before market-data retrieval;
- fetches instrument and fixed SPY benchmark bars without client overrides;
- excludes the current incomplete session and handles holidays and early closes;
- preserves adjusted-data, currency, identity, minimum-history, and staleness checks;
- returns a controlled unavailable response for provider and benchmark failures;
- never reads research artifacts, validation data, or holdout data.

### API and UI

- requires authentication and rejects malformed canonical keys;
- never exposes credentials, raw provider errors, or raw bars;
- renders ready, partial, unavailable, loading, and retry states accessibly;
- visibly renders counter evidence, provenance, timestamp, and disclaimer;
- contains none of the prohibited recommendation language or fields;
- does not call the endpoint for an instrument known to be ineligible.

## Implementation order

1. Add v1 product DTO types and a pure adapter around the existing deterministic engine.
2. Add and test the completed-session resolver.
3. Add a server-only orchestration service with synthetic provider fixtures.
4. Add the authenticated, no-override API route.
5. Replace the disabled preview with the specified UI states.
6. Review telemetry and data-quality failures before considering a separately contracted AI explanation.

Implementation progress: items 1 and 2 are complete. The product DTO and pure allow-listing adapter are implemented in `lib/analysis/transparent-analysis-panel.types.ts` and `lib/analysis/transparent-analysis-panel.ts`. Their tests prove that research strategy fields and arbitrary engine prose do not cross the product boundary. The bounded U.S.-equity completed-session resolver is implemented in `lib/market-data/us-equity-session.ts`. Item 3, server-only orchestration with synthetic provider fixtures, is next.

This contract authorizes ordinary product implementation and synthetic tests only. It does not authorize market-data research retrieval, backtests, model training, strategy validation, holdout access, customer trading signals, or order execution.
