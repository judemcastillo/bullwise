export const DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_VERSION = "1.0.0";
export const DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_ID =
	"daily-swing-symmetric-regime-development-v1";

export const DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_PROTOCOL = {
	protocolVersion: DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_VERSION,
	developmentId: DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_ID,
	sources: {
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
		rejectedBenchmarkRiskFilter: {
			path: "artifacts/analysis/analysis-broad-strategy-redesign-development-v1.json",
			sha256:
				"2b82ed55f49bb3b0ff52146a2914bf306ae1f542a1c50db0ba3e7c0e88a698c8",
			decision: "reject_benchmark_risk_filter",
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
		averageUtilityR: -0.02364269,
		profitFactor: 0.93482115,
		evaluationRows: 2_696,
		folds: [
			{
				foldId: "evaluate_2020",
				averageUtilityR: 0.08775738,
			},
			{
				foldId: "evaluate_2021",
				averageUtilityR: 0.02075084,
			},
			{
				foldId: "evaluate_2022",
				averageUtilityR: -0.38260108,
			},
		] as const,
	},
	candidate: {
		candidateId: "daily-swing-v1-symmetric-long-short",
		candidateCount: 1,
		universe: "frozen_127_standard_unleveraged_etfs",
		allowShortSetups: true,
		marketBenchmarkFilter: "none",
		model: "none",
		directions: {
			long: {
				trend: "bullish",
				momentumExclusion: "bearish",
				setupTypes: ["breakout", "pullback"] as const,
			},
			short: {
				trend: "bearish",
				momentumExclusion: "bullish",
				setupTypes: ["breakdown", "pullback"] as const,
			},
		},
		selectionOrder: [
			"generate_daily_swing_v1_long_and_short_setups",
			"apply_signal_time_liquidity_gate",
			"select_episode_first_setup_by_instrument_and_direction_within_each_fold",
		] as const,
		episodeKey: ["instrument_id", "direction"] as const,
		unchangedMechanics: [
			"trend_and_momentum_thresholds",
			"breakout_breakdown_and_pullback_construction",
			"entry_zone_and_trigger",
			"stop_loss",
			"take_profit_targets",
			"maximum_holding_period",
			"same_bar_stop_first_policy",
			"transaction_costs_and_slippage",
			"position_risk",
			"signal_time_liquidity_policy",
		] as const,
		shortBorrowStress: {
			annualRate: 0.05,
			accrualBasis: "elapsed_calendar_days_over_365",
			minimumChargedDays: 1,
			notionalBasis: "short_entry_notional",
			application: "subtract_from_every_triggered_short_outcome_before_metrics",
		},
	},
	evaluation: {
		population:
			"recompute_exhaustive_long_and_short_setups_from_frozen_histories_then_select_episode_first_setups_inside_each_train_walk_forward_partition",
		outcomeCosts: {
			transactionCostBpsPerSide: 2,
			slippageBpsPerFill: 3,
			shortBorrowStressIncluded: true,
		},
		metrics: [
			"episode_rows",
			"short_episode_rows",
			"average_setup_utility_r_after_short_borrow",
			"profit_factor_after_short_borrow",
			"average_utility_improvement_r_over_long_only_baseline",
		] as const,
		cohorts: [
			"evaluation_fold",
			"direction",
			"setup_type",
			"source_scan",
		] as const,
		instrumentLevelOutput: false,
	},
	developmentGates: [
		{ metric: "total_evaluation_episode_rows", operator: ">=", threshold: 1_000 },
		{ metric: "total_short_episode_rows", operator: ">=", threshold: 250 },
		{ metric: "minimum_fold_episode_rows", operator: ">=", threshold: 200 },
		{ metric: "minimum_fold_short_episode_rows", operator: ">=", threshold: 40 },
		{
			metric: "overall_average_setup_utility_r_after_short_borrow",
			operator: ">=",
			threshold: 0.05,
		},
		{
			metric: "minimum_fold_average_setup_utility_r_after_short_borrow",
			operator: ">=",
			threshold: 0,
		},
		{
			metric: "overall_profit_factor_after_short_borrow",
			operator: ">=",
			threshold: 1.1,
		},
		{
			metric: "minimum_fold_profit_factor_after_short_borrow",
			operator: ">=",
			threshold: 1,
		},
		{
			metric: "minimum_direction_average_utility_r_after_short_borrow",
			operator: ">=",
			threshold: 0,
		},
		{
			metric: "overall_average_utility_improvement_r_over_long_only",
			operator: ">=",
			threshold: 0.05,
		},
		{
			metric: "folds_with_positive_average_utility_improvement",
			operator: "=",
			threshold: 3,
		},
		{
			metric: "fold_average_utility_range_r_after_short_borrow",
			operator: "<=",
			threshold: 0.2,
		},
	] as const,
	decisionPolicy: {
		pass:
			"Freeze the candidate and implementation for a separately preregistered one-shot validation comparison.",
		fail:
			"Reject this symmetric candidate and stop to rethink the strategy; do not tune it on the same train evidence.",
		requiresEveryGate: true,
		authorizesValidationAccess: false,
		authorizesProductSignals: false,
		authorizesLiveTrading: false,
	},
	limitations: [
		"Historical borrow availability is unknown and cannot be reconstructed from OHLCV bars.",
		"The frozen borrow charge is a stress assumption, not evidence that an ETF was borrowable at a quoted rate.",
		"A development pass would not make the strategy deployable without broker borrow checks and portfolio-level testing.",
	] as const,
	prohibitions: [
		"Do not reuse or tune the rejected SPY benchmark filter.",
		"Do not tune indicators, lookbacks, thresholds, setup geometry, or long/short mechanics.",
		"Do not change the frozen short-borrow stress after outcomes are observed.",
		"Do not add a model, rank symbols, remove weak symbols, or report instrument-level results.",
		"Do not open validation or test features or labels.",
	] as const,
	output: {
		path: "artifacts/analysis/analysis-broad-symmetric-regime-development-v1.json",
		overwrite: false,
	},
} as const;
