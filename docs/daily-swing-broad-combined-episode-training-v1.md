# Daily swing combined broad train episodes v1

Frozen on 2026-08-19 after the combined dataset integrity audit and before materializing train targets or counting combined episodes.

Episode dataset version: `1.0.0`

Source dataset version: `3.0.0`

Source SHA-256: `3ce82ae982ef3ac39df72fc3205788536e907cb187db061995c53730ab9b2030`

Source universe: `daily-swing-broad-development-v2-combined`

## Frozen materialization policy

- Iterate source rows only to select rows whose split is `train`.
- Require exactly 60,381 train source rows from the audited dataset inventory.
- Do not access validation or test features or labels. Copy their row counts only from dataset metadata.
- Group train rows by instrument ID and direction.
- Select the first chronological signal, suppress later signals through that selected setup's resolution session, and then begin the next episode.
- Treat a signal on the same session as the selected resolution as suppressed.
- Apply this selection independently inside every walk-forward fit/evaluation partition and the final train partition.
- Preserve `base` or `expansion` source provenance outside the feature vector.

The target design remains `episode-first-actionable-success-v1`: actionable success requires a triggered selected setup with at least +0.5 net R after costs; setup utility is net R for triggered setups and zero for untriggered setups. No threshold or target changed after seeing expansion outcomes.

## Frozen coverage decision

The sole decision at this checkpoint is whether combined episode-first train rows are at least 5,000. Passing means only that the previously frozen sample-coverage goal is satisfied. It does not establish predictive value, profitability, independence, representativeness, or production readiness.

The exporter may report train source rows, train episode rows, the Boolean coverage result, and walk-forward source/episode counts. It must not summarize actionable-success rates, utility, profitability, returns, exits, symbols, validation data, sealed-test data, or model metrics.

## Authorized next step

Run `npm run export:analysis-broad-combined-episodes`. The protected command accepts no overrides or overwrite flag and writes `analysis-broad-combined-episode-training.json`. Then record its SHA-256 and audit row uniqueness, chronological order, non-overlap within instrument-direction groups, 50-field feature structure, finite target values, source provenance, and count reconciliation.
