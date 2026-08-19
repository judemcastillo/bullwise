# Daily swing broad dataset v2

Frozen on 2026-08-19 after broad setup generation and before exporting the joined dataset, inspecting split target rates, fitting a model, or evaluating performance.

Dataset version: `2.0.0`

Split-policy version: `1.0.0`

Source universe: `daily-swing-broad-development-v1`

## Purpose

This dataset joins every liquidity-eligible setup outcome to its signal-time base indicators and objective-feature snapshot. Instrument ID and display symbol remain provenance fields and are not model inputs. Liquidity-rejected setups are counted for audit but excluded before labels are materialized.

The exporter must require the exact broad-development universe, setup-scan version `2.0.0`, objective-feature version `1.0.0`, completed-bar feature policy, frozen coverage and liquidity policies, and a caller-supplied SHA-256 of the source scan.

## Frozen final splits

Calendar boundaries are fixed from the previously declared 2016-01-01 through 2026-08-18 data window, not from outcome counts, target rates, returns, or model scores:

- Train: signal timestamp before `2023-01-01T00:00:00.000Z`.
- Validation: signal timestamp on or after 2023-01-01 and before `2025-01-01T00:00:00.000Z`.
- Sealed test: signal timestamp on or after `2025-01-01T00:00:00.000Z`.

If a train outcome resolves on or after validation begins, it is purged. If a validation outcome resolves on or after test begins, it is purged. All signals from one timestamp remain in one split. Test labels remain procedurally sealed; this step may inventory row counts but must not calculate test target rates, utilities, profitability, or model metrics.

## Frozen expanding walk-forward folds

Model development is limited to the train period. Each fold fits on all earlier train rows and evaluates the next calendar year:

- `evaluate_2020`: expanding fit before 2020-01-01; evaluation from 2020-01-01 through 2020-12-31.
- `evaluate_2021`: expanding fit before 2021-01-01; evaluation from 2021-01-01 through 2021-12-31.
- `evaluate_2022`: expanding fit before 2022-01-01; evaluation from 2022-01-01 through 2022-12-31.

Fit outcomes resolving into a fold's evaluation window are purged. Evaluation outcomes resolving into the next period are also purged. Episode-first selection is applied independently within every fit, fold evaluation, final validation, and final test split; an episode in one partition cannot suppress the first setup in another.

These folds are for development comparisons only. They do not authorize repeated final-validation evaluation or any sealed-test access.

## Feature and label policy

The feature vector is the union of the existing normalized signal snapshot and objective-feature schema `1.0.0`. Every numeric value must be finite or explicitly nullable under the schema. Instrument identity is excluded from the vector.

Outcome labels preserve trigger status, net R multiple, profitability, exit reason, target-one reach, and excursions. The exporter can validate structural integrity and count rows, but it must not aggregate label values during this checkpoint.

## Next authorization boundary

After export and checksum recording, only train rows may be used to materialize episodes, inspect targets, select preprocessing, or fit models. Walk-forward development must be completed and a new model experiment preregistered before final validation is opened. The sealed test remains unavailable unless the preregistered validation gates all pass.
