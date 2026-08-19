# Daily swing episode model v1 preregistration

Frozen on 2026-08-19 before opening validation features or labels.

Experiment ID: `daily-swing-episode-actionable-logistic-v1`

Frozen artifact checksums:

- Source `analysis-dataset.json`: `83a53bbf638c869d54067596668834d6a921d8c21ba96b78c47798870680cba4`
- Train-only `analysis-episode-training.json`: `43caababc2648f088b9a5958395c230d1f519ee65748d3e5781323034c22600c`
- Machine-readable `analysis-episode-experiment-preregistration.json`: `7e12f53eee2aa3c6842770d7d8b11199d91e193eac9d64385b0c3fb69bae6d45`

The frozen training artifact contains 854 episode-first observations, including 246 actionable successes (28.805621%) and average setup utility of 0.07282877R. Validation contains 3,390 source rows and test contains 3,439 source rows, but their episode counts, features, and labels were not read during artifact creation or preregistration.

## Hypothesis

One L2-regularized logistic model trained on independently selected episode-first signals can rank economically actionable setups better than the constant training-rate baseline without using instrument identity.

The primary target is `episode-first-actionable-success-v1`: 1 only when the selected first setup triggers and realizes at least +0.5 net R after costs; otherwise 0. Setup utility is realized net R for triggered selected setups and exactly 0 for untriggered selected setups.

## Episode and split policy

Episode selection is applied independently within each split. For each instrument and direction, select the first signal, suppress later signals through that selected setup's resolution session, then begin a new episode. Suppressed signals never extend an episode. A train setup can never suppress the first validation setup, and a validation setup can never suppress the first test setup.

The frozen training artifact contains train episodes only. Validation receives one authorized run after this preregistration. Test features and labels remain sealed unless every validation criterion passes.

## Fixed model

- L2 logistic regression using batch gradient descent.
- 600 iterations, learning rate 0.03, L2 penalty 0.01.
- Existing signal-time numeric and categorical features only; instrument identity is excluded.
- Numeric medians, means, standard deviations, category encoding, model coefficients, and the score cutoff are fitted on train episodes only.
- The selection cutoff is the 70th percentile of fitted training probabilities. That numeric cutoff is applied unchanged to validation; a validation percentile is forbidden.
- The cutoff uses the deterministic nearest-rank definition: sort fitted training probabilities ascending and select rank `ceil(0.70 × training rows)`. Scores equal to or above that numeric cutoff are selected.
- No feature selection, hyperparameter search, calibration adjustment, threshold tuning, or alternate model is allowed after validation is opened.

## Validation pass criteria

Every criterion must pass in the one validation run:

- At least 200 validation episodes and at least 40 actionable successes.
- ROC AUC at least 0.60.
- Log-loss improvement over the constant training-rate prediction at least 0.005.
- Brier-score improvement over the constant training-rate prediction at least 0.002.
- At least 40 validation episodes selected by the frozen training cutoff.
- Selected actionable-success rate at least 0.05 above the full validation episode rate.
- Selected average setup utility at least +0.10R.
- Selected average setup utility at least 0.05R above the full validation episode average.

## Decision rule

Any failed criterion rejects this candidate. The model, features, target, episode policy, cutoff, or gates will not be changed and rerun on validation. Passing would authorize exactly one test evaluation with the fitted model and cutoff frozen unchanged. Passing test would still lead only to forward paper validation, not customer signals or live execution.

## One-shot evaluator

The evaluator is implemented as `npm run evaluate:analysis-episode-validation`. It must first be tested and audited with synthetic fixtures only. The real command requires the explicit `--confirm-one-shot-validation` flag and refuses any source, training, or preregistration artifact whose SHA-256 differs from the frozen values above.

Do not run the real command merely to check that it works. Once run against the frozen source dataset, validation is consumed and the resulting report must be preserved without rerunning or tuning.
