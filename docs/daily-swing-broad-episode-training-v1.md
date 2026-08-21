# Daily swing broad episode training v1

Frozen on 2026-08-19 before materializing real train episodes or inspecting broad train targets.

Episode dataset version: `1.0.0`

Source dataset version: `2.0.0`

Frozen source SHA-256: `bcb6870affcaed823d188703776a30ffed9d571e60440a7257c5742bd94ed23e`

## Purpose and access boundary

This artifact materializes episode-first rows from the train split only. Validation and test features and labels remain unread and unmaterialized. Their source row counts may be copied from the frozen v2 dataset metadata.

The current checkpoint reports episode inventory and whether the predeclared 5,000-training-episode coverage goal passes. It does not report target rates, utility aggregates, profitability, model metrics, validation results, or test results.

## Frozen episode policy

Within each instrument and direction, select the earliest signal. Suppress later signals whose timestamp is on or before that selected setup's resolution timestamp, then select the next signal and repeat. A signal on the same session as resolution is suppressed.

Selection is applied independently to:

- the final train split;
- each expanding walk-forward fit partition;
- each walk-forward evaluation partition;
- final validation and final test when a future preregistered evaluation explicitly authorizes them.

An episode selected in one partition cannot suppress the first episode in another partition.

## Targets

The already frozen `episode-first-actionable-success-v1` target design is retained for train rows:

- Actionable success: a triggered setup with net utility of at least `0.5R`.
- Setup utility: net R multiple for a triggered setup and zero for an untriggered setup.

Targets may be stored for later train-only development, but this coverage checkpoint must not aggregate or report them.

## Coverage gate

The frozen broad-universe goal requires at least 5,000 episode-first train rows before fitting another model. Passing this gate means only that sample breadth is sufficient to continue; it is not a performance gate.

## Materialization result

The train-only materialization completed on 2026-08-19 with generated-at timestamp `2026-08-19T08:36:46.412Z`. `artifacts/analysis/analysis-broad-episode-training.json` is 7.8 MB and has SHA-256 `0177033023ce7ac11aa1d05d927a0de44324cb250dc01a98d9d8bf1ea1d295f1`.

The 51,038 train setup rows produced 4,620 episode-first rows across 97 instrument-direction groups. The 5,000-row coverage gate **fails by 380 episodes**.

Independent walk-forward inventories are:

- `evaluate_2020`: 2,349 fit episodes from 25,751 rows; 843 evaluation episodes from 8,773 rows.
- `evaluate_2021`: 3,213 fit episodes from 35,628 rows; 987 evaluation episodes from 11,019 rows.
- `evaluate_2022`: 4,196 fit episodes from 47,981 rows; 407 evaluation episodes from 2,662 rows.

A read-only integrity audit found zero violations: all 4,620 row IDs are unique and chronologically ordered, no selected signal overlaps the prior selected episode for its instrument and direction, every feature vector has 50 fields, target values are structurally valid and finite, and artifact counts reconcile. Validation and test features and labels were not read.

No target distribution, utility aggregation, profitability result, feature ranking, model fit, validation metric, or test statistic was calculated.

Because coverage fails, another model must not be fitted from this artifact. The target, episode rule, and 2023 validation boundary must not be weakened after seeing this count. The next permissible research step is to freeze an outcome-blind source expansion—such as additional liquid instruments or earlier eligible history—before retrieving or inspecting its setup outcomes.
