# Transparent analysis AI provider reliability v1 preregistration

Status: preregistered operational observation; not yet executed or authorized for production

Recorded: 2026-09-03

## Question

What safe provider-level category explains failures when Bullwise requests a Gemini explanation without an application timeout?

The rejected v1.2 content evaluation returned fifteen valid outputs and five requests with no output, but its fail-closed report discarded the underlying provider failure category. This observation diagnoses that instrumentation gap. It does not rerun, reopen, or change the v1.2 decision.

## Frozen protocol

- Provider and model: Google Gemini API and `gemini-3.5-flash-lite` on the configured free tier.
- Requests: the same 20 frozen synthetic generation inputs and frozen v1.2 prompt/schema, in their existing order.
- Execution: sequential requests, zero pacing delay, no Bullwise timeout, and no retries.
- Retained fields per request: sequence, fixture ID, duration, completion outcome, token usage on completion, and—on failure—only a closed category, numeric HTTP status when present, and a bounded numeric `Retry-After` value when present.
- Closed categories: transport error, rate limited, authentication error, server error, other HTTP error, response not JSON, missing output, output not JSON, or unclassified error.
- Privacy: do not retain generated model output, provider response bodies, exception messages, request payloads, API keys, headers, or user/live market data.
- Artifact: write once to `artifacts/analysis/transparent-analysis-ai-provider-reliability-v1.json`; never overwrite it.
- Scope: operational observation only. Do not validate output content, calculate v1.2 gates, tune the prompt, select retry behavior, or authorize production integration.
- Do not access validation or holdout datasets.

## Interpretation

This single session may identify the immediate failure class and whether failures cluster by request sequence. It cannot estimate long-run reliability or by itself justify a retry policy. Any pacing or retry experiment must be separately preregistered and use a new non-overwriting artifact.

Run exactly once, only after this preregistration and implementation are committed:

`npm run observe:transparent-analysis-ai-provider-reliability`

Retain the report and record its SHA-256 checksum and compact result here.

## Recorded observation

The one-shot observation completed on 2026-09-03. All 20 sequential requests completed at the provider boundary. No transport, rate-limit, authentication, server, other HTTP, provider-response JSON, missing-output, model-output JSON, or unclassified failure was observed.

Request duration ranged from 1559.446268 ms to 16672.802464 ms, with a mean of 3751.454398 ms, p50 of 1980.537559 ms, and p95 of 7910.642733 ms. Successful requests reported 13304 aggregate input tokens and 6805 aggregate output tokens. Generated prose was not retained or evaluated.

This session did not reproduce the five provider failures from the rejected v1.2 evaluation. Therefore, it cannot identify their original cause or establish long-run provider reliability. The v1.2 rejection remains unchanged, and this observation does not authorize retries, pacing changes, or production integration.

Report: `artifacts/analysis/transparent-analysis-ai-provider-reliability-v1.json`

Report SHA-256: `d22e711c8ef2ac5659170ca0c5a537ef6ed3814fa265238ee8d796879acbc1a9`
