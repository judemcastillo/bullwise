# Transparent analysis AI latency observation v1 preregistration

Status: preregistered diagnostic observation; not authorized for production

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
