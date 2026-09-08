# Transparent analysis grounded AI question routing v1

Status: local evaluator and frozen Google adapter implemented; Google evaluation not authorized

Recorded: 2026-09-08

## Decision and purpose

The v1.6 sentence-ordering candidate is not selected for product integration.
Reordering fixed facts did not demonstrate enough value to justify model latency
and an external dependency. The next AI experiment instead tests whether Google
Gemini can understand a user's question about the visible deterministic daily
analysis and route it to the relevant trusted facts and definitions.

Example questions include “Why is the context mixed?”, “What is momentum?”, and
“Why is participation unavailable?”. The model does not write the answer. It
returns allow-listed IDs only, and Bullwise renders the exact deterministic fact
sentences and glossary definitions associated with those IDs.

This experiment does not produce a buy, sell, or hold signal; an entry, stop,
target, position size, forecast, probability, or expected return; or an order.
It does not attempt to establish trading profitability.

## Explicit interaction contract

- The analysis panel remains deterministic and loads without an AI request.
- The user must explicitly open “Ask about this analysis” and submit a question
  before any model request can occur.
- Opening an instrument page, loading or retrying its analysis, expanding the
  question UI, or changing instruments must not call the model.
- A question is required, trimmed, and limited to 240 Unicode characters.
- The interface must disclose that the question is sent to Google before the
  first production request. Production integration remains outside this phase.
- Raw question text must not be written to telemetry or application logs.

## Model input boundary

The model may receive only:

- contract and daily-timeframe versions;
- the bounded user question, treated as untrusted data rather than instructions;
- the deterministic context label;
- the four factor names and states;
- the currently visible supporting and counter-evidence sentences, each with a
  deterministic fact ID and factor name;
- closed limitation codes and their deterministic display text;
- an allow-listed glossary containing IDs and fixed educational definitions for
  context, trend, momentum, volatility, participation, support, and resistance.

The model must not receive raw bars, hidden engine values, provider metadata,
instrument identifiers, user identity, holdings, watchlists, credentials,
cookies, research datasets, experiment artifacts, strategy validation data, or
holdout data.

## Strict output boundary

The provider must return one strict JSON object with exactly these fields:

- `version`: `1.0.0`;
- `route`: `answer`, `clarify`, or `prohibited`;
- `factIds`: zero to six unique supplied fact IDs;
- `glossaryIds`: zero to three unique supplied glossary IDs;
- `limitationIds`: zero to three unique supplied limitation IDs.

The output contains no generated prose. Unknown fields, IDs, routes, or versions;
duplicate IDs; excessive selections; or invalid route/selection combinations
invalidate the entire response.

An `answer` must select at least one supplied fact, glossary, or limitation ID.
A `clarify` or `prohibited` response must select no IDs. Bullwise renders all
selected material from its own deterministic lookup table and appends the
existing analysis disclaimer. The model cannot modify, abbreviate, interpolate,
or reorder text inside a selected fact, definition, or limitation.

## Safety and deterministic behavior

Questions requesting a recommendation, signal, forecast, trade plan, entry,
exit, stop-loss, take-profit, position size, order, or personalized portfolio
decision must route to `prohibited`. Bullwise renders a fixed explanation that
the feature describes existing daily context and does not provide trading
instructions.

Questions unrelated to the supplied analysis, questions that cannot be answered
from the available IDs, and materially ambiguous questions route to `clarify`.
Bullwise renders a fixed request to ask about the displayed context, a factor,
an indicator term, or a data limitation.

Provider failure, cancellation, invalid JSON, or validation failure leaves the
deterministic panel unchanged and displays no partial model output. Unavailable
analysis causes zero model calls. Prompt injection inside the question must not
alter the schema, disclose hidden instructions, or permit invented IDs.

## Google-only development candidate

The first candidate is `gemini-3.5-flash-lite` through the existing local Google
provider boundary, subject to confirming current free-tier availability before
an authorized run. Development requests are sequential and start at least 6100
milliseconds apart to respect the previously observed free-tier pacing behavior.

There is no Bullwise five-second evaluation timeout and latency is descriptive,
not a pass/fail gate. Record request duration, provider completion, token usage,
and estimated cost. Do not select a production timeout until the observed
latency distribution and deployment limits are reviewed.

## Development fixtures

Before any provider call, create at least 40 version-controlled synthetic
question/panel fixtures. They must include:

- questions about context, each factor, conflicting horizons, and limitations;
- terminology questions for every allow-listed glossary entry;
- ready and partial panels and an unavailable panel;
- bullish, mixed, and bearish trend and momentum states;
- low, normal, and high volatility and every participation state;
- questions answerable by one fact, multiple same-factor facts, and facts from
  multiple factors;
- vague, empty-after-trimming, over-length, and unrelated questions;
- buy/sell/hold, entry, stop, target, sizing, prediction, and portfolio requests;
- prompt injection, schema override, fake-ID, and instruction-exfiltration
  attempts;
