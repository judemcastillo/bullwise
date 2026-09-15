# Transparent analysis AI explanation v1.4 preregistration

Status: closed and rejected; not authorized for production

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

## Development result

The one-shot evaluation ran on 2026-09-03 and wrote
`artifacts/analysis/transparent-analysis-ai-content-evaluation-v1-4.json` with
SHA-256
`c0b15f104ae69a2e22b7926285de858a3a3e39d3d722a5a62473dddc2b000c87`.
`gemini-3.5-flash-lite` passed all eleven automated gates and completed all
twenty generation requests under the frozen 6100 ms request-start pacing
schedule.

The required manual groundedness review examined every returned explanation.
Nineteen of twenty outputs preserved the meaning of their cited deterministic
facts. The `context-mixed-bearish` overview described volume as "baseline
volume," although its cited fact said that latest volume was 0.8 standard
deviations from its 20-day baseline. That compression can imply that volume was
at the baseline and therefore does not satisfy the frozen requirement for fully
supported prose without changed meaning.

Manual groundedness was 95%, below the required 100%, so the twelfth gate failed
and v1.4 is rejected. This result does not authorize product integration. The
artifact must not be overwritten, and v1.4 must not be tuned and rerun against
these observed outputs. No strategy validation or holdout data was read.
