# Transparent analysis AI explanation v1.4 preregistration

Status: preregistered development candidate; not yet executed or authorized for production

Recorded: 2026-09-03

## Purpose

This experiment combines the separated content/availability evaluation from v1.3 with the supported 6100 ms request-start pacing schedule. It tests whether the unchanged Gemini explanation candidate can meet every automated content, safety, fallback, availability, cost, and pacing gate in one frozen development run.

V1.3 remains rejected. All sixteen outputs it returned passed automated content checks, but unpaced provider completion was only 80%. The separate pacing observation subsequently completed twenty of twenty requests with zero rate-limited failures. V1.4 changes only request pacing and its verification gate; it does not tune the prompt or weaken content requirements.

## Frozen protocol

- Experiment version: `1.4.0`.
- Provider and model: Google Gemini API and `gemini-3.5-flash-lite` on the configured free tier.
- Prompt: unchanged v1.2 prompt version `1.2.0`, SHA-256 `b5bd08e20231827017d4062961f086265b4afaf93d7280806eb586989cf76114`.
- Input, output contract `1.1.0`, schema, strict validator, 32 synthetic fixtures, content denominators, fallback behavior, and 90% provider-completion threshold: unchanged from v1.3.
- Pacing: at least 6100 ms between generation-request start times; measured minimum must be at least 6000 ms.
- Execution: sequential generation requests, no Bullwise timeout, and no retries.
- Interaction assumption: Gemini is requested only after an explicit user action.
- Output retention: retain synthetic inputs, returned outputs, and validator results solely for conditional manual groundedness review.
- Latency: descriptive only and not a pass/fail gate.
- Artifact: write once to `artifacts/analysis/transparent-analysis-ai-content-evaluation-v1-4.json`; never overwrite it.
- Scope exclusions: no application integration, live user data, market-data request, production traffic, validation split, or holdout split.

## Frozen gates

Eleven automated gates must all pass:

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
11. At least 6000 ms measured between every adjacent generation-request start.

Manual groundedness is a twelfth gate and is not scored automatically.

## Decision rule

If any automated gate fails, reject v1.4 and stop. Do not tune and rerun against its observed outputs. If all eleven pass, mark `manual_review_required` and review every valid returned explanation. Every reviewed output must be fully supported by its cited deterministic facts, without changed meaning or unsupported inference. A development pass and manual review do not authorize production use; they permit only a separately preregistered production acceptance step.

Run exactly once, only after this preregistration and implementation are committed:

`npm run evaluate:transparent-analysis-ai-content-v1-4`

Retain the report and record its SHA-256 checksum and result here.
