# Overview selection and AI ordering product review

Recorded: 2026-09-08
Status: deterministic presentation retained; optional grounded AI synthesis implemented

## Finding

The v1.6 acceptance result establishes faithful copying of the prescribed facts.
It does not establish that the prescribed overview is representative. Gemini
changed 4/20 overview orders and 0/80 factor orders in the acceptance report
with SHA-256
`27da165d1aadf1378faefc1399d9111391e8e38e28b43f49bc9f98d8a67e8f48`.
There has been no blinded readability or user-preference study.

The source of the omission is deterministic:

- `buildTransparentAnalysisAiInput` concatenates evidence before counter-evidence.
- `deterministicBalancedOverviewFactIds` initially takes the first fact per factor.
- Its global balance rule treats any counter-evidence as sufficient, including
  missing participation. It need not include a bearish trend or momentum fact.
- The panel's counter-evidence category mixes negative direction, RSI extremes,
  disagreement, high volatility, and missing volume. It cannot reliably serve as
  a universal bearishness label.

These findings come from the input builder, overview selector, and factor
construction in `lib/analysis/transparent-analysis-panel.ts`. Do not repair this
by searching generated text for positive or negative words.

## Presentation comparisons

The following examples are retrospective illustrations from the already-opened
acceptance report. They are not new acceptance evidence, and must not be used
to retune and rerun the frozen v1.6 acceptance evaluation.

### Defensive context: acceptance-generation-09

Current deterministic overview and Gemini output are identical:

> The shortest trend slope turned slightly positive. The latest session return
> is 0.36%. Twenty-day realized volatility is 9.4%. Recent participation could
> not be measured from the supplied volume history.

Proposed grouped presentation, using the supplied factor states and exact facts:

| Section | Display |
| --- | --- |
| Context | Defensive |
| Trend — bearish | Closing price is below its 169-day trend average. The shortest trend slope turned slightly positive. |
| Momentum — bearish | The 21-day return is -2.9%. The latest session return is 0.36%. |
| Volatility — low | Twenty-day realized volatility is 9.4%. |
| Data limitation | Recent participation could not be measured from the supplied volume history. |

This preserves the positive short-term observations while making the negative
trend and multi-session return visible. The data warning no longer stands in
for conflicting directional evidence. The ordering shown here is a presentation
proposal, not an implemented or validated selection algorithm.

### Mixed context: acceptance-generation-06

| Presentation | Fact order |
| --- | --- |
| Deterministic v1.6 | Above 51-day average → latest return +0.24% → volatility 9.3% → below 176-day average |
| Gemini v1.6 | Above 51-day average → below 176-day average → latest return +0.24% → volatility 9.3% |
| Proposed grouped display | Trend: both moving-average facts together. Momentum: 21-day return -2.6% alongside latest return +0.24%. Volatility: 9.3%. |

The table abbreviates facts for comparison only; application prose should copy
the original complete sentences. Gemini's grouping is plausibly easier to read,
but it still cannot recover the omitted negative 21-day return. A fixed factor
grouping can provide the same adjacency without a provider request.

## Recommendation and implementation scope

Use a deterministic grouped overview for the next product step. Keep the context
and factor states visible, keep conflicting facts next to their own factor,
and display data limitations in a dedicated area. Preserve complete evidence in
the expandable detail sections. Do not claim AI adds value based solely on this
acceptance pass, and do not integrate Gemini solely to reorder these sentences.

For an initial implementation, prefer preserving all trend and momentum facts in
their groups rather than silently choosing a representative subset from the
current coarse evidence labels. Keep volatility and participation separately
visible; missing data must never satisfy a directional-conflict requirement.
If a shorter summary is necessary, first add explicit semantic metadata at the
deterministic fact producer (indicator identity, horizon, direction, and whether
the fact is a data limitation), then define and test a selection rule. This is a
separate design change and requires its own evaluation.

