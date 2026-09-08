# Overview selection and AI ordering product review

Recorded: 2026-09-08
Status: review and presentation proposal; no candidate or application changes

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
