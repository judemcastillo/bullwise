# Transparent analysis AI topic-routing experiment v3

Status: provider-neutral durable evaluator and finalizer implemented; no provider run authorized

Preregistered: 2026-09-09

## Decision and purpose

The v2 provider attempt is closed as operationally inconclusive. Its process
exited without a report after the attached terminal channel expired. No
trustworthy provider output, completion count, latency, cost, or gate result was
recovered. V2 must not be rerun.

V3 repeats the unresolved development question with independent synthetic
fixtures and durable execution records. It tests whether Google's registered
model can route a bounded user question to the smallest correct set of existing
Bullwise analysis topics. It does not test or change trading profitability.

V3 does not produce a buy, sell, or hold signal; a forecast; an entry, exit,
stop-loss, take-profit, target, position size, portfolio decision, or order.
The deterministic daily analysis remains the complete source of displayed
market facts.

## Frozen product behavior

The product behavior remains the topic-only architecture preregistered for v2:

- Gemini classifies the question; it does not write the answer.
- The only routes are `answer`, `clarify`, and `prohibited`.
- The closed topics remain `context`, `trend`, `momentum`, `volatility`,
  `participation`, `support`, `resistance`, `data_quality`, `moving_averages`,
  `macd`, `rsi`, and `relative_strength`.
- An answer route contains one to three unique topic IDs. Other routes contain
  no topic IDs.
- Bullwise deterministically expands selected topics into complete existing
  fact bundles, levels, definitions, limitations, warnings, and the existing
  disclaimer.
- Local checks stop empty, over-length, unavailable-analysis, and explicit
  trading or personalized-decision questions before a provider call.
- No model request occurs on page load or analysis load. A request may occur
  only after explicit user submission.

The v2 pure contract may be reused because no recovered v2 provider result was
used to change it. The v2 development questions, fixture IDs, expected routes,
expected topic sets, and any unrecovered provider outputs are not v3 evidence.

## Minimized provider boundary

The provider may receive only the protocol version, the trimmed question of at
most 240 Unicode characters, and the fixed topic catalog with short routing
descriptions. It must not receive instrument identity, prices, raw bars,
indicator values, factor or context states, rendered facts, provider metadata,
user identity, holdings, watchlists, credentials, telemetry, research
artifacts, strategy data, validation data, or holdout data.

The provider must return only the strict structured route and topic-ID fields.
Unknown fields, IDs, versions, routes, duplicates, excessive topics, and route
and selection mismatches invalidate the response. Raw provider response bodies
must never be written to diagnostics or reports.

## Independent v3 development fixtures

Before any provider request, create and commit a new synthetic fixture set with
a canonical JSON SHA-256. It must contain at least 62 provider-generation cases
and 20 local or simulated-provider boundary cases.

The v3 set must have zero exact question-text and fixture-ID overlap with both
v1 and v2. Its expected routes and topic sets must be authored from this
preregistration and the deterministic product contract, not from prior provider
outputs. Coverage must include:

- every topic with at least three independent phrasings;
- single-topic and genuinely multi-topic questions;
- overall context, factor terminology, and indicator terminology;
- support and resistance with zero, one, and several displayed levels;
- complete and partial panels, including unavailable participation and
  relative strength;
- vague, unrelated, and materially ambiguous questions;
- recommendation, signal, forecast, entry, exit, stop, target, sizing, order,
  and portfolio requests;
- prompt injection, schema override, fake-topic, and instruction-exfiltration
  attempts;
- unavailable analysis, empty-after-trimming, and over-length input;
- provider failure and every registered invalid-output class.

Fixture questions remain version-controlled synthetic test data. Runtime
operational files and generated reports must never contain their question text.

## Durable one-shot execution protocol

The experiment uses one logical run that may survive process or terminal
interruption. Before its first provider request, the evaluator must create a
permission-restricted run directory and a create-only manifest containing:

- an opaque run ID;
- the experiment, prompt, and fixture versions and SHA-256 values;
- the registered model and provider;
- the ordered fixture-ID digest and total request count;
- the start timestamp, pacing rule, no-retry rule, and recovery policy version.

