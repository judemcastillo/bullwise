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

## Authorized next step

Run `npm run export:analysis-broad-combined-dataset`. The protected command accepts no overrides or overwrite flag and writes `analysis-broad-combined-dataset-v3.json` with the streaming large-file writer.

After export, record its SHA-256 and audit chronological order, unique row IDs, resolution order, source provenance, split/fold inventories, feature-schema uniformity, finite-or-null values, and absence of provenance fields from feature vectors. Only after that audit passes may a train-only episode exporter be frozen against the exact dataset hash.
