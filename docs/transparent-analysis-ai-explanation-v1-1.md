# Transparent analysis AI explanation v1.1 preregistration

Status: development candidate rejected; not authorized for production

Recorded: 2026-09-03

## Purpose

This experiment tests whether a narrowly revised prompt can make Google Gemini 3.5 Flash-Lite reliably restate the existing deterministic daily market analysis. The model remains an explanation layer only. It cannot create or change context labels, factor states, facts, limitations, trading signals, entries, stops, targets, or position sizes.

The prior v1 development candidate was rejected. Gemini 3.5 Flash-Lite produced 20 responses, but only 9 were fully valid. The failures included numeric-token rewrites, fact IDs appearing in prose, and prohibited directional wording. Gemini 3.5 Flash did not return output within the frozen five-second deadline. Those v1 results remain historical evidence and are not overwritten.

## Frozen hypothesis

Gemini 3.5 Flash-Lite will meet all ten automated gates when the prompt explicitly separates prose from citation arrays, requires complete numeric tokens to be copied verbatim, and forbids prohibited terms inside compounds.

## Fixed v1.1 changes

- AI input, output schema, prompt, and evaluation report versions are `1.1.0`.
- Fact IDs may appear only in `factIds` arrays, never in prose.
- Numeric prose is discouraged. Any necessary numeric token must be copied completely and exactly from a cited fact, including punctuation and suffixes such as `%`, `th`, or `day`.
- Prohibited directional terms remain prohibited when embedded in compounds such as `long-term` and `short-term`.
- The development report has a new non-overwriting path: `artifacts/analysis/transparent-analysis-ai-development-evaluation-v1-1.json`.

No other prompt tuning is permitted after the v1.1 development output is viewed.

## Unchanged experiment design

- Provider: Google Gemini API.
- Candidate: `gemini-3.5-flash-lite`, using the configured free tier.
- Dataset: the same 32 frozen synthetic development fixtures—20 generation fixtures and 12 unavailable-input, failure, or invalid-output boundary fixtures.
- Input facts, fixture content, strict validator, fallback behavior, eleven gates, thresholds, and five-second per-request deadline are unchanged.
- Ten gates are automated. The eleventh, groundedness, requires manual review of every valid generated explanation.
- No live user data, production integration, validation set, or holdout set is accessed.

## Decision rule

Run `npm run evaluate:transparent-analysis-ai-candidate` exactly once for v1.1.

- If any automated gate fails, reject v1.1 and stop. Do not tune against the same observed outputs.
- If all ten automated gates pass, mark the result `manual_review_required` and review every output for groundedness before considering an independently preregistered one-shot acceptance evaluation.
- A development pass never authorizes production use.

The generated report must be retained with its SHA-256 checksum. Any later experiment must receive a new version, prompt checksum, artifact path, and preregistration before execution.

## Recorded development result

The one-shot v1.1 development evaluation ran on 2026-09-03 and rejected `gemini-3.5-flash-lite` with 6 of 10 automated gates passing. None of the 20 generation fixtures returned a usable output within the fixed request boundary, so manual groundedness review was not applicable and the revised prompt's compliance hypothesis was not established.

Failed gates:

- structured output validity: 0%, required 100%;
- factor-state fidelity: 0%, required 100%;
- citation validity: 0%, required 100%;
- p95 generation latency: 5020.185425 ms, required at most 5000 ms.

The other six automated gates passed, including zero novel numeric, prohibited-advice, unsupported-domain, and unavailable-input-call violations, 100% local fallback success, and zero measured free-tier generation cost. The zero content-violation counts reflect the absence of model output; they are not evidence of prompt compliance.

Report: `artifacts/analysis/transparent-analysis-ai-development-evaluation-v1-1.json`

Report SHA-256: `4c6f598342a621c292ccba046be836e874624fae5bfd00297ec07e34a88650ba`

Prompt SHA-256: `8a84ba9f2d42aaa1daca80761f7fb610e14127ebc1100d6619f158cd9306f84a`
