# Transparent analysis AI explanation v1.3 preregistration

Status: preregistered development candidate; not yet executed or authorized for production

Recorded: 2026-09-03

## Purpose

This experiment separates AI content correctness from temporary provider availability for the explicit-button explanation feature. A returned explanation must remain perfectly faithful, cited, safe, and valid. If Gemini does not return an explanation, Bullwise must preserve the unchanged deterministic analysis through its local fallback.

The rejected v1.2 decision remains closed. Its prompt performed correctly on all fifteen returned outputs, while five provider requests returned no output. A separate operational observation subsequently completed twenty of twenty requests but could not determine the earlier failure cause. V1.3 changes the evaluation mechanics, not the model prompt.

## Frozen protocol

- Experiment version: `1.3.0`.
- Provider and model: Google Gemini API and `gemini-3.5-flash-lite` on the configured free tier.
- Prompt: unchanged v1.2 prompt version `1.2.0`, SHA-256 `b5bd08e20231827017d4062961f086265b4afaf93d7280806eb586989cf76114`.
- Input, output contract `1.1.0`, schema, validator, fixtures, and fallback behavior: unchanged.
- Dataset: the same 32 frozen synthetic fixtures, including 20 generation fixtures and 12 unavailable-input or fallback boundary fixtures.
- Execution: sequential generation requests, no Bullwise timeout, no pacing delay, and no retry.
- Interaction assumption: Gemini is requested only after an explicit user action.
- Content denominators: structured validity, state fidelity, citation validity, and content issue counts use only requests for which the provider returned parsed model output. A zero-completion run scores zero, not a vacuous pass.
- Availability: provider completion is measured separately across all 20 generation requests.
- Latency: recorded as a descriptive observation only.
- Artifact: write once to `artifacts/analysis/transparent-analysis-ai-content-evaluation-v1-3.json`; never overwrite it.
- Scope exclusions: no application integration, live user data, market-data request, retry selection, production traffic, validation split, or holdout split.

## Frozen gates

Ten automated gates must all pass:

1. 100% structured-output validity among provider-completed requests.
2. 100% factor-state fidelity among provider-completed requests.
3. 100% citation validity among provider-completed requests.
4. Zero novel numeric claims among provider-completed requests.
5. Zero prohibited-advice claims among provider-completed requests.
6. Zero unsupported-domain claims among provider-completed requests.
7. Zero model calls for unavailable deterministic input.
8. 100% local fallback success for synthetic provider failures and invalid output.
9. Mean measured generation cost no greater than one US cent per valid response.
10. At least 90% provider completion: at least 18 of 20 generation requests.

Manual groundedness is an eleventh gate and is not scored automatically.

## Decision rule

If any automated gate fails, reject v1.3 and stop. Do not tune and rerun against its observed outputs. If all ten pass, mark `manual_review_required` and review every valid returned explanation for groundedness. Require 100% manual groundedness before considering a separately preregistered production acceptance evaluation. A development pass never authorizes production use.

Run exactly once, only after this preregistration and implementation are committed:

`npm run evaluate:transparent-analysis-ai-content-v1-3`

Retain the report and record its SHA-256 checksum and result here.
