export const DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_VERSION =
	"1.0.0";
export const DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_ID =
	"daily-swing-combined-strategy-target-audit-v1";

export const DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL = {
	auditVersion: DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_VERSION,
	auditId: DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_ID,
	sources: {
		foldDataset: {
			path: "analysis-broad-combined-fold-training-v1.json",
			sha256:
				"6bc63cb4559b2334708110fcd15719eb52d7f0bb9100b8f0032e4e42a1e0f9c9",
		},
		trainDiagnosticReport: {
			path: "analysis-broad-combined-train-diagnostics-v1.json",
			sha256:
				"c3afd8fffa6c1f02e26902cfaffdfdec8b12965c8ba7d3990aeca59c5faa67ae",
			decision: "revisit_strategy_target_or_signal_time_features",
		},
	},
	dataAccess: {
		population: "non_overlapping_train_out_of_fold_evaluation_episodes",
		partitions: [
			"evaluate_2020_evaluation",
			"evaluate_2021_evaluation",
			"evaluate_2022_evaluation",
		] as const,
		expectedRows: 2_696,
		fitPartitionsUsed: false,
		validationFeaturesRead: false,
		validationLabelsRead: false,
		testFeaturesRead: false,
		testLabelsRead: false,
	},
	utilityDefinition: {
		unit: "net_r_after_frozen_costs",
		untriggeredUtilityR: 0,
		actionableSuccessThresholdR: 0.5,
		buckets: [
			{ id: "loss", condition: "setup_utility_r_below_0" },
			{ id: "flat", condition: "setup_utility_r_equals_0" },
			{
				id: "modest_gain",
				condition: "setup_utility_r_above_0_and_below_0.5",
			},
			{ id: "actionable_gain", condition: "setup_utility_r_at_least_0.5" },
		] as const,
		actionableConsistencyRequirement:
			"actionable_success_must_equal_setup_utility_r_at_least_0.5",
	},
	cohortAudit: {
		minimumRows: 100,
		mainEffects: [
			"evaluation_fold",
			"source_scan",
			"direction",
			"setup_type",
			"trend_regime",
			"volatility_regime",
		] as const,
		interactions: [
			"direction_x_setup_type",
			"setup_type_x_trend_regime",
			"trend_regime_x_volatility_regime",
		] as const,
		metrics: [
			"rows",
			"actionable_success_rate",
			"average_setup_utility_r",
			"median_setup_utility_r",
			"loss_rate",
			"flat_rate",
			"modest_gain_rate",
			"actionable_gain_rate",
			"gross_positive_utility_r",
			"gross_negative_utility_r",
			"profit_factor",
		] as const,
		instrumentLevelOutput: false,
	},
	targetCompressionAudit: {
		metrics: [
			"positive_utility_rows_below_actionable_threshold",
			"share_of_positive_rows_below_actionable_threshold",
			"positive_utility_r_below_actionable_threshold",
			"share_of_positive_utility_r_below_actionable_threshold",
		] as const,
		flagWhenPositiveUtilityShareBelowThresholdIsAtLeast: 0.25,
		meaning:
			"The binary target may discard a material portion of profitable utility; this is descriptive and does not authorize another model.",
	},
	strategyCandidateNomination: {
		eligibleInteraction: "direction_x_setup_type",
		minimumTotalRows: 300,
		minimumRowsPerEvaluationFold: 50,
		minimumOverallAverageUtilityR: 0.05,
		minimumEvaluationFoldAverageUtilityR: 0,
		maximumEvaluationFoldAverageUtilityRangeR: 0.15,
		minimumOverallProfitFactor: 1.1,
		minimumEvaluationFoldProfitFactor: 1,
		multipleComparisonPolicy:
			"Nomination is exploratory train-only evidence, not a statistical discovery or validation result.",
		authorizesStrategyChange: false,
		authorizesModelFitting: false,
		authorizesValidationAccess: false,
	},
	decisionPolicy: {
		ifOneOrMoreCandidatesPass:
			"Nominate every passing direction-by-setup cohort for comparison in a separately frozen strategy experiment.",
		ifNoCandidatePasses:
			"Do not add model complexity; redesign entry, exit, risk, or regime logic under a new train-only strategy protocol.",
		ifTargetCompressionFlagged:
			"Document an ordinal or continuous target as a separate research hypothesis without fitting it in this audit.",
	},
	prohibitions: [
		"Do not search thresholds, indicators, feature subsets, or model families.",
		"Do not alter entry, stop-loss, take-profit, holding-period, or cost assumptions in this audit.",
		"Do not rank or report instruments or symbols.",
		"Do not claim profitability from a nominated train-only cohort.",
		"Do not open validation or test features or labels.",
	] as const,
	output: {
		path: "analysis-broad-combined-strategy-target-audit-v1.json",
		overwrite: false,
	},
} as const;
