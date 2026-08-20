import { DAILY_SWING_BROAD_WALK_FORWARD_FOLDS } from "@/lib/analysis/broad-dataset.types";
import { DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_SHA256 } from "@/lib/analysis/combined-broad-fold-dataset.types";

export const DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL_VERSION = "1.1.0";
export const DAILY_SWING_COMBINED_BROAD_MODEL_DEVELOPMENT_ID =
	"daily-swing-combined-episode-logistic-development-v1";
export const DAILY_SWING_COMBINED_BROAD_EPISODE_SHA256 =
	"0233cf9961e916e3079694ce0c887ba7f38ca4b5870271e9e769b563abea2a6b";

const LOGISTIC_PENALTIES = [0.003, 0.03, 0.3] as const;

export const DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL = {
	protocolVersion: DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL_VERSION,
	developmentId: DAILY_SWING_COMBINED_BROAD_MODEL_DEVELOPMENT_ID,
	trainingDataset: {
		version: "1.0.0",
		sha256: DAILY_SWING_COMBINED_BROAD_EPISODE_SHA256,
		rows: 5_504,
		target: "actionable_success",
		utility: "setup_utility_r",
	},
	foldDataset: {
		version: "1.0.0",
		output: "analysis-broad-combined-fold-training-v1.json",
		sourceCombinedDatasetSha256:
			"3ce82ae982ef3ac39df72fc3205788536e907cb187db061995c53730ab9b2030",
		sha256: DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_SHA256,
		status: "frozen_for_model_development",
	},
	dataAccess: {
		developmentSplit: "train",
		validationFeaturesRead: false,
		validationLabelsRead: false,
		testFeaturesRead: false,
		testLabelsRead: false,
	},
	featurePolicy: {
		objectiveSchema: "daily-swing-objective-features-v1",
		combinedFeatureCount: 50,
		include: "all_50_frozen_signal_time_fields",
		excludedFields: [
			"rowId",
			"instrumentId",
			"displaySymbol",
			"sourceScan",
			"signalAt",
			"resolvedAt",
		] as const,
		categoricalEncoding: "fixed_reference_level_one_hot",
		unknownCategoryPolicy: "reject",
	},
	preprocessing: {
		fitScope: "each_walk_forward_fit_partition_only",
		nullableNumeric: "fit_median_imputation_plus_missing_indicator",
		numericClipping: "fit_nearest_rank_1st_and_99th_percentiles",
		numericScaling: "fit_mean_and_population_standard_deviation_after_clipping",
		zeroVarianceScale: 1,
		application: "apply_fit_parameters_unchanged_to_evaluation",
	},
	walkForwardFolds: DAILY_SWING_BROAD_WALK_FORWARD_FOLDS.map((fold) => ({
		foldId: fold.foldId,
		evaluationStartsAt: fold.evaluationStartsAt,
		evaluationEndsBefore: fold.evaluationEndsBefore,
	})),
	candidates: [
		{
			candidateId: "constant-fit-rate",
			kind: "constant_probability",
			probability: "fit_partition_actionable_success_rate",
		},
		...LOGISTIC_PENALTIES.map((l2Penalty) => ({
			candidateId: `l2-logistic-${l2Penalty}`,
			kind: "l2_logistic_regression" as const,
			optimizer: "batch_gradient_descent" as const,
			iterations: 1_000,
			learningRate: 0.03,
			l2Penalty,
			initialization: "zero_weights_and_fit_rate_intercept" as const,
		})),
	],
	selectionPolicy: {
		eligibleWinnerKind: "l2_logistic_regression",
		primaryMetric: "arithmetic_mean_fold_roc_auc",
		tieTolerance: 0.000_001,
		tieBreakers: [
			"higher_mean_log_loss_improvement",
			"higher_mean_brier_score_improvement",
			"stronger_l2_penalty",
			"lexicographic_candidate_id",
		] as const,
		selectionCutoff: {
			method: "fit_prediction_nearest_rank_quantile",
			quantile: 0.7,
			comparison: "score_greater_than_or_equal_to_cutoff",
		},
		robustnessGates: [
			{ metric: "folds_with_both_target_classes", operator: "=", threshold: 3 },
			{ metric: "mean_fold_roc_auc", operator: ">=", threshold: 0.55 },
			{ metric: "minimum_fold_roc_auc", operator: ">=", threshold: 0.48 },
			{ metric: "mean_fold_log_loss_improvement", operator: ">=", threshold: 0.002 },
			{ metric: "mean_fold_brier_improvement", operator: ">=", threshold: 0.001 },
			{ metric: "folds_with_positive_log_loss_improvement", operator: ">=", threshold: 2 },
			{ metric: "folds_with_positive_brier_improvement", operator: ">=", threshold: 2 },
			{ metric: "folds_with_selected_utility_improvement", operator: ">=", threshold: 2 },
			{ metric: "mean_selected_utility_improvement_r", operator: ">=", threshold: 0.02 },
			{ metric: "base_pooled_roc_auc", operator: ">=", threshold: 0.5, minimumRows: 100 },
			{ metric: "expansion_pooled_roc_auc", operator: ">=", threshold: 0.5, minimumRows: 100 },
		] as const,
		failureRule:
			"If no logistic candidate passes every gate, reject this development attempt and keep validation sealed.",
	},
	finalFitPolicy: {
		rows: 5_504,
		preprocessing: "refit_on_all_train_episodes",
		model: "refit_selected_hyperparameters_on_all_train_episodes",
		cutoff: "freeze_70th_percentile_of_all_train_predictions",
		artifactRequirement:
			"Hash the fitted preprocessing, model, cutoff, protocol, and training dataset before any validation access.",
	},
	validationPolicy: {
		status: "sealed_until_separate_final_preregistration",
		period: "2023-01-01_through_2024-12-31",
		oneShot: true,
		criteria: [
			{ metric: "validation_episode_rows", operator: ">=", threshold: 500 },
			{ metric: "validation_actionable_successes", operator: ">=", threshold: 75 },
			{ metric: "roc_auc", operator: ">=", threshold: 0.58 },
			{ metric: "log_loss_improvement", operator: ">=", threshold: 0.003 },
			{ metric: "brier_score_improvement", operator: ">=", threshold: 0.0015 },
			{ metric: "selected_episode_rows", operator: ">=", threshold: 100 },
			{ metric: "selected_actionable_success_rate_lift", operator: ">=", threshold: 0.04 },
			{ metric: "selected_average_setup_utility_r", operator: ">=", threshold: 0.08 },
			{ metric: "selected_average_setup_utility_r_improvement", operator: ">=", threshold: 0.04 },
			{ metric: "minimum_calendar_year_roc_auc", operator: ">=", threshold: 0.52 },
			{
				metric: "minimum_calendar_year_selected_utility_improvement_r",
				operator: ">=",
				threshold: 0,
				minimumSelectedRowsPerGroup: 30,
			},
			{ metric: "minimum_source_roc_auc", operator: ">=", threshold: 0.52, minimumRowsPerGroup: 100 },
			{
				metric: "minimum_source_selected_utility_improvement_r",
				operator: ">=",
				threshold: 0,
				minimumSelectedRowsPerGroup: 30,
			},
		] as const,
		decisionRule:
			"Every criterion must pass in one validation run. Any failure rejects the model; no threshold, feature, preprocessing, model, or gate may be changed and rerun on this validation period.",
	},
	testPolicy: {
		status: "sealed",
		periodStartsAt: "2025-01-01T00:00:00.000Z",
		openingCondition:
			"A validation pass permits drafting a separate one-shot test preregistration only; it does not itself authorize test access.",
	},
	warnings: [
		"Walk-forward performance is development evidence, not final validation evidence.",
		"A validation pass would not authorize customer signals or live execution.",
	],
} as const;
