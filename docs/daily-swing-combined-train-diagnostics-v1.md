# Daily swing combined train diagnostics v1

Frozen on 2026-08-20 after rejecting `daily-swing-combined-episode-logistic-development-v1` and before running any post-rejection diagnostic.

Diagnostic ID: `daily-swing-combined-train-diagnostics-v1`

Diagnostic version: `1.0.0`

Frozen inputs:

- Train-only fold dataset SHA-256: `6bc63cb4559b2334708110fcd15719eb52d7f0bb9100b8f0032e4e42a1e0f9c9`
- Rejected development report SHA-256: `02d6944aa433aac2f5a1b7eb75e4308eca130baaceb8bee1a8abeab957018705`

The diagnostics may use only the frozen 2020, 2021, and 2022 train fit/evaluation partitions. Validation and test features and labels remain sealed.

## Questions

1. Are actionable-success rates and average setup utility stable across evaluation years, base versus expansion sources, direction, setup type, trend regime, and volatility regime?
2. Did numeric distributions, missingness, or categorical composition drift materially from each fit partition to its evaluation partition?
3. Does the rejected model's out-of-fold score have a monotonic relationship with actionable success or realized utility, even though its preregistered gates failed?
4. Is the binary actionable-success target poorly aligned with the economic utility used to judge selected trades?

## Frozen calculations

Use `l2-logistic-0.3` only as a diagnostic score because it had the highest already-frozen mean fold AUC. Refit it deterministically once per existing fold with the unchanged preprocessing and hyperparameters. This does not revive the candidate or authorize new model selection.

For cohorts with at least 100 rows, report only row count, actionable-success rate, average setup utility, and median setup utility. Do not report instrument-level or symbol-level outcomes.

For feature drift, use each fit partition's frozen preprocessing. Report the ten largest absolute evaluation standardized means, missing-rate changes, and categorical total-variation distances. These results cannot automatically select or remove features.

Pool out-of-fold predictions into ten stable equal-count score bins. Report rows, average predicted probability, actionable-success rate, and average setup utility per bin. For each fold, report Spearman score-to-utility correlation and top-decile success and utility improvements.

Flag, but do not automatically repair:

- Evaluation-fold actionable-rate range above 0.10.
- Evaluation-fold average-utility range above 0.10R.
- Absolute standardized numeric mean above 0.50.
- Absolute missing-rate change above 0.10.
- Categorical total-variation distance above 0.20.

## Decision boundary

A future expected-utility candidate may be proposed only if top-decile utility improves in at least two folds, mean top-decile utility improvement is at least +0.03R, and mean score-to-utility Spearman correlation is at least 0.10. Passing these diagnostic conditions does not authorize fitting; a separate model protocol must still be frozen.

Otherwise, stop increasing model complexity and revisit the strategy, target, or signal-time feature design under a new train-only plan.

Do not change the rejected model, gates, cutoff, target, or preprocessing. Do not search penalties, thresholds, feature subsets, or nonlinear models. Do not open validation or test data.

## Authorized next step

The real train-only diagnostic completed with report SHA-256 `c3afd8fffa6c1f02e26902cfaffdfdec8b12965c8ba7d3990aeca59c5faa67ae`. All five diagnostic flags fired. Only one fold had positive top-decile utility improvement; mean top-decile improvement was `-0.04618927R`, and mean score-to-utility Spearman correlation was `-0.09629828`. The expected-utility protocol criteria failed, so the rejected model cannot advance.

The next step is the separately frozen strategy and target audit in `docs/daily-swing-combined-strategy-target-audit-v1.md`. Validation and test remain sealed.
