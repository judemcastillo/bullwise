# Transparent analysis AI provider pacing v1 preregistration

Status: preregistered operational observation; not yet executed or authorized for production

Recorded: 2026-09-03

## Basis

Google documents that Gemini limits can include requests per minute, input tokens per minute, and requests per day; limits apply per project rather than per API key. Current active limits vary by model, tier, and project, must be viewed in Google AI Studio, and are not guaranteed. Google identifies HTTP 429 as the response for exceeded rate or daily quota.

Official references:

- https://ai.google.dev/gemini-api/docs/rate-limits
- https://ai.google.dev/gemini-api/docs/api-errors

The unpaced v1.3 development evaluation completed its first sixteen requests and failed on its final four, but it did not retain provider error categories. This ordering is consistent with a burst limit but does not prove one. The earlier unpaced reliability observation completed twenty of twenty requests during a slower session.

## Frozen protocol

- Provider and model: Google Gemini API and `gemini-3.5-flash-lite` on the configured free tier.
- Requests: the same 20 frozen synthetic generation inputs and unchanged v1.2 prompt/schema, in their existing order.
- Pacing: maintain at least 6100 ms between request start times, capping the experiment below ten request starts per minute regardless of response speed. A measured minimum of 6000 ms is required to allow small scheduler/clock variation.
- Execution: sequential requests, no Bullwise timeout, and no retries.
- Retained data: request sequence, fixture ID, elapsed duration, interval since the prior request start, completion outcome, token usage, and closed provider failure category/status metadata.
- Privacy: never retain generated output, response bodies, exception messages, request payloads, credentials, headers, user data, or live market data.
- Artifact: write once to `artifacts/analysis/transparent-analysis-ai-provider-pacing-v1.json`; never overwrite it.
- Scope: provider pacing only. Do not validate model content, reopen v1.3, choose production retry behavior, or authorize integration.
- Do not access validation or holdout datasets.

## Frozen gates

All three gates must pass:

1. At least 90% provider completion: at least 18 of 20 requests.
2. Zero rate-limited failures.
3. At least 6000 ms measured between every adjacent request start.

A pass supports—but does not mandate—the tested pacing schedule for a later design. A failure rejects this pacing schedule. One session cannot establish long-run availability.

Run exactly once, only after this preregistration and implementation are committed:

`npm run observe:transparent-analysis-ai-provider-pacing`

Retain the report and record its SHA-256 checksum and compact result here.
