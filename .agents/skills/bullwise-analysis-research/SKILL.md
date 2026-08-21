---
name: bullwise-analysis-research
description: Work on Bullwise technical-analysis research, backtesting, datasets, model training, experiment evaluation, and holdout safeguards. Use for analysis research tasks; do not use for ordinary UI or application work.
---

# Bullwise analysis research

Support reproducible technical-analysis research while limiting unnecessary context, computation, and accidental experiment contamination.

## Choose only the relevant source

Read only the documentation needed for the current task:

- Backtesting behavior: `docs/daily-swing-backtesting.md`
- Current research direction: `docs/daily-swing-next-research.md`
- Objective features: `docs/daily-swing-objective-features-v1.md`
- Dataset construction: read only the applicable versioned dataset document.
- Registered experiments: read only the applicable preregistration document.

Do not load every research document by default.

## Generated artifacts

- Do not read complete root-level JSON histories, scans, datasets, or reports.
- Use script console summaries for routine inspection.
- If detailed investigation is necessary, extract only the required fields, symbol, date range, or small sample with a deterministic command.
- Never print full datasets or large report sections into the conversation.

## Execution boundaries

- Prefer deterministic TypeScript implementations for indicators, labels, trade simulation, dataset construction, and metrics.
- Do not fetch market data, run broad scans, train models, execute full backtests, or replace artifacts unless the user's task explicitly requires it.
- Never pass `--force` merely to make a command succeed.
- Preserve existing artifacts unless replacement is explicitly authorized.

## Validation and holdouts

- Treat validation and holdout evaluations as potentially one-shot operations.
- Read the applicable preregistration before implementing or invoking an evaluator.
- Never open a sealed split merely for debugging, exploration, or tuning.
- Develop evaluators with synthetic fixtures and training-only data.
- Require the documented confirmation flags, checksums, gates, and user authorization before a real one-shot evaluation.
- A failed registered experiment is rejected; do not tune and rerun it on the same validation or holdout data.

## Efficient verification

- Run the smallest directly relevant test file during implementation.
- Run `npm run test:analysis` only at a final verification checkpoint or when the user requests the complete analysis suite.
- Do not rerun an unchanged expensive command to obtain the same result.
- Separate implementation verification from research evaluation.

## Reporting

Report only:

- What changed
- Verification performed
- Key metrics or failures
- Artifact paths and checksums when relevant
- Whether validation or holdout data was accessed

Clearly distinguish implementation results, development evidence, and sealed evaluation evidence.
