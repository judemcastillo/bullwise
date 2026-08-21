export const DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_VERSION = "1.0.0";
export const DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_ID =
	"daily-swing-combined-train-diagnostics-v1";

export const DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL = {
	diagnosticVersion: DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_VERSION,
	diagnosticId: DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_ID,
	sources: {
		foldDataset: {
			path: "artifacts/analysis/analysis-broad-combined-fold-training-v1.json",
			sha256:
				"6bc63cb4559b2334708110fcd15719eb52d7f0bb9100b8f0032e4e42a1e0f9c9",
		},
		rejectedDevelopmentReport: {
			path: "artifacts/analysis/analysis-broad-combined-model-development-report-v1.json",
			sha256:
				"02d6944aa433aac2f5a1b7eb75e4308eca130baaceb8bee1a8abeab957018705",
			decision: "reject_development",
		},
	},
	dataAccess: {
		partitions: [
			"evaluate_2020_fit",
			"evaluate_2020_evaluation",
			"evaluate_2021_fit",
			"evaluate_2021_evaluation",
			"evaluate_2022_fit",
			"evaluate_2022_evaluation",
		] as const,
		validationFeaturesRead: false,
		validationLabelsRead: false,
		testFeaturesRead: false,
		testLabelsRead: false,
	},
	representativeModel: {
		candidateId: "l2-logistic-0.3",
		purpose: "diagnostic_only",
		selectionReason: "highest_frozen_mean_fold_auc_among_rejected_candidates",
		refitPolicy: "deterministically_refit_once_per_frozen_fold",
		newModelSelectionAuthorized: false,
	},
	cohortStability: {
		minimumRows: 100,
		cohorts: [
			"evaluation_fold",
			"source_scan",
			"direction",
			"setup_type",
			"trend_regime",
			"volatility_regime",
		] as const,
		metrics: [
			"rows",
			"actionable_success_rate",
			"average_setup_utility_r",
			"median_setup_utility_r",
		] as const,
		instrumentLevelOutput: false,
	},
	featureDrift: {
		fitScope: "use_each_frozen_fit_partition_preprocessor",
		numericMetrics: [
			"evaluation_standardized_mean",
			"missing_rate_difference",
		] as const,
		categoricalMetric: "total_variation_distance",
		reportLimitPerMetric: 10,
		automaticFeatureSelection: false,
	},
	scoreDiagnostics: {
		scores: "pooled_out_of_fold_probabilities",
		bins: 10,
		binning: "equal_count_nearest_rank_with_stable_row_id_ties",
		metrics: [
			"rows",
			"average_predicted_probability",
			"actionable_success_rate",
			"average_setup_utility_r",
		] as const,
		foldMetrics: [
			"spearman_score_to_utility",
			"top_decile_utility_improvement_r",
			"top_decile_actionable_success_rate_lift",
		] as const,
	},
	diagnosticFlags: [
		{
			id: "target_rate_instability",
			metric: "evaluation_fold_actionable_rate_range",
			operator: ">",
			threshold: 0.1,
		},
		{
			id: "utility_instability",
			metric: "evaluation_fold_average_utility_range_r",
			operator: ">",
			threshold: 0.1,
		},
		{
			id: "numeric_feature_drift",
			metric: "maximum_absolute_standardized_mean",
			operator: ">",
			threshold: 0.5,
		},
		{
			id: "missingness_drift",
			metric: "maximum_absolute_missing_rate_difference",
			operator: ">",
			threshold: 0.1,
		},
		{
			id: "categorical_feature_drift",
			metric: "maximum_categorical_total_variation_distance",
			operator: ">",
			threshold: 0.2,
		},
	] as const,
	nextResearchDecision: {
		expectedUtilityCandidateRequires: {
			minimumFoldsWithPositiveTopDecileUtilityImprovement: 2,
			minimumMeanTopDecileUtilityImprovementR: 0.03,
			minimumMeanSpearmanScoreToUtility: 0.1,
		},
		otherwise:
			"Stop model-complexity escalation and revisit strategy, target, or signal-time feature design using a separately frozen train-only plan.",
		authorizesModelFitting: false,
	},
	prohibitions: [
		"Do not change the rejected candidates, gates, preprocessing, or target.",
		"Do not search additional penalties, thresholds, feature subsets, or model families.",
		"Do not rank instruments or report symbol-level outcomes.",
		"Do not open validation or test features or labels.",
	] as const,
	output: {
		path: "artifacts/analysis/analysis-broad-combined-train-diagnostics-v1.json",
		overwrite: false,
	},
} as const;
