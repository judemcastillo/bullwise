# Transparent analysis AI fact-selection v1.5 preregistration

Status: preregistered development candidate; not yet executed or authorized for production

Recorded: 2026-09-03

## Purpose

V1.4 proved that 6100 ms request-start pacing can provide reliable free-tier
Gemini availability, but it failed the manual groundedness gate when generated
prose changed a measured volume fact into the less precise phrase "baseline
volume." V1.5 removes generated prose from the model contract. Gemini may only
select and order supplied deterministic fact IDs; Bullwise renders the exact
stored fact sentences.

This is a new development experiment. V1.4 remains rejected and its artifact is
not reused or overwritten.

## Frozen architecture

1. `buildTransparentAnalysisAiInput` supplies the existing minimized daily
   context, factor states, allow-listed facts, fact IDs, and limitation codes.
2. Gemini returns no prose. It returns one to four overview fact IDs and four
   ordered factor selections.
3. Every factor selection must contain every supplied same-factor fact ID
   exactly once. Gemini may change only their order.
4. Bullwise constructs the explanation locally by copying the exact stored fact
   text for each selected ID. Context, states, limitations, and the disclaimer
   come directly from deterministic input.
5. Invalid selection, provider failure, or unavailable analysis leaves the
   original deterministic panel unchanged and exposes no partial AI result.

The model can prioritize the overview and organize factor evidence, but it
cannot paraphrase indicators, numbers, units, limitations, states, or advice.

## Frozen protocol

- Experiment version: `1.5.0`.
- Selection contract version: `1.0.0`.
- Provider and model: Google Gemini API and `gemini-3.5-flash-lite` on the
  configured free tier.
- Prompt version: `1.0.0`.
- Prompt SHA-256:
  `92f2f09e93be93a41d362956ce35d279d9f61986194f5f5c6ceb5123a4ed51d2`.
- Fixtures: the existing 32 frozen synthetic development scenarios, including
  20 generation requests. These already-observed development fixtures can never
  serve as a future production acceptance set.
- Content denominators: provider-completed generation requests.
- Pacing: at least 6100 ms between generation-request start times; the measured
  minimum must be at least 6000 ms.
- Execution: sequential requests, no Bullwise timeout, and no retries.
- Interaction assumption: Gemini is requested only after explicit user action.
- Output retention: retain synthetic input, returned fact selection, validation,
  and deterministic rendering solely for conditional manual review.
- Artifact: write once to
  `artifacts/analysis/transparent-analysis-ai-selection-evaluation-v1-5.json`;
  never overwrite it.
- Scope exclusions: no application integration, market-data request, live user
  data, production traffic, strategy validation split, or holdout split.

## Frozen gates

Eleven automated gates must all pass:

1. 100% strict selection-schema validity among provider-completed requests.
2. 100% valid overview fact IDs among provider-completed requests.
3. 100% overview evidence balance when both supporting and counter-evidence
   facts are available.
4. 100% same-factor fact-ID validity among provider-completed requests.
5. 100% complete factor-fact coverage among provider-completed requests.
6. 100% exact rendered-fact-text fidelity among provider-completed requests.
7. Zero model calls for unavailable deterministic input.
8. 100% local fallback success for synthetic provider and invalid-selection
   failures.
9. Mean measured generation cost no greater than one US cent per valid
   selection.
10. At least 90% provider completion: at least 18 of 20 generation requests.
11. At least 6000 ms measured between every adjacent generation-request start.

Manual groundedness is a twelfth gate. Every valid rendered explanation must
be checked against its deterministic input and must preserve exact fact text.

## Decision rule

If any automated gate fails, reject v1.5 and stop. Do not modify and rerun this
frozen experiment against its observed results. If all eleven automated gates pass,
mark `manual_review_required` and inspect every valid deterministic rendering.
Manual groundedness must be 100%.

Passing this development experiment does not authorize application integration.
It permits creation of a separately preregistered, previously unseen production
acceptance fixture set. That acceptance set must be frozen before any result is
viewed, and a failed acceptance run rejects the candidate.

Run exactly once, only after this preregistration and implementation are
committed:

`npm run evaluate:transparent-analysis-ai-selection-v1-5`

Retain the report and record its SHA-256 checksum and result here.
