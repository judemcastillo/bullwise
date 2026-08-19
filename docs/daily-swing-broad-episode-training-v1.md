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
