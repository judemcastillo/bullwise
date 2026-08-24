# Transparent analysis telemetry v1

Status: instrumented; production observation pending.

## Purpose

This telemetry answers only operational questions about the deterministic daily-analysis panel:

- how often an authenticated request is ready, partial, unavailable, malformed, or not found;
- which closed failure category caused an operational failure;
- whether participation, SPY-relative strength, or another data-quality check is missing;
- whether response time falls into a coarse duration bucket;
- whether an available result used 300–399, 400–499, or 500 bars.

It does not measure strategy profitability, user behavior outside this endpoint, or AI quality. Passing an operational review does not authorize an AI explanation.

## Sink and event schema

V1 emits one structured server log per handled request and a separate structured event for an internal operational failure. The logger is server-only and vendor-neutral.

`transparent_analysis_request` contains only:

- schema version `1.0.0`;
- outcome;
- HTTP status;
- duration bucket;
- optional closed unavailable reason;
- optional closed partial-reason and warning-code arrays;
- optional coarse history-size bucket.

`transparent_analysis_operational_failure` contains only:

- schema version `1.0.0`;
- failure stage;
- closed failure category.

The duration buckets are `<250ms`, `250–999ms`, `1–2.99s`, `3–9.99s`, and `10s+`. Exact durations are deliberately not recorded.

## Prohibited data

Telemetry must never contain:

- user, session, email, IP, cookie, or request identifiers;
- canonical keys, display symbols, provider symbols, instrument IDs, or instrument names;
- holdings, watchlists, alerts, or preferences;
- provider names, URLs, response bodies, error messages, or credentials;
- raw bars, timestamps from bars, prices, levels, indicators, evidence, or counter-evidence;
- raw warning prose;
- research artifacts, strategy fields, validation data, or holdout data.

Unknown warning text collapses to `other_data_quality_warning`. Unknown failures collapse to `unknown`. Telemetry failures must never change the API response.

The application does not persist these events in MongoDB. If the deployment log sink supports retention controls, retain this stream for no more than 30 days and restrict access to operators.

## First operational review

Do not evaluate reliability from a single successful request. Review after at least 50 valid-instrument request outcomes spanning at least seven calendar days. Aggregate only counts and percentages from the closed fields above.

Investigate before considering a separate AI contract when any of these are true:

- any `configuration`, `authorization`, `result_limit`, or `unknown` operational failure occurs;
- more than 5% of valid-instrument requests fall in `10s_or_more`;
- fewer than 95% of valid-instrument requests are `ready` or `partial`;
- `other_data_quality_warning` occurs;
- participation or relative-strength unavailability is recurrent rather than isolated.

The review must document observation dates, request count, aggregate outcome counts, duration-bucket counts, partial-reason counts, warning-code counts, and operational-failure counts. It must not add dimensions or inspect individual requests after seeing the results.

## Local operational smoke

Run `npm run smoke:transparent-analysis` for a one-shot check of the current live AAPL and SPY daily-bar path plus the deterministic panel adapter. The command uses the same frozen history window as the application, accepts no symbol, date, or provider overrides, writes no artifact, and emits only status, completed-session time, bar counts, warning count, and a closed failure reason or category.

This command deliberately bypasses authentication and telemetry. It therefore does not test the authenticated route and does not count toward the 50 genuine requests or seven calendar days required by the first operational review. Do not loop it as a substitute for that observation period.
