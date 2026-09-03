# Transparent analysis AI latency observation v1 preregistration

Status: diagnostic observation completed; not authorized for production

Recorded: 2026-09-03

## Question

How long does Google Gemini 3.5 Flash-Lite naturally take to complete the existing transparent-analysis AI request when Bullwise imposes no application-level timeout?

This observation corrects an unsupported interaction assumption in the rejected v1.1 experiment. The future AI explanation is intended to be explicitly user-triggered, not requested during page load. Therefore, no latency limit should be selected until natural completion time has been measured.

## Frozen protocol

- Use `gemini-3.5-flash-lite` and the unchanged v1.1 prompt, checksum, input contract, output schema, and deterministic validator.
- Run the same 20 frozen synthetic generation fixtures sequentially.
- Supply a non-aborting request signal. Do not create an application timer, deadline, or abort timeout.
- Record each fixture's elapsed duration, completion outcome, validation issue codes, and token usage.
- Do not retain generated explanation prose.
- Report minimum, mean, p50, p90, p95, and maximum elapsed duration separately for completed responses and all requests, plus completed, valid, invalid, and provider-failure counts.
- Write once to `artifacts/analysis/transparent-analysis-ai-latency-observation-v1.json`; do not overwrite it.
- Do not call the application, use live user data, alter the UI, or connect Gemini to production.
- Do not access any validation or holdout dataset.

The provider, network stack, or operating environment may still terminate a request independently. Such an event is recorded as a provider failure with its elapsed time; it is not replaced by a Bullwise timeout.

## Interpretation boundary

This is a latency diagnostic, not a new evaluation of the rejected v1.1 candidate. It has no pass/fail gate and cannot authorize prompt changes or production integration. Output validation counts provide operational context only and must not be used to reverse the v1.1 rejection.

One 20-request session provides an initial same-session distribution, not a reliable estimate of performance across days, regions, quota states, or network conditions. Additional observations, if desired, require separately versioned, non-overwriting runs recorded before execution.

Run exactly once with:

`npm run observe:transparent-analysis-ai-latency`

## Recorded observation

The one-shot observation completed on 2026-09-03. All 20 requests completed without a Bullwise application timeout and none ended in provider failure.

Completed-response latency:

- minimum: 1826.231321 ms;
- mean: 16315.658261 ms;
- p50: 6964.690759 ms;
- p90: 31464.255695 ms;
- p95: 31686.424958 ms;
- maximum: 33188.501133 ms.

Five requests completed within five seconds, another five between five and ten seconds, one between ten and fifteen seconds, two between twenty and thirty seconds, and seven took more than thirty seconds. The first and second groups of ten averaged 15378.553932 ms and 17252.762591 ms respectively, so the slow tail was not isolated to only the beginning or end of the run.

Eighteen outputs passed the deterministic validator. Two were invalid because they contained prohibited directional language. This validity count is diagnostic context only and does not reverse the rejected v1.1 decision.

No timeout is selected from this single session. The result establishes that five seconds would truncate most observed requests, while also showing that natural free-tier completion can exceed thirty seconds.

Report: `artifacts/analysis/transparent-analysis-ai-latency-observation-v1.json`

Report SHA-256: `5d80a62ecb2537f9c94b31585c3bfac68dd55430c3a4488a0c2d59762de2f0a6`
