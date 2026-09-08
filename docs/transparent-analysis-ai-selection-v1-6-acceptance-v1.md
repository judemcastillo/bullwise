# Transparent analysis AI v1.6 acceptance v1 preregistration

Status: sealed and preregistered; not yet executed or authorized for production

Recorded: 2026-09-07

## Prerequisite and purpose

The v1.6 deterministic-overview ordering candidate passed development with
11/11 automated gates, 20/20 provider completions, and 20/20 manually grounded
renderings. Its development artifact has SHA-256
`6db654929401a17350a8ac6120102c57e48a76e5b998c3b62b0a31a41f3f0b78`.

This acceptance experiment tests that unchanged candidate once against a new
synthetic fixture set that was not sent to Gemini during development. It tests
contract compliance, deterministic membership, exact rendering, provider
availability, pacing, and fallback behavior. It does not test trading
profitability or prediction quality.

## Frozen candidate

- Candidate version: `1.6.0`.
- Provider and model: Google Gemini API and `gemini-3.5-flash-lite` on the
  configured free tier.
- Selection contract version: `1.0.0`.
- Prompt version: `1.1.0`.
- Prompt SHA-256:
  `ffadcf37dc8e453150aa072a9b59c7061fed8701b7c12fb0171b03d55c0271e1`.
- Deterministic overview algorithm, output schema, validator, exact-text
  renderer, fallback behavior, and decision thresholds: unchanged from the
  passed v1.6 development candidate.
- Execution: sequential, at least 6100 ms between request starts, no Bullwise
  timeout, and no retries.

## Sealed acceptance fixtures

- Fixture-set version: `1.0.0`.
- Fixture count: 32.
- Live generation fixtures: 20.
- Unavailable-input fixtures: 3.
- Synthetic provider-failure fixtures: 1.
- Synthetic invalid-output fixtures: 8.
- Canonical fixture JSON SHA-256:
  `1db7f16b9eb1c8ad204932c29ebfe69901a3190df30bc25c3085f4125c0999db`.

The fixtures use new synthetic instrument identifiers, trend and momentum
descriptions, lookback periods, numeric values, volume descriptions, warnings,
and state combinations. A version-controlled test requires zero reused fact
sentences from the development fixtures. These fixtures must not be sent to the
provider before this preregistration and implementation are committed.

## Frozen gates

The same eleven automated v1.6 gates must all pass:

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

Manual groundedness is a twelfth gate. Every valid acceptance rendering must be
reviewed against its input and pass.

## One-shot decision rule

If any automated or manual gate fails, reject the v1.6 candidate for integration.
Do not alter and rerun this acceptance set after observing its outputs. If every
gate passes, mark acceptance passed. That result permits a separate application
integration checkpoint; it does not itself enable production model calls or
authorize trading signals, recommendations, or order execution.

The report must be written once to
`artifacts/analysis/transparent-analysis-ai-selection-acceptance-v1.json` and
must never be overwritten.

Run exactly once, only after this document, fixtures, evaluator, tests, and
script are committed:

`npm run accept:transparent-analysis-ai-selection-v1-6`

Retain the report and record its SHA-256 checksum and result here.
