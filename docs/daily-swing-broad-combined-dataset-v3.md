# Daily swing combined broad dataset v3

Frozen on 2026-08-19 after both setup-scan integrity audits and before combined export, training-episode materialization, target inspection, model fitting, or performance evaluation.

Dataset version: `3.0.0`

Universe name: `daily-swing-broad-development-v2-combined`

Split-policy version: `1.0.0`

## Frozen sources

- Base scan: `daily-swing-broad-development-v1`, SHA-256 `142b4477f302abbb4f3dd8d38a9efb7265e861271a51549d3bf442296cb16217`, research policy `broad_development_v1`, 100 candidates received, 99 scanned, JNK excluded.
- Expansion scan: `daily-swing-broad-development-v2-expansion`, SHA-256 `9a21909cdc21ecc49521630cd873bd74f8711a77d276c99392618ba7fb695305`, research policy `broad_development_v2_expansion`, 30 candidates received, 28 scanned, GDXJ and OIH excluded.
- The expansion scan must also record frozen history SHA-256 `7262c1a32e3cac8651c57daee97812c72edd6d39036e310e4259b25b37559505`.

Both scans must use setup-scan version `2.0.0`, backtest version `1.3.0`, engine version `1.0.0`, strategy `daily-swing-v1-draft`, objective-feature version `1.0.0`, completed-bar-only features, independent fixed-equity labels, and the unchanged signal-time liquidity gate.

## Frozen combination policy

- Validate each source and checksum independently before joining any row.
- Join each liquidity-eligible outcome to exactly one same-instrument, same-timestamp objective snapshot using the existing audited builder.
- Add `sourceScan` as row provenance with value `base` or `expansion`; never place source identity, instrument ID, or display symbol inside the model feature vector.
- Combine and chronologically sort candidate rows before applying splits.
- Require row IDs to be unique across both sources. The outcome-blind universe rules already prohibit overlapping symbols.
- Apply the existing fixed train-before-2023, validation-2023-through-2024, and sealed-test-2025-plus boundaries.
- Purge outcomes crossing the next final-split boundary and reuse the three 2020/2021/2022 expanding walk-forward inventories with their resolution purges.
- Preserve source-specific and combined coverage, liquidity-rejection, and pre-purge row inventories.

This operation may count rows and signal sessions to verify inventory. It must not aggregate or inspect label rates, R multiples, profitability, exit distributions, per-symbol outcomes, validation metrics, or sealed-test labels.

## Export and integrity-audit result

The protected export completed on 2026-08-19. `analysis-broad-combined-dataset-v3.json` is 216,121,409 bytes, has SHA-256 `3ce82ae982ef3ac39df72fc3205788536e907cb187db061995c53730ab9b2030`, and records generation at `2026-08-19T10:25:13.706Z`.

The two sources contributed 92,676 base rows and 18,722 expansion rows. They contained 112,020 liquidity-eligible outcomes before the unchanged final-boundary purge removed 622 rows, leaving 111,398 combined rows:

- Train: 60,381 rows across 1,429 signal sessions, from 2017-03-13 through 2022-12-29.
- Validation: 25,935 rows across 500 signal sessions, from 2023-01-03 through 2024-12-27.
- Sealed test: 25,082 rows across 407 signal sessions, from 2025-01-02 through 2026-08-18.

The combined inventory records three coverage exclusions and 24,034 signal-time liquidity rejections. The expanding development inventories are:

- `evaluate_2020`: 29,969 fit rows and 10,742 evaluation rows; 2,847 boundary-crossing rows purged.
- `evaluate_2021`: 41,939 fit rows and 13,212 evaluation rows; 2,090 boundary-crossing rows purged.
- `evaluate_2022`: 56,770 fit rows and 3,140 evaluation rows; 869 boundary-crossing rows purged.

The read-only artifact audit found zero violations: source hashes and provenance match, row IDs are unique, rows are chronologically ordered, resolution never precedes signal, split and fold summaries reconcile, source tags are valid, every feature vector has the same 50 fields, every feature value is finite/string/schema-nullable, and no provenance field appears inside a feature vector. The audit did not access any row's `labels` field.

No target rate, profitability statistic, R-multiple aggregation, exit distribution, symbol ranking, model fit, validation metric, or sealed-test-label summary was calculated.

## Authorized next step

Freeze a train-only episode exporter against the exact combined dataset SHA-256. It must reuse the existing episode-first grouping, suppression, and target definitions; read and materialize only train rows; copy validation/test counts from metadata without opening their features or labels; and report only whether the 5,000-row coverage gate passes.