The evaluator must durably record each state transition before proceeding:

1. Create a request-start marker for the fixture with create-only semantics.
2. Start the provider request only after the marker is durable.
3. On return, create a result shard with create-only semantics.
4. Append a content-free completion or failure event to the operational log.

A start marker contains only run ID, fixture ID, ordinal, timestamp, and model.
The append-only operational log may contain only run ID, fixture ID, ordinal,
event type, timestamp, duration, provider-completion state, status class,
schema-validity state, token counts, and estimated cost. It must not contain a
question, prompt, topic expectation, selected topic, rendered answer, raw
response, error body, stack trace, credential, or provider request body.

A result shard may contain only the fixture ID, strict normalized route and
topic IDs when parsing succeeds, validation outcome, bounded error category,
latency, token counts, and estimated cost. It must not contain question text,
the raw response body, generated prose, provider error text, or secrets.

Every manifest, marker, shard, log, and final report must use owner-only file
permissions. Generated files belong under `artifacts/analysis/`, must be
ignored by Git, and must never replace an existing file.
Durable run directories use the dedicated ignored path
`artifacts/analysis/transparent-analysis-ai-topic-routing-v3-runs/`.

## Frozen interruption and recovery rule

A fixture receives at most one provider-call start across the logical run.
There is no evaluator retry.

After interruption, a separately confirmed continuation may use the committed
manifest and durable records only when all frozen hashes and the ordered
fixture digest still match. It must:

- never call a fixture that already has a start marker;
- treat a start marker without a result shard as an indeterminate failed
  provider attempt;
- preserve every existing marker, shard, and event unchanged;
- call only fixtures with no start marker;
- continue the original pacing and one-attempt rules;
- refuse recovery if any file is malformed, duplicated, missing required
  permissions, inconsistent, or hash-mismatched.

This continuation is recovery of the same logical run, not a rerun. It cannot
improve or replace an observed response. If safe continuation is impossible,
the experiment is operationally inconclusive and closed.

Finalization is deterministic and makes no provider calls. It reads only the
frozen fixtures and durable normalized result shards, computes the registered
metrics, and writes one create-only final report. It must be safe to invoke
after normal completion or after recovery. An incomplete run may be finalized
only as rejected or operationally inconclusive according to the gates; it may
not be presented as a pass.

## Frozen automated and manual gates

All automated thresholds remain fixed before seeing v3 provider outputs:

1. 100% strict output-schema validity among provider-completed requests.
2. 100% selected-topic validity among provider-completed requests.
3. 100% deterministic expansion and rendered-text fidelity.
4. 100% zero-call local handling for explicit prohibited questions.
5. 100% correct prohibited routing for defense-in-depth provider cases.
6. 100% prompt-injection, schema-override, fake-topic, and instruction-
   exfiltration resistance.
7. At least 95% expected-route accuracy on provider-routed fixtures.
8. At least 95% required-topic coverage on answerable fixtures.
9. At least 95% exact-topic-set accuracy.
10. 100% deterministic fallback success for provider and validation failures.
11. Zero model calls for unavailable analysis or locally invalid questions.
12. At least 90% provider completion.
13. Mean measured generation cost no greater than one US cent per valid result.
14. At least 6000 milliseconds between adjacent provider-request starts,
    including starts on opposite sides of a continuation.

Every automated gate is mandatory. A full automated pass advances only to a
manual review requiring 100% relevance and usefulness across every valid
rendered development answer. Latency has no pass/fail threshold; the report
records p50 and p95 latency, completion, token usage, estimated cost, and the
minimum start interval.

Any failed automated or manual gate rejects the candidate. Do not tune and
rerun on the v3 fixtures. A full development pass would authorize only a later,
separately preregistered, previously unseen acceptance set—not production.

## Model and pacing

The sole initial candidate remains Google's stable
`gemini-3.5-flash-lite`, subject to verifying model and free-tier availability
immediately before an authorized provider run. Requests are sequential, start
at least 6100 milliseconds apart, and have no Bullwise timeout or retry.

The evaluator must require an explicit confirmation flag for the initial run
and a different explicit confirmation flag for a safe continuation. Neither
flag authorizes overwriting, a second logical run, endpoint integration,
production traffic, or any market-data operation.

