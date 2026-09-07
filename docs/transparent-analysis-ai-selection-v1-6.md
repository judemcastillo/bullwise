# Transparent analysis AI deterministic-overview ordering v1.6 preregistration

Status: preregistered development candidate; not yet executed or authorized for production

Recorded: 2026-09-07

## Purpose

V1.5 prevented Gemini from rewriting deterministic facts, but it allowed the
model to choose overview membership. Eleven of twenty overviews selected only
supporting evidence while available counter-evidence was omitted. V1.6 removes
that decision from the model.

Bullwise now fixes a balanced overview fact set before the request. Gemini may
only order that already-approved overview set and the complete fact set within
each factor. Bullwise still renders the original fact text exactly. V1.5 remains
closed and rejected, and its artifact is not reused or overwritten.

## Frozen deterministic overview

For each available deterministic input, Bullwise constructs
`requiredOverviewFactIds` as follows:

1. Take the first supplied fact from trend, momentum, volatility, and
   participation, in that order, up to four facts.
2. Inspect all supplied facts. If both supporting evidence and counter-evidence
   exist but the selected set lacks one kind, replace the last selected fact of
   the other kind with the first available fact of the missing kind in factor
   order.
3. Send this fixed one-to-four-ID set to Gemini as part of the minimized input.

Gemini must return every required overview ID exactly once. It may change only
their order. It must also return every supplied same-factor fact ID exactly once
for trend, momentum, volatility, and participation in that order.

## Frozen rendering and failure behavior

Gemini returns IDs only and cannot generate visible prose. After validation,
Bullwise copies the exact deterministic fact text for each returned ID. Context,
factor states, limitations, and the disclaimer remain deterministic.

An unknown, missing, duplicate, additional, or cross-factor ID rejects the
entire AI result. A different but otherwise valid overview membership also
rejects it. Unavailable analysis causes no model call. Provider failure or
invalid output leaves the unchanged deterministic panel available and exposes no
partial AI result.

## Frozen protocol

- Experiment version: `1.6.0`.
- Selection contract version: `1.0.0`.
- Provider and model: Google Gemini API and `gemini-3.5-flash-lite` on the
  configured free tier.
- Prompt version: `1.1.0`.
- Prompt SHA-256:
  `ffadcf37dc8e453150aa072a9b59c7061fed8701b7c12fb0171b03d55c0271e1`.
- Fixtures: the existing 32 frozen synthetic development scenarios, including
  20 generation requests. These observed development fixtures cannot serve as a
  future production acceptance set.
- Content denominators: provider-completed generation requests.
- Pacing: at least 6100 ms between request starts; the measured minimum must be
  at least 6000 ms.
- Execution: sequential requests, no Bullwise timeout, and no retries.
- Interaction assumption: Gemini is requested only after explicit user action.
- Output retention: retain synthetic input, returned ID order, validation, and
  deterministic rendering solely for conditional manual review.
- Artifact: write once to
  `artifacts/analysis/transparent-analysis-ai-selection-evaluation-v1-6.json`;
  never overwrite it.
- Scope exclusions: no application integration, market-data request, live user
  data, production traffic, strategy validation split, or holdout split.

## Frozen gates

Eleven automated gates must all pass:

1. 100% strict selection-schema validity among provider-completed requests.
2. 100% valid overview fact IDs among provider-completed requests.
3. 100% exact required-overview membership among provider-completed requests.
4. 100% same-factor fact-ID validity among provider-completed requests.
5. 100% complete factor-fact coverage among provider-completed requests.
6. 100% exact rendered-fact-text fidelity among provider-completed requests.
7. Zero model calls for unavailable deterministic input.
8. 100% local fallback success for synthetic provider and invalid-selection
   failures.
9. Mean measured generation cost no greater than one US cent per valid result.
10. At least 90% provider completion: at least 18 of 20 generation requests.
11. At least 6000 ms measured between every adjacent generation-request start.

Manual groundedness is a twelfth gate. Every valid rendering must be checked
against its deterministic input and preserve exact fact text and membership.

## Decision rule

If any automated gate fails, reject v1.6 and stop. Do not modify and rerun the
frozen experiment against its observed results. If all eleven automated gates
pass, mark `manual_review_required` and inspect every valid deterministic
rendering. Manual groundedness must be 100%.

A development pass does not authorize product integration. It permits a later
decision about whether model-based ordering adds enough value to justify an API
call. If Bullwise continues, a separately preregistered and previously unseen
production acceptance fixture set must pass before integration.

Run exactly once, only after this preregistration and implementation are
committed:

`npm run evaluate:transparent-analysis-ai-selection-v1-6`

Retain the report and record its SHA-256 checksum and result here.
