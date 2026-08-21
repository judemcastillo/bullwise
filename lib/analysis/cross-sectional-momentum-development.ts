export const ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_VERSION = "1.0.0";
export const ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_ID =
	"etf-cross-sectional-momentum-development-v1";

export const ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_PROTOCOL = {
	protocolVersion: ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_VERSION,
	developmentId: ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_ID,
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
		rejectedSymmetricStrategy: {
			path: "artifacts/analysis/analysis-broad-symmetric-regime-development-v1.json",
			sha256:
				"e9b28bf7e7c72cf985783eff23559a87a21d505730db082ad63693006a120fa8",
			decision: "reject_symmetric_regime_strategy",
		},
	},
	dataAccess: {
		developmentSplit: "train",
		portfolioStartsAt: "2020-01-01T00:00:00.000Z",
		portfolioEndsBefore: "2023-01-01T00:00:00.000Z",
		formationHistoryMayStartAt: "2016-01-01T00:00:00.000Z",
		calendarEvaluationYears: [2020, 2021, 2022] as const,
		validationFeaturesRead: false,
		validationLabelsRead: false,
		testFeaturesRead: false,
		testLabelsRead: false,
	},
	universe: {
		kind: "frozen_coverage_eligible_standard_unleveraged_etfs",
		expectedEligibleInstruments: 127,
		selectionUsesPriorStrategyOutcomes: false,
		sleeves: [
			{
				sleeveId: "us_broad_style_factor",
				targetWeight: 0.2475,
				sourceCategories: [
					"base:us_style",
					"base:us_factor_and_income",
				] as const,
			},
			{
				sleeveId: "us_sector_real_asset_equity",
				targetWeight: 0.2475,
				sourceCategories: [
					"base:industry_and_real_asset_equity",
					"expansion:us_sector_and_industry",
					"expansion:real_asset_and_resource_equity",
				] as const,
			},
			{
				sleeveId: "international_equity",
				targetWeight: 0.2475,
				sourceCategories: [
					"base:international_regional",
					"base:international_country",
					"expansion:international_and_country",
				] as const,
			},
			{
				sleeveId: "fixed_income_and_preferred",
				targetWeight: 0.2475,
				sourceCategories: [
					"base:fixed_income_and_preferred",
					"expansion:fixed_income",
				] as const,
			},
		] as const,
		membershipPolicy:
			"Every frozen source category belongs to exactly one sleeve; coverage exclusions remain unchanged and no symbol is selected from strategy outcomes.",
	},
	signal: {
		schedule: "last_completed_spy_session_of_each_calendar_month",
		formation: {
			name: "adjusted_total_return_12_minus_1_month",
			formula: "adjusted_close_t_minus_21 / adjusted_close_t_minus_252 - 1",
			lookbackSessions: 252,
			skipRecentSessions: 21,
			minimumObservedSessions: 253,
		},
		candidateAvailability: "completed_signal_session_only",
		absoluteEligibility: "formation_return_strictly_greater_than_zero",
		liquidityEligibility: {
			availability: "completed_signal_session_only",
			windowSessions: 20,
			minimumObservedSessions: 19,
			minimumMedianDollarVolume: 10_000_000,
			maximumTargetPositionFractionOfMedianDollarVolume: 0.01,
			dollarVolumeDefinition: "adjusted_close_times_reported_volume",
			missingDataPolicy: "candidate_ineligible",
		},
		ranking: "highest_formation_return_within_each_sleeve",
		selectionPerSleeve: 1,
		tieBreaker: "display_symbol_ascending",
		missingSignalSessionPolicy: "candidate_ineligible",
	},
	portfolio: {
		initialEquity: 100_000,
		positioning: "long_or_cash",
		leverageAllowed: false,
		shortsAllowed: false,
		fractionalUnitsAllowed: true,
		maximumPositions: 4,
		maximumGrossExposure: 0.99,
		operationalCashReserveWeight: 0.01,
		allocation: "each_eligible_sleeve_winner_targets_24_75_percent_of_equity",
		ineligibleSleevePolicy: "keep_sleeve_target_weight_in_cash",
		cashReturnAnnualPercent: 0,
		rebalance: {
			execution: "next_spy_session_adjusted_open_after_signal",
			order: "sell_before_buy",
			unchangedWinnerPolicy: "rebalance_to_exact_target_weight",
			missingExecutionBarPolicy: "fail_experiment",
		},
		valuation: "daily_adjusted_close_with_cash_residual",
		missingValuationBarPolicy: "fail_experiment",
		finalLiquidation: "last_adjusted_close_before_train_boundary",
	},
	costs: {
		base: {
			transactionCostBpsPerSide: 2,
			slippageBpsPerFill: 3,
		},
		stress: {
			transactionCostBpsPerSide: 4,
			slippageBpsPerFill: 6,
		},
		turnoverDefinition:
			"At each rebalance, one-way turnover is one half of the sum of absolute changes across all risky-asset and cash weights; annualized turnover is mean monthly turnover times 12.",
	},
	evaluation: {
		firstFormationMonth: "2019-12",
		lastFormationMonth: "2022-11",
		expectedMonthlyHoldingPeriods: 36,
		returnFrequency: "daily_for_equity_curve_monthly_for_sharpe",
		sharpeDefinition:
			"Square root of 12 times mean monthly return divided by sample standard deviation; zero cash rate.",
		annualizedReturnDefinition: "geometric_cagr_from_daily_portfolio_equity",
		maximumDrawdownDefinition: "peak_to_trough_daily_adjusted_close_equity",
		calendarReturnDefinition: "calendar_year_daily_equity_return",
		cohorts: ["calendar_year", "sleeve", "source_scan"] as const,
		instrumentLevelOutput: false,
	},
	benchmarks: {
		spyBuyAndHold: {
			allocation: "99_percent_spy_with_1_percent_operational_cash_reserve",
			adjustment: "all",
			costs: "same_base_entry_and_final_exit_costs",
			reportOnly: true,
		},
		staticSleeveEqualWeight: {
			allocation:
				"24.75 percent per sleeve, equally divided among every coverage-eligible sleeve member at the first execution and held through final liquidation; retain 1 percent operational cash",
			costs: "same_base_entry_and_final_exit_costs",
			usedByGates: true,
		},
	},
	developmentGates: [
		{ metric: "monthly_holding_periods", operator: "=", threshold: 36 },
		{
			metric: "minimum_candidates_in_any_sleeve_decision",
			operator: ">=",
			threshold: 10,
		},
		{ metric: "months_with_any_investment", operator: ">=", threshold: 18 },
		{
			metric: "base_net_annualized_return_percent",
			operator: ">=",
			threshold: 5,
		},
		{ metric: "base_monthly_sharpe", operator: ">=", threshold: 0.5 },
		{
			metric: "base_maximum_drawdown_percent",
			operator: "<=",
			threshold: 20,
		},
		{ metric: "positive_calendar_years", operator: ">=", threshold: 2 },
		{
			metric: "minimum_calendar_year_return_percent",
			operator: ">=",
			threshold: -10,
		},
		{
			metric: "annualized_return_improvement_over_static_sleeves_percent",
			operator: ">=",
			threshold: 0,
		},
		{
			metric: "monthly_sharpe_improvement_over_static_sleeves",
			operator: ">=",
			threshold: 0,
		},
		{
			metric: "stress_net_annualized_return_percent",
			operator: ">=",
			threshold: 3,
		},
		{
			metric: "stress_maximum_drawdown_percent",
			operator: "<=",
			threshold: 22,
		},
		{
			metric: "base_annualized_one_way_turnover_percent",
			operator: "<=",
			threshold: 800,
		},
	] as const,
	decisionPolicy: {
		pass:
			"Freeze the strategy and implementation for a separately preregistered one-shot validation evaluation.",
		fail:
			"Reject this exact momentum strategy and stop; do not tune its sleeves, formation window, selection, cash rule, costs, or gates on the same train evidence.",
		requiresEveryGate: true,
		authorizesValidationAccess: false,
		authorizesProductSignals: false,
		authorizesLiveTrading: false,
	},
	prohibitions: [
		"Do not calculate real momentum features or returns before the evaluator and synthetic guards are complete.",
		"Do not change sleeves, lookbacks, skip period, rebalance timing, selection count, cash rule, or tie breaker after outcomes are observed.",
		"Do not add stops, targets, shorts, leverage, volatility scaling, or an AI model.",
		"Do not remove instruments, inspect symbol-level outcomes, or emit selected symbols in the report.",
		"Do not open validation or test features or labels.",
	] as const,
	output: {
		path: "artifacts/analysis/etf-cross-sectional-momentum-development-v1.json",
		overwrite: false,
	},
} as const;
