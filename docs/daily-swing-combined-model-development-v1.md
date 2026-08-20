# Daily swing combined model development v1

Frozen on 2026-08-20 before fitting a model or inspecting any target rate, model metric, validation feature, validation label, or sealed-test data from the combined source.

Development ID: `daily-swing-combined-episode-logistic-development-v1`

Protocol version: `1.1.0`

Train-only episode artifact: `analysis-broad-combined-episode-training.json`

Train-only episode SHA-256: `0233cf9961e916e3079694ce0c887ba7f38ca4b5870271e9e769b563abea2a6b`

The source contains 5,504 episode-first training rows. The primary target remains actionable success at +0.5 net R after costs; setup utility remains net R for triggered setups and zero for untriggered setups. Target rates and utility aggregates were not inspected while freezing this protocol.

## Allowed data and features

Development may use only the three frozen train folds evaluating 2020, 2021, and 2022. Every preprocessing parameter is fitted separately inside each fold's fit partition and applied unchanged to its evaluation partition.

Use all 50 frozen signal-time feature fields. Exclude row ID, instrument ID, display symbol, source scan, signal timestamp, and resolution timestamp from model input. Source scan may be used only for robustness reporting. Validation remains 2023–2024; sealed test begins in 2025.

For nullable numeric fields, fit the median and add a missingness indicator. Clip numeric values to fit-partition nearest-rank 1st and 99th percentiles, then standardize using the clipped fit mean and population standard deviation; use scale 1 for a zero-variance field. Use fixed reference-level one-hot encoding for categorical fields and reject unknown categories.

## Pre-fit fold-materialization correction

An implementation review on 2026-08-20 found that the 5,504-row final episode artifact cannot reconstruct the independently selected fold rows. A signal selected before a fold boundary can suppress a signal after that boundary in the final train selection, while the evaluation partition must restart episode selection. Counts alone are therefore insufficient.

Protocol version `1.1.0` requires `analysis-broad-combined-fold-training-v1.json`, built from the checksum-frozen combined source by deserializing train rows only. It materializes final train, fit, and evaluation episodes independently as seven tagged partitions and must reproduce every previously recorded inventory. Its SHA-256 must be recorded in this protocol before any model fitting. This correction occurred before target-rate inspection or model fitting.

The protected materialization completed on 2026-08-20. The 35,630,575-byte artifact has SHA-256 `6bc63cb4559b2334708110fcd15719eb52d7f0bb9100b8f0032e4e42a1e0f9c9`. All seven final, fit, and evaluation episode counts exactly match the frozen inventories. Validation/test features and labels were not deserialized. No target rate, utility aggregate, predictive metric, or model result was calculated.

## Candidate models

The constant baseline predicts the fit-partition actionable-success rate. It is a comparator and cannot be selected as the final model.

The only selectable family is L2 logistic regression with batch gradient descent, 1,000 iterations, learning rate 0.03, zero weights, and a fit-rate intercept. The only L2 penalties are `0.003`, `0.03`, and `0.3`. No nonlinear model, feature selection, interaction search, calibration adjustment, random seed search, or additional hyperparameter is allowed in this development cycle.

## Walk-forward selection

For every fold and candidate, compare ROC AUC, log loss, and Brier score with the fold's constant fit-rate baseline. Freeze a selection cutoff at the nearest-rank 70th percentile of fit predictions and apply that numeric cutoff unchanged to the fold evaluation rows. Measure selected actionable-success lift and setup-utility improvement against all evaluation episodes.

The winner is the passing logistic candidate with the highest arithmetic mean fold ROC AUC. Ties within `0.000001` use, in order, mean log-loss improvement, mean Brier improvement, stronger L2 penalty, and candidate ID.

Every development gate must pass:

- All three evaluation folds contain both target classes.
- Mean fold AUC is at least 0.55 and the minimum fold AUC is at least 0.48.
- Mean log-loss improvement is at least 0.002 and positive in at least two folds.
- Mean Brier improvement is at least 0.001 and positive in at least two folds.
- Selected utility improves in at least two folds and mean improvement is at least +0.02R.
- Pooled out-of-fold AUC is at least 0.50 independently for base and expansion sources, with at least 100 episodes in each source.

If no logistic candidate passes every gate, reject this development attempt and keep validation sealed.

## Final fit and validation rule

After a development pass, refit the selected preprocessing and logistic configuration on all 5,504 train episodes. Freeze the numeric cutoff at the 70th percentile of all-train predictions. Hash the preprocessing, coefficients, cutoff, protocol, and source artifact in a separate final preregistration before validation access.

The one 2023–2024 validation run must pass every machine-readable criterion in `DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL`: overall coverage, AUC, calibration improvements, selected-row coverage, success-rate lift, absolute and relative selected utility, calendar-year robustness, and base-versus-expansion robustness. Any failed gate rejects the model permanently for this validation period; nothing may be tuned and rerun.

Even a validation pass does not open the 2025+ test automatically. It permits drafting a separate one-shot test preregistration with the fitted artifact and decision criteria frozen. Neither outcome authorizes customer signals or live trading.

## Authorized next step

The preprocessing, fold evaluator, candidate selection, fail-closed gates, final model artifact builder, and no-overwrite report command are implemented and verified with synthetic fixtures. The next step is to run `npm run develop:analysis-broad-combined-model` once on the frozen train-only fold artifact and preserve its report. This run will inspect train targets and metrics but will not read validation or test features or labels.
