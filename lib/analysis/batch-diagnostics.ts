import {
	runDailySwingBatchBacktest,
	type DailySwingBatchBacktestInput,
} from "@/lib/analysis/batch-backtest";
import type { DailySwingBatchBacktestReport } from "@/lib/analysis/batch-backtest.types";
import type {
	DailySwingBatchDiagnosticReport,
	DailySwingBatchDiagnostics,
	DiagnosticTradeGroup,
	DiagnosticTradeMetrics,
	FrictionSensitivityResult,
} from "@/lib/analysis/batch-diagnostics.types";
import type { DailySwingBacktestDependencies } from "@/lib/analysis/backtest";
import type {
	BacktestTrade,
	BacktestTradeExitReason,
} from "@/lib/analysis/backtest.types";
import type {
	AnalysisState,
	TradeEntry,
	VolatilityState,
} from "@/lib/analysis/technical-analysis.types";

type FrictionScenarioReports = {
	scenario: FrictionSensitivityResult["scenario"];
	transactionCostBpsPerSide: number;
	slippageBpsPerFill: number;
	report: DailySwingBatchBacktestReport;
};

type GroupDefinition = {
	key: string;
	label: string;
	matches: (trade: BacktestTrade) => boolean;
};

function round(value: number, precision = 8) {
	const multiplier = 10 ** precision;
	return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function average(
	trades: readonly BacktestTrade[],
	selector: (trade: BacktestTrade) => number,
) {
	return trades.length === 0
		? null
		: round(
				trades.reduce((total, trade) => total + selector(trade), 0) /
					trades.length,
			);
}

export function diagnosticTradeMetrics(
	trades: readonly BacktestTrade[],
): DiagnosticTradeMetrics {
	const wins = trades.filter((trade) => trade.netPnl > 0).length;
	const losses = trades.filter((trade) => trade.netPnl < 0).length;
	const breakeven = trades.length - wins - losses;
	const grossProfits = trades.reduce(
		(total, trade) => total + Math.max(trade.netPnl, 0),
		0,
	);
	const grossLosses = Math.abs(
		trades.reduce((total, trade) => total + Math.min(trade.netPnl, 0), 0),
	);
	const targetOneCount = trades.filter((trade) =>
		trade.exitFills.some((fill) => fill.reason === "target_1"),
	).length;
	return {
		tradeCount: trades.length,
		wins,
		losses,
		breakeven,
		winRatePercent:
			trades.length === 0 ? null : round((wins / trades.length) * 100),
		netPnl: round(trades.reduce((total, trade) => total + trade.netPnl, 0)),
		totalRMultiple: round(
			trades.reduce((total, trade) => total + trade.rMultiple, 0),
		),
		averageRMultiple: average(trades, (trade) => trade.rMultiple),
		profitFactor: grossLosses === 0 ? null : round(grossProfits / grossLosses),
		averageBarsHeld: average(trades, (trade) => trade.barsHeld),
		averageFavorableExcursionPercent: average(
			trades,
			(trade) => trade.maximumFavorableExcursionPercent,
		),
		averageAdverseExcursionPercent: average(
			trades,
			(trade) => trade.maximumAdverseExcursionPercent,
		),
		targetOneReachRatePercent:
			trades.length === 0
				? null
				: round((targetOneCount / trades.length) * 100),
	};
}

function groups(
	trades: readonly BacktestTrade[],
	definitions: readonly GroupDefinition[],
): DiagnosticTradeGroup[] {
	return definitions.map((definition) => ({
		key: definition.key,
		label: definition.label,
		metrics: diagnosticTradeMetrics(trades.filter(definition.matches)),
	}));
}

function scenarioResult(
	scenario: FrictionScenarioReports,
): FrictionSensitivityResult {
	return {
		scenario: scenario.scenario,
		transactionCostBpsPerSide: scenario.transactionCostBpsPerSide,
		slippageBpsPerFill: scenario.slippageBpsPerFill,
		totalTrades: scenario.report.aggregate.totalTrades,
		pooledAverageRMultiple: scenario.report.aggregate.pooledAverageRMultiple,
		pooledProfitFactor: scenario.report.aggregate.pooledProfitFactor,
		equalWeightAverageReturnPercent:
			scenario.report.aggregate.equalWeightAverageReturnPercent,
		profitableInstrumentCount:
			scenario.report.aggregate.profitableInstrumentCount,
		beatBuyAndHoldCount: scenario.report.aggregate.beatBuyAndHoldCount,
	};
}

export function buildDailySwingBatchDiagnostics(
	reports: DailySwingBatchBacktestReport["reports"],
	frictionScenarios: FrictionScenarioReports[],
): DailySwingBatchDiagnostics {
	const trades = reports.flatMap((report) => report.trades);
	const setupTypes: TradeEntry["type"][] = ["pullback", "breakout", "breakdown"];
	const directions: BacktestTrade["direction"][] = ["long", "short"];
	const trendStates: AnalysisState[] = ["bullish", "mixed", "bearish"];
	const volatilityStates: VolatilityState[] = ["low", "normal", "high"];
	const exitReasons: BacktestTradeExitReason[] = [
		"stop_loss",
		"target_2",
		"maximum_holding_period",
		"end_of_data",
	];
	return {
		bySetupType: groups(
			trades,
			setupTypes.map((setupType) => ({
				key: setupType,
				label: setupType.replaceAll("_", " "),
				matches: (trade) => trade.setupType === setupType,
			})),
		),
		byDirection: groups(
			trades,
			directions.map((direction) => ({
				key: direction,
				label: direction,
				matches: (trade) => trade.direction === direction,
			})),
		),
		byTrendRegime: groups(
			trades,
			trendStates.map((trend) => ({
				key: trend,
				label: trend,
				matches: (trade) => trade.trendRegime === trend,
			})),
		),
		byVolatilityRegime: groups(
			trades,
			volatilityStates.map((volatility) => ({
				key: volatility,
				label: volatility,
				matches: (trade) => trade.volatilityRegime === volatility,
			})),
		),
		byCombinedRegime: groups(
			trades,
			trendStates.flatMap((trend) =>
				volatilityStates.map((volatility) => ({
					key: `${trend}:${volatility}`,
					label: `${trend} trend / ${volatility} volatility`,
					matches: (trade: BacktestTrade) =>
						trade.trendRegime === trend &&
						trade.volatilityRegime === volatility,
				})),
			),
		),
		byExitReason: groups(
			trades,
			exitReasons.map((exitReason) => ({
				key: exitReason,
				label: exitReason.replaceAll("_", " "),
				matches: (trade) => trade.exitReason === exitReason,
			})),
		),
		byHoldingPeriod: groups(trades, [
			{
				key: "1-5",
				label: "1-5 bars",
				matches: (trade) => trade.barsHeld <= 5,
			},
			{
				key: "6-10",
				label: "6-10 bars",
				matches: (trade) => trade.barsHeld >= 6 && trade.barsHeld <= 10,
			},
			{
				key: "11-20",
				label: "11-20 bars",
				matches: (trade) => trade.barsHeld >= 11 && trade.barsHeld <= 20,
			},
			{
				key: "21+",
				label: "21+ bars",
				matches: (trade) => trade.barsHeld >= 21,
			},
		]),
		frictionSensitivity: frictionScenarios.map(scenarioResult),
		warnings: [
			"Diagnostic PnL and profit factor pool trades from independent instrument accounts.",
			"Subgroups with few trades are descriptive only and must not be used for parameter selection.",
			"Friction scenarios reuse identical signals and OHLC paths while changing modeled transaction costs and slippage.",
			...(trades.every((trade) => trade.direction === "long")
				? ["No short trades occurred, so direction comparisons are unavailable."]
				: []),
		],
	};
}

function withFriction(
	input: DailySwingBatchBacktestInput,
	transactionCostBpsPerSide: number,
	slippageBpsPerFill: number,
): DailySwingBatchBacktestInput {
	return {
		...input,
		instruments: input.instruments.map((item) => ({
			...item,
			configuration: {
				...item.configuration,
				transactionCostBpsPerSide,
				slippageBpsPerFill,
			},
		})),
	};
}

export function runDailySwingBatchDiagnosticBacktest(
	input: DailySwingBatchBacktestInput,
	dependencies: DailySwingBacktestDependencies = {},
): DailySwingBatchDiagnosticReport {
	const configured = runDailySwingBatchBacktest(input, dependencies);
	const configuredCosts = new Set(
		configured.reports.map(
			(report) =>
				`${report.configuration.transactionCostBpsPerSide}:${report.configuration.slippageBpsPerFill}`,
		),
	);
	if (configuredCosts.size !== 1) {
		throw new Error(
			"All batch instruments must use the same costs for friction diagnostics",
		);
	}
	const firstConfiguration = configured.reports[0].configuration;
	const frictionless = runDailySwingBatchBacktest(
		withFriction(input, 0, 0),
		dependencies,
	);
	const stressed = runDailySwingBatchBacktest(
		withFriction(input, 10, 15),
		dependencies,
	);
	return {
		...configured,
		diagnostics: buildDailySwingBatchDiagnostics(configured.reports, [
			{
				scenario: "configured",
				transactionCostBpsPerSide:
					firstConfiguration.transactionCostBpsPerSide,
				slippageBpsPerFill: firstConfiguration.slippageBpsPerFill,
				report: configured,
			},
			{
				scenario: "frictionless",
				transactionCostBpsPerSide: 0,
				slippageBpsPerFill: 0,
				report: frictionless,
			},
			{
				scenario: "stressed",
				transactionCostBpsPerSide: 10,
				slippageBpsPerFill: 15,
				report: stressed,
			},
		]),
	};
}