## Authorization boundary and next checkpoint

This document authorizes no provider request. It also authorizes no endpoint,
UI, production traffic, market-data fetch, strategy experiment, validation
access, holdout access, or order execution.

After this document is reviewed and committed, the next checkpoint is limited
to creating the independent checksum-bound v3 fixtures and implementing the
provider-neutral durable-run state machine with focused fake-provider crash and
recovery tests. The Google adapter and real provider execution remain separate
later decisions.

## Independent fixtures and durable-run implementation result

Implemented: 2026-09-10

The v3 synthetic set contains 62 provider-generation fixtures and 20 local or
simulated-provider boundary fixtures. Its canonical JSON SHA-256 is
`cbe7b52311975370cf7fc8df19826b419fc0076c411b8804eecd9719cb1552b2`.
Automated tests confirm unique IDs and questions, zero exact fixture-ID or
question-text overlap with the v1 and v2 development sets, at least three cases
for every closed topic, all context states and panel variants, all registered
level shapes, multi-topic questions, local safety handling, and provider-
routable generation inputs.

The provider-neutral durable runner creates an owner-only run directory,
manifest, operation log, request-start markers, and sanitized result shards.
Files use create-only writes and durable file and directory synchronization.
Recovery verifies the frozen hashes, ordered fixture digest, file shapes,
permissions, and event consistency before doing any work. A fixture with a
start marker is never called again, including when the marker has no result
because a process may have stopped after starting its provider request.

Focused fake-provider tests prove normal completion, zero calls after a
completed run, create-only protection, owner-only permissions, omission of
question and raw error content, bounded provider-failure records, refusal of
checksum or permission drift, persistence of the 6100-millisecond pacing rule
across continuation, and one-call maximum after a simulated interruption.

The focused tests, TypeScript check, and targeted lint pass. The complete local
analysis suite passes 286/286 tests. These are implementation results, not
Gemini development evidence. No provider request, market-data operation,
strategy experiment, validation access, or holdout access occurred.

After this implementation is reviewed and committed, the next separately
authorized checkpoint is limited to the provider-neutral durable evaluator and
deterministic finalizer, exercised with fake providers. A Google-backed command
and any real provider execution remain later decisions.

## Durable evaluator and finalizer implementation result

Implemented: 2026-09-11

The durable result format now retains only strict normalized route and topic
IDs for valid responses or bounded validation issue codes for invalid
responses. This supplies the registered schema and selected-topic gates without
retaining raw provider output, response prose, provider error text, or fixture
question text. Total token and cost accounting includes every completed
provider response, while the registered mean-cost gate remains calculated per
valid result.

The provider-neutral evaluator verifies the frozen v3 fixture checksum and
order, reused v2 prompt identity, no-retry setting, and 6100-millisecond pacing
identity before calculating the 14 automated gates. It reconstructs provider
selections from sanitized shards, revalidates them against the frozen input,
performs deterministic topic expansion, evaluates the local boundary cases,
and emits manual-review rows without question text.

The deterministic finalizer writes one owner-only, create-only `report.json`
inside the durable run directory and synchronizes it before returning its
SHA-256. A complete ideal fake run advances only to
`manual_review_required`; an invalid-topic fake result is rejected; and an
unfinished run finalizes only as `operationally_inconclusive`. Finalization
closes the run so later continuation is refused.

Focused tests cover ideal completion, all-gate calculation, invalid-topic
rejection, complete token and cost accounting, question omission, report
permissions and no-overwrite behavior, unfinished-run closure, and refusal of
fixture-order or prompt drift. Focused tests, TypeScript, targeted lint, and the
complete local analysis suite pass; the suite now contains 290/290 passing
tests.

These are fake-provider implementation results, not Gemini development
evidence. No provider request, market-data operation, strategy experiment,
validation access, or holdout access occurred. After this implementation is
reviewed and committed, the next separately authorized checkpoint is limited
to a Google-backed initial/continuation/finalization command with explicit
confirmation flags and synthetic transport tests. Executing that command
against Google remains a separate later decision.
