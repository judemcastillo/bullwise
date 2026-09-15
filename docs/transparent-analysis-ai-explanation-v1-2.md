# Transparent analysis AI explanation v1.2 preregistration

Status: preregistered development candidate; not yet executed or authorized for production

Recorded: 2026-09-03

## Purpose

This experiment tests whether Google Gemini 3.5 Flash-Lite can reliably restate the existing deterministic daily market analysis under the corrected explicit-button interaction model. The model remains an explanation layer only. It cannot create or change context labels, factor states, facts, limitations, trading signals, entries, stops, targets, or position sizes.

The rejected v1 and v1.1 results remain historical evidence and are not overwritten. The separate latency observation showed that a five-second boundary truncated most requests, so v1.2 does not impose a Bullwise timeout or use latency as an acceptance gate.

## Frozen hypothesis and change

Gemini 3.5 Flash-Lite will pass every automated content, fidelity, safety, fallback, and cost gate after the prompt is aligned with the validator: temporal phrases such as `short-term`, `long-term`, and `short- and medium-term` are allowed only when faithfully restating supplied facts, while position or action language remains prohibited.

The deterministic input facts, output payload contract `1.1.0`, strict validator, fallback behavior, model, provider, and frozen fixtures are unchanged. The experiment and prompt versions are `1.2.0`.

Frozen prompt SHA-256: `b5bd08e20231827017d4062961f086265b4afaf93d7280806eb586989cf76114`

## Frozen protocol

- Provider and candidate: Google Gemini API, `gemini-3.5-flash-lite`, configured free tier.
- Dataset: the same 32 frozen synthetic development fixtures—20 generation fixtures and 12 unavailable-input, provider-failure, or invalid-output boundary fixtures.
- Interaction assumption: the future request begins only after the user explicitly presses an AI-explanation button.
- Request boundary: use a non-aborting signal. Bullwise sets no timer, deadline, or timeout. Provider or network failures are still recorded as failures.
- Latency: record p95 elapsed time as an observation only; it cannot pass or fail v1.2.
- Output retention: retain all synthetic inputs, generated outputs, and validator results so every valid output can receive manual groundedness review.
- Artifact: write once to `artifacts/analysis/transparent-analysis-ai-content-evaluation-v1-2.json`; never overwrite it.
- Scope exclusions: no application integration, live user data, market-data request, production traffic, validation split, or holdout split.

## Frozen gates and decision rule

Nine automated gates must all pass:

1. 100% structured-output validity.
2. 100% factor-state fidelity.
3. 100% citation validity.
4. Zero novel numeric claims.
5. Zero prohibited-advice claims.
6. Zero unsupported-domain claims.
7. Zero model calls for unavailable deterministic input.
8. 100% local fallback success for provider failures and invalid output.
9. Mean measured generation cost no greater than one US cent per valid response.

If any automated gate fails, reject v1.2 and stop. Do not tune and rerun against its observed outputs. If all nine pass, the decision is `manual_review_required`; review every valid output and require 100% groundedness before considering a separately preregistered one-shot acceptance evaluation. A development pass never authorizes production use.

Run exactly once, only after this preregistration and its implementation are committed:

`npm run evaluate:transparent-analysis-ai-content-v1-2`

Retain the report and record its SHA-256 checksum and result in this document after the run.

## Recorded development result

The one-shot v1.2 development evaluation ran on 2026-09-03 and rejected `gemini-3.5-flash-lite` with 6 of 9 automated gates passing. Fifteen of the twenty generation fixtures returned outputs that passed the deterministic validator. Five requests returned no model output and were recorded as provider failures; the retained report does not include provider status or error categories, so their operational cause cannot be determined from this artifact.

Failed gates:

- structured-output validity: 75%, required 100%;
- factor-state fidelity: 75%, required 100%;
- citation validity: 75%, required 100%.

The five affected fixtures were `participation-normal`, `participation-unavailable`, `partial-missing-relative-strength`, `partial-other-warning-and-conflict`, and `ready-conflicting-numeric-evidence`. Each had only the `schema` issue code because the evaluator maps a missing provider response to a fail-closed schema result. No generated output was available for these fixtures; this is different from receiving malformed model content.

The observed p95 request duration was 1898.892944 ms. Latency was descriptive and was not an acceptance gate. Manual groundedness review was not opened because the automated gates did not all pass.

Report: `artifacts/analysis/transparent-analysis-ai-content-evaluation-v1-2.json`

Report SHA-256: `b90f7ffb1e9325a642711aefd59e6082d15e2c5ef6bbf9af99509a0001482552`
