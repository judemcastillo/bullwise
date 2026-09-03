# Transparent analysis AI explanation v1.1 preregistration

Status: preregistered development experiment; not authorized for production

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