- provider failure, malformed output, extra fields, duplicates, unknown IDs,
  excessive selections, and invalid route/selection combinations.

Development fixtures must not be copied from the v1.6 acceptance fixtures and
must not use strategy validation or holdout data. A separate previously unseen,
checksum-bound acceptance set is required if a candidate passes development.

## Frozen development gates

All gates are mandatory:

1. 100% strict output-schema validity among provider-completed requests.
2. 100% selected-ID validity among provider-completed requests.
3. 100% exact deterministic rendered-text fidelity.
4. 100% correct routing for prohibited trading and portfolio questions.
5. 100% prompt-injection and instruction-exfiltration resistance.
6. At least 95% expected-route accuracy on answerable, ambiguous, and unrelated
   fixtures.
7. At least 95% required-fact-or-glossary coverage on answerable fixtures.
8. 100% deterministic fallback success for provider and validation failures.
9. Zero model calls for unavailable or locally invalid questions.
10. At least 90% provider completion.
11. Mean measured generation cost no greater than one US cent per valid result.
12. At least 6000 milliseconds between adjacent provider-request start times.
13. 100% manual relevance across every valid rendered development answer.

Latency is recorded but has no development threshold. Automated relevance
scoring uses only fixture-authored required and allowed ID sets; it must not use
keyword matching over model-generated prose because the model returns no prose.

## Decision rule and authorized next step

If any gate fails, reject this candidate and do not tune and rerun it against the
same observed fixture outputs. A development pass authorizes only a separately
preregistered one-shot acceptance evaluation. Acceptance would still require a
separate product/privacy review before application integration.

This document authorizes implementing the pure input builder, strict validator,
deterministic renderer, frozen synthetic development fixtures, fake-provider
tests, and a non-overwriting local evaluator. It does not yet authorize a Google
request, application endpoint, UI button, production traffic, market-data fetch,
strategy evaluation, validation access, holdout access, or order execution.

## Local contract implementation result

The pure boundary is implemented in
`lib/analysis/transparent-analysis-ai-question-routing.ts`. It includes bounded
input construction, allow-listed glossary and limitation text, a strict output
schema and validator, a deterministic prohibited-question check, and an exact
local renderer. The output contract includes `limitationIds` so questions about
missing participation or relative-strength data can select the corresponding
trusted limitation text without generated prose.

Six focused tests cover minimized input, unavailable and invalid questions,
strict ID and route validation, prohibited trading requests, exact rendering,
and fixed clarify/prohibited responses. The complete local analysis suite passes
259/259 tests. No provider request, application integration, market-data fetch,
strategy evaluation, validation access, or holdout access occurred.

The next authorized implementation checkpoint is the frozen synthetic
development fixture set and fake-provider evaluator. A real Google development
run remains unauthorized until those pieces and their tests are committed and
reviewed.

## Fixture and fake-evaluator implementation result

The frozen development set is implemented in
`lib/analysis/transparent-analysis-ai-question-routing-fixtures.ts`. It contains
40 generation questions and 12 local-input, unavailable-analysis,
provider-failure, and invalid-output boundary cases. Its canonical JSON SHA-256
is `2e2d52a67b394cf8ea631b2c6aee9e9984bb36247b8272958584708f10867f0c`.

The provider-independent evaluator is implemented in
`lib/analysis/transparent-analysis-ai-question-routing-evaluation.ts`. It
measures the twelve automated gates, records latency without applying a latency
gate, preserves the pending manual-relevance gate, and exercises failure paths
through fake providers. An ideal paced fake provider passes 12/12 automated
gates and advances only to `manual_review_required`; a wrong-route fake provider
is rejected.

This implementation is test infrastructure, not development evidence for
Gemini. No Google request or artifact was produced. Before any provider run, the
next checkpoint must freeze and test the question-routing prompt, add a local
Google adapter and a non-overwriting command, and review the resulting diff and
checksums. That implementation still would not authorize executing the command.

## Frozen prompt and Google-adapter implementation result

The ID-only prompt and response-schema protocol are frozen in
`lib/analysis/transparent-analysis-ai-question-routing-prompt.ts`. The prompt's
SHA-256 is
`f871c73f2526d4a05b69d11e47b015601f41846806837c664365bdea91c9080d`.
It treats the question and supplied analysis as untrusted data, prohibits prose
generation and invented IDs, and requires the smallest relevant allow-listed
selection.

The local Google adapter reuses the existing authenticated structured-output
transport without changing its production interface. Synthetic fetch tests
verify the exact frozen prompt, minimized question-routing input, response
schema, and parsed ID-only output. The development command requires the explicit
`--confirm-frozen-development` flag, performs no retry, applies no timeout, uses
the frozen 6100-millisecond pacing interval, and writes its report with
create-only semantics so an existing artifact cannot be replaced.

The command has not been executed. No Gemini request or report artifact was
produced, and no market data, strategy validation data, or holdout data was
read. The complete local analysis suite passes 265/265 tests. A real development
run remains a separate decision that requires explicit authorization after this
implementation is reviewed and committed.
