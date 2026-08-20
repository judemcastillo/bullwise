# Daily swing combined broad train episodes v1

Frozen on 2026-08-19 after the combined dataset integrity audit and before materializing train targets or counting combined episodes.

Episode dataset version: `1.0.0`

Source dataset version: `3.0.0`

Source SHA-256: `3ce82ae982ef3ac39df72fc3205788536e907cb187db061995c53730ab9b2030`

Source universe: `daily-swing-broad-development-v2-combined`

## Frozen materialization policy

- Iterate source rows only to select rows whose split is `train`.
- Require exactly 60,381 train source rows from the audited dataset inventory.
- Verify the complete source checksum first, then structurally scan the rows array and deserialize only train rows. Read only the top-level split field for validation/test rows and reconcile their counts against dataset metadata; do not deserialize or inspect their features or labels.
- Group train rows by instrument ID and direction.
- Select the first chronological signal, suppress later signals through that selected setup's resolution session, and then begin the next episode.
- Treat a signal on the same session as the selected resolution as suppressed.
- Apply this selection independently inside every walk-forward fit/evaluation partition and the final train partition.
- Preserve `base` or `expansion` source provenance outside the feature vector.

The target design remains `episode-first-actionable-success-v1`: actionable success requires a triggered selected setup with at least +0.5 net R after costs; setup utility is net R for triggered setups and zero for untriggered setups. No threshold or target changed after seeing expansion outcomes.

## Frozen coverage decision

The sole decision at this checkpoint is whether combined episode-first train rows are at least 5,000. Passing means only that the previously frozen sample-coverage goal is satisfied. It does not establish predictive value, profitability, independence, representativeness, or production readiness.

The exporter may report train source rows, train episode rows, the Boolean coverage result, and walk-forward source/episode counts. It must not summarize actionable-success rates, utility, profitability, returns, exits, symbols, validation data, sealed-test data, or model metrics.

## Materialization and integrity-audit result

The protected train-only materialization completed on 2026-08-19. `analysis-broad-combined-episode-training.json` is 9,734,231 bytes, has SHA-256 `0233cf9961e916e3079694ce0c887ba7f38ca4b5870271e9e769b563abea2a6b`, and records generation at `2026-08-19T10:32:27.030Z`.

The 60,381 train setup rows produced 5,504 episode-first rows across 125 instrument-direction groups. The frozen 5,000-row coverage gate **passes by 504 episodes**.

Walk-forward episode inventories are:

- `evaluate_2020`: 2,757 episodes from 29,969 fit rows and 1,031 episodes from 10,742 evaluation rows.
- `evaluate_2021`: 3,813 episodes from 41,939 fit rows and 1,197 episodes from 13,212 evaluation rows.
- `evaluate_2022`: 5,014 episodes from 56,770 fit rows and 468 episodes from 3,140 evaluation rows.

The read-only integrity audit found zero violations: all 5,504 row IDs are unique and chronologically ordered; resolution never precedes signal; no selected signal overlaps the prior selected episode for its instrument and direction; source tags are valid; every feature vector has 50 fields with no provenance leakage; target values are structurally valid and finite; and artifact, coverage, and walk-forward counts reconcile.

Validation contains 25,935 source rows and sealed test contains 25,082 source rows. No actionable-success rate, utility aggregate, profitability measure, return, exit distribution, symbol ranking, validation metric, sealed-test metric, or model result was calculated.

## Post-materialization safeguard correction

An implementation audit on 2026-08-20 found that the original exporter used whole-file `JSON.parse`, which deserialized validation/test fields into memory even though no code inspected or summarized their values. The exporter is now hardened to verify the complete checksum first, deserialize train rows only, read only the top-level split field for non-train rows, reconcile all split counts, and require exactly 60,381 train rows. Synthetic tests prove that validation/test feature and label payloads are not passed to `JSON.parse`. The existing episode artifact was not replaced, and its recorded checksum remains unchanged.

## Authorized next step

Freeze a train-only walk-forward model-development protocol against this exact episode artifact hash. Candidate preprocessing, model families, hyperparameters, selection metric, robustness gates, and the single final-validation decision rule must be declared before fitting. Development may use only the three frozen train folds; 2023–2024 validation and 2025+ sealed test remain unopened.