The next implementation checkpoint should test bearish factors with positive
short-term observations, mixed indicators, missing volume, high volatility,
and inputs containing only one evidence kind. Check representative coverage,
exact wording, visible limitations, and UI readability. Fix synthetic ordinal
formatting in future fixtures; preserve historical acceptance artifacts.

No live model requests, strategy validation, or strategy holdout access were
needed for this review. The v1.6 candidate and its recorded acceptance outcome
remain preserved. This document does not authorize or implement a new AI run.

## Implementation checkpoint result

The deterministic grouped presentation was implemented in commit `89b46f7`.
All supporting and counter-evidence is visible in its factor group, and missing
participation facts and provider warnings are displayed in a separate data
limitations section. Commit `e82841e` completed the focused edge-case coverage
for bearish factors with positive short-term observations, mixed indicators,
missing participation, high volatility, and factors containing only one
evidence kind. The focused component suite passes 10/10 tests.

The application was also checked manually in the local browser and the user
confirmed that the presentation works. This is a functional UI check, not a
blinded comparison showing that AI ordering improves readability.

The v1.6 Gemini ordering candidate is therefore not selected for product
integration. It passed its frozen fidelity acceptance criteria, but changed
only 4/20 overview orders and 0/80 factor orders, while the deterministic
grouping solves the identified omission without model latency or an external
dependency. Preserve the candidate, reports, and acceptance result as research
evidence; do not connect v1.6 to production solely to reorder facts.

## Revised product decision

Decided: 2026-09-12

The user subsequently tested the optional v1.6 ordering behavior and found that
it merely repeated the deterministic panel without providing useful
interpretation. That product finding supersedes the initial integration choice:
v1.6 remains valid fidelity research, but it is no longer the application
output.

The click-triggered feature now requests a narrow synthesis with four fields:
interpretation, conflicting evidence, risk conditions, and what to watch. The
input includes deterministic factor states, evidence, and the nearest available
support and resistance. Every generated section must cite the required source
categories. Local validation rejects unknown citations, invented numbers,
trading advice, unsupported data domains, direct fact-copying, and responses
that do not use basic interpretive language.

The deterministic panel remains the source of truth and loads without Gemini.
This does not reopen the rejected topic-routing research or authorize a v4
routing experiment. There is no page-load model call, chat interface,
background job, provider retry, or artificial application timeout. If Gemini is
missing, slow, unavailable, or fails validation, the deterministic analysis
stays visible and the optional synthesis fails safely.

This is an implementation result supported by synthetic provider tests, not a
new registered Gemini evaluation or evidence that the generated text is useful
across instruments. The user's manual result established that v1.6 lacked
product value; the replacement still requires direct product testing. No
strategy validation or holdout data was accessed.

## Lightweight production observation

The click-triggered synthesis endpoint records one privacy-safe operational
event per request. It stores only the outcome (`ready`, `invalid_output`,
`provider_failure`, or a request-boundary outcome), HTTP status, and one of four
coarse latency buckets. It never stores the user, instrument, prompt, facts,
levels, citations, generated text, provider response, or exact duration.

In local development these events append to
`artifacts/telemetry/transparent-analysis-v1.jsonl`, alongside the deterministic
analysis events. This observation measures reliability and response time only;
whether an explanation is useful still requires human review.

## Cache and quota protection

Validated synthesis results are cached in MongoDB for 48 hours using a SHA-256
key derived from the complete deterministic model input and prompt identity.
Repeated requests for unchanged analysis return that cached result without a
Gemini call or quota charge. Cached documents contain the validated synthesis
and expire through a TTL index.

Each authenticated user may start at most 20 uncached generations in a rolling
hour. The MongoDB counter uses optimistic revisions so concurrent requests
cannot bypass the quota, and its documents also expire through a TTL index.
Cache hits are checked before quota consumption. Telemetry distinguishes
`cache_hit` and `rate_limited` outcomes without recording user or instrument
identity.
