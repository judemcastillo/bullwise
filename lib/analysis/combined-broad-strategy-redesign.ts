export const DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_VERSION = "1.0.0";
export const DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_ID =
	"daily-swing-benchmark-risk-filter-development-v1";

export const DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL = {
	protocolVersion: DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_VERSION,
	developmentId: DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_ID,
	sources: {
		combinedDataset: {
			path: "artifacts/analysis/analysis-broad-combined-dataset-v3.json",
			sha256:
				"3ce82ae982ef3ac39df72fc3205788536e907cb187db061995c53730ab9b2030",
		},
		baseHistory: {
			path: "artifacts/analysis/analysis-broad-history.json",
			sha256:
				"a42ea177b110336cb905322370549deefa9a1fd54d620fa94b443757b6414e5f",
		},
		expansionHistory: {
			path: "artifacts/analysis/analysis-broad-v2-expansion-history.json",
			sha256:
				"7262c1a32e3cac8651c57daee97812c72edd6d39036e310e4259b25b37559505",
		},
		rejectedStrategyAudit: {
			path: "artifacts/analysis/analysis-broad-combined-strategy-target-audit-v1.json",
			sha256:
				"dc0b9d9c45352bc941f8402b2a17a9b764823f41a076b838806393676f659e27",
			decision: "redesign_strategy_mechanics",
		},
	},
	dataAccess: {
		developmentSplit: "train",
		periodEndsBefore: "2023-01-01T00:00:00.000Z",
		walkForwardEvaluationYears: [2020, 2021, 2022] as const,
		validationFeaturesRead: false,
		validationLabelsRead: false,
		testFeaturesRead: false,
		testLabelsRead: false,
	},
	baselineStrategy: {
		version: "daily-swing-v1-draft",
		direction: "long_only",
		setupTypes: ["breakout", "pullback"] as const,
		averageUtilityR: -0.02364269,
		profitFactor: 0.93482115,
		evaluationRows: 2_696,
		folds: [
			{
				foldId: "evaluate_2020",
				evaluationRows: 1_031,
				averageUtilityR: 0.08775738,
			},
			{
				foldId: "evaluate_2021",
				evaluationRows: 1_197,
				averageUtilityR: 0.02075084,
			},
			{
				foldId: "evaluate_2022",
				evaluationRows: 468,
				averageUtilityR: -0.38260108,
			},
		] as const,
	},
	candidate: {
		candidateId: "daily-swing-v1-plus-spy-risk-filter",
		candidateCount: 1,
		marketBenchmark: "SPY",
		benchmarkAvailability: "completed_signal_bar_only",
		benchmarkAdjustment: "all",
		eligibility: {
			allRequired: true,
			conditions: [
				"spy_close_above_sma200",
				"spy_20_session_return_above_0",
			] as const,
			missingBenchmarkPolicy: "reject_setup",
		},
		selectionOrder: [
			"generate_unchanged_daily_swing_v1_setup",
			"apply_signal_time_liquidity_gate",
			"apply_spy_risk_filter",
			"select_episode_first_setup_within_each_fold",
		] as const,
		unchangedMechanics: [
			"instrument_trend_and_momentum_logic",
			"breakout_and_pullback_construction",
			"entry_zone_and_trigger",
			"stop_loss",
			"take_profit_targets",
			"maximum_holding_period",
			"same_bar_stop_first_policy",
			"transaction_costs_and_slippage",
			"position_risk",
			"signal_time_liquidity_policy",
		] as const,
	},
	evaluation: {
		population:
			"reselect_episode_first_setups_after_the_fixed_market_filter_inside_each_train_walk_forward_partition",
		metrics: [
			"episode_rows",
			"average_setup_utility_r",
			"profit_factor",
			"actionable_success_rate",
			"average_utility_improvement_r_over_unfiltered_baseline",
		] as const,
		cohorts: ["evaluation_fold", "setup_type", "source_scan"] as const,
		instrumentLevelOutput: false,
	},
	developmentGates: [
		{ metric: "total_evaluation_episode_rows", operator: ">=", threshold: 750 },
		{
			metric: "minimum_fold_evaluation_episode_rows",
			operator: ">=",
			threshold: 150,
		},
		{ metric: "overall_average_setup_utility_r", operator: ">=", threshold: 0.05 },
		{ metric: "minimum_fold_average_setup_utility_r", operator: ">=", threshold: 0 },
		{ metric: "overall_profit_factor", operator: ">=", threshold: 1.1 },
		{ metric: "minimum_fold_profit_factor", operator: ">=", threshold: 1 },
		{
			metric: "overall_average_utility_improvement_r",
			operator: ">=",
			threshold: 0.05,
		},
		{
			metric: "folds_with_positive_average_utility_improvement",
			operator: "=",
			threshold: 3,
		},
		{
			metric: "fold_average_utility_range_r",
			operator: "<=",
			threshold: 0.2,
		},
	] as const,
	decisionPolicy: {
		pass:
			"Freeze the candidate and its complete implementation for a separately preregistered one-shot validation comparison.",
		fail:
			"Reject the benchmark filter and design a materially different train-only strategy hypothesis; do not tune these conditions.",
		requiresEveryGate: true,
		authorizesValidationAccess: false,
		authorizesProductSignals: false,
	},
	prohibitions: [
		"Do not test other benchmark averages, lookbacks, thresholds, or benchmark symbols.",
		"Do not change entry, stop-loss, take-profit, holding-period, cost, or liquidity rules.",
		"Do not add short setups or an AI model in this experiment.",
		"Do not rank or report instruments or symbols.",
		"Do not open validation or test features or labels.",
	] as const,
	output: {
		path: "artifacts/analysis/analysis-broad-strategy-redesign-development-v1.json",
		overwrite: false,
	},
} as const;
