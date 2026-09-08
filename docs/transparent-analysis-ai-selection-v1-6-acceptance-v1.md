# Transparent analysis AI v1.6 acceptance v1 preregistration

Status: acceptance passed under the frozen fidelity criteria; product integration pending

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

## Acceptance result

The acceptance run completed on 2026-09-08. Report SHA-256:
`27da165d1aadf1378faefc1399d9111391e8e38e28b43f49bc9f98d8a67e8f48`.
The retained fixture and prompt checksums match this preregistration.

All eleven automated gates passed, with 20/20 completed requests and a minimum
observed request-start interval of 6099.423985000001 ms.

An assistant review read all twenty rendered overviews and all eighty factor
sections against their cited source text. Independent comparisons also checked
required overview membership, complete same-factor membership, rendered citation
arrays, context, states, limitations, version, and disclaimer. All twenty
renderings preserved the required facts and exact text. The final groundedness
gate passes at 20/20 under the frozen fidelity criteria. This was an assistant
review with deterministic cross-checks, not an independent human review. The
original report retains its pending manual-review field; this document records
the subsequent review without overwriting the artifact.

## Ordering value and limitations

Compared with the deterministic input order, Gemini changed 4/20 overview
orders and 0/80 factor-section orders. A changed order alone does not establish
improved readability. No blinded user preference assessment has been performed.

The review also identified a limitation in the deterministic summary rule. In
`acceptance-generation-09`, the defensive overview contains positive short-term
facts and a missing-participation warning, while the below-average price and
negative 21-day return appear only in the detailed sections. The rule's inclusion
of both evidence kinds therefore does not guarantee a representative summary of
directional conditions. This is a limitation of the fixed input selection, not
a change made by Gemini, and is outside the frozen text-and-membership gate.
Synthetic ordinal typos such as "81th" were likewise copied from the source.

Acceptance establishes compliance with the frozen contract on these synthetic
cases. It does not establish useful AI ordering, representative summaries in all
cases, live application behavior, or trading profitability. Product integration
remains pending a value assessment and review of the deterministic summary rule.
No additional provider requests were made during review. Only the authorized
synthetic acceptance report was inspected; no strategy validation or holdout
data was accessed.
