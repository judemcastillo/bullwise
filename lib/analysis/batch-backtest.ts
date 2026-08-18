import {
	runDailySwingBacktest,
	type DailySwingBacktestDependencies,
} from "@/lib/analysis/backtest";
import {
	DAILY_SWING_BATCH_BACKTEST_VERSION,
	type BatchAggregateSummary,
	type BatchInstrumentSummary,
	type DailySwingBatchBacktestReport,
} from "@/lib/analysis/batch-backtest.types";
import type {
	DailySwingBacktestInput,
	DailySwingBacktestReport,
} from "@/lib/analysis/backtest.types";

export type DailySwingBatchBacktestInput = {
	universeName: string;
	instruments: DailySwingBacktestInput[];
};

function round(value: number, precision = 8) {
	const multiplier = 10 ** precision;
	return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function average(values: readonly number[]) {
	return values.length === 0
		? null
		: values.reduce((total, value) => total + value, 0) / values.length;
}

function median(values: readonly number[]) {
	if (values.length === 0) return null;
	const sorted = [...values].sort((left, right) => left - right);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[middle - 1] + sorted[middle]) / 2
		: sorted[middle];
}

function instrumentSummary(
	report: DailySwingBacktestReport,
): BatchInstrumentSummary {
	const buyAndHoldReturnPercent =
		report.baselines.instrumentBuyAndHoldReturnPercent;
	return {
		instrumentId: report.instrument.instrumentId,
		displaySymbol: report.instrument.displaySymbol,
		barsAvailable: report.window.barsAvailable,
		firstEvaluatedAt: report.window.firstEvaluatedAt,
		lastEvaluatedAt: report.window.lastEvaluatedAt,
		analyses: report.signalCounts.analyses,
		setups: report.signalCounts.longSetups + report.signalCounts.shortSetups,
		tradeCount: report.performance.tradeCount,
		winRatePercent: report.performance.winRatePercent,
		averageRMultiple: report.performance.averageRMultiple,
		profitFactor: report.performance.profitFactor,
		totalReturnPercent: report.performance.totalReturnPercent,
		maximumDrawdownPercent: report.performance.maximumDrawdownPercent,
		buyAndHoldReturnPercent,
		excessReturnPercent:
			buyAndHoldReturnPercent === null
				? null
				: round(report.performance.totalReturnPercent - buyAndHoldReturnPercent),
		benchmarkReturnPercent: report.baselines.benchmarkBuyAndHoldReturnPercent,
	};
}

function aggregateSummary(
	reports: readonly DailySwingBacktestReport[],
	summaries: readonly BatchInstrumentSummary[],
): BatchAggregateSummary {
	const trades = reports.flatMap((report) => report.trades);
	const totalWins = trades.filter((trade) => trade.netPnl > 0).length;
	const totalLosses = trades.filter((trade) => trade.netPnl < 0).length;
	const totalBreakeven = trades.length - totalWins - totalLosses;
	const grossProfits = trades.reduce(
		(total, trade) => total + Math.max(trade.netPnl, 0),
		0,
	);
	const grossLosses = Math.abs(
		trades.reduce((total, trade) => total + Math.min(trade.netPnl, 0), 0),
	);
	const returns = summaries.map((summary) => summary.totalReturnPercent);
	const drawdowns = summaries.map((summary) => summary.maximumDrawdownPercent);
	const buyAndHoldReturns = summaries.flatMap((summary) =>
		summary.buyAndHoldReturnPercent === null
			? []
			: [summary.buyAndHoldReturnPercent],
	);
	const excessReturns = summaries.flatMap((summary) =>
		summary.excessReturnPercent === null ? [] : [summary.excessReturnPercent],
	);
	const sortedByReturn = [...summaries].sort(
		(left, right) => left.totalReturnPercent - right.totalReturnPercent,
	);
	const best = sortedByReturn.at(-1);
	const worst = sortedByReturn[0];
	return {
		instrumentsTested: summaries.length,
		instrumentsWithTrades: summaries.filter((summary) => summary.tradeCount > 0)
			.length,
		profitableInstrumentCount: summaries.filter(
			(summary) => summary.totalReturnPercent > 0,
		).length,
		beatBuyAndHoldCount: summaries.filter(
			(summary) =>
				summary.excessReturnPercent !== null && summary.excessReturnPercent > 0,
		).length,
		totalAnalyses: summaries.reduce(
			(total, summary) => total + summary.analyses,
			0,
		),
		totalSetups: summaries.reduce(
			(total, summary) => total + summary.setups,
			0,
		),
		totalTrades: trades.length,
		totalWins,
		totalLosses,
		totalBreakeven,
		pooledWinRatePercent:
			trades.length === 0 ? null : round((totalWins / trades.length) * 100),
		pooledAverageRMultiple:
			trades.length === 0
				? null
				: round(
						trades.reduce((total, trade) => total + trade.rMultiple, 0) /
							trades.length,
					),
		pooledProfitFactor:
			grossLosses === 0 ? null : round(grossProfits / grossLosses),
		equalWeightAverageReturnPercent: round(average(returns) ?? 0),
		medianInstrumentReturnPercent: round(median(returns) ?? 0),
		averageMaximumDrawdownPercent: round(average(drawdowns) ?? 0),
		equalWeightAverageBuyAndHoldReturnPercent:
			buyAndHoldReturns.length === 0
				? null
				: round(average(buyAndHoldReturns) ?? 0),
		equalWeightAverageExcessReturnPercent:
			excessReturns.length === 0 ? null : round(average(excessReturns) ?? 0),
		bestInstrument: best
			? {
					displaySymbol: best.displaySymbol,
					totalReturnPercent: best.totalReturnPercent,
				}
			: null,
		worstInstrument: worst
			? {
					displaySymbol: worst.displaySymbol,
					totalReturnPercent: worst.totalReturnPercent,
				}
			: null,
	};
}

export function summarizeDailySwingBacktests(
	universeName: string,
	reports: DailySwingBacktestReport[],
	generatedAt = new Date(),
): DailySwingBatchBacktestReport {
	if (!universeName.trim()) throw new Error("universeName is required");
	if (reports.length === 0) throw new Error("At least one report is required");
	if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be valid");
	const summaries = reports.map(instrumentSummary);
	const minimumRequiredBars = 1_250 as const;
	const recommendedBars = 2_500 as const;
	const instrumentsMeetingMinimum = summaries.filter(
		(summary) => summary.barsAvailable >= minimumRequiredBars,
	).length;
	const instrumentsMeetingRecommended = summaries.filter(
		(summary) => summary.barsAvailable >= recommendedBars,
	).length;
	return {
		batchVersion: DAILY_SWING_BATCH_BACKTEST_VERSION,
		generatedAt: generatedAt.toISOString(),
		universeName: universeName.trim(),
		methodology: {
			accountModel: "independent_equal_starting_equity",
			description:
				"Each instrument is simulated independently with equal starting equity; aggregate returns are equal-weight statistics, not a capital-sharing portfolio simulation.",
		},
		coverage: {
			minimumRequiredBars,
			recommendedBars,
			minimumBarsAvailable: Math.min(
				...summaries.map((summary) => summary.barsAvailable),
			),
			instrumentsMeetingMinimum,
			instrumentsMeetingRecommended,
			researchReady: instrumentsMeetingMinimum === summaries.length,
			recommendedDepthAvailable:
				instrumentsMeetingRecommended === summaries.length,
		},
		aggregate: aggregateSummary(reports, summaries),
		instruments: summaries,
		reports,
		warnings: [
			"Cross-instrument totals pool trades from independent accounts and do not model concurrent portfolio exposure.",
			"Equal-weight average return gives every instrument the same weight regardless of trade count.",
			...(reports.some((report) =>
				report.warnings.some((warning) =>
					warning.startsWith("Massive adjusted bars"),
				),
			)
				? [
						"Massive adjusted bars account for splits but not dividends; ETF strategy and buy-and-hold figures are price returns and exclude distributions.",
					]
				: []),
			...(reports.some((report) =>
				report.warnings.some((warning) =>
					warning.startsWith("Alpaca bars were requested"),
				),
			)
				? [
						"Alpaca bars use adjustment=all; strategy and baseline returns incorporate Alpaca's corporate-action adjustments.",
					]
				: []),
			...(instrumentsMeetingMinimum < summaries.length
				? [
						`At least one instrument has fewer than ${minimumRequiredBars} bars; this batch is a smoke test rather than multi-regime validation.`,
					]
				: []),
			...(instrumentsMeetingMinimum === summaries.length &&
			instrumentsMeetingRecommended < summaries.length
				? [
						`Minimum research coverage passed, but at least one instrument has fewer than the recommended ${recommendedBars} bars.`,
					]
				: []),
		],
	};
}

export function runDailySwingBatchBacktest(
	input: DailySwingBatchBacktestInput,
	dependencies: DailySwingBacktestDependencies = {},
) {
	if (input.instruments.length === 0) {
		throw new Error("At least one instrument is required for a batch backtest");
	}
	const ids = input.instruments.map((item) => item.instrument.instrumentId);
	if (new Set(ids).size !== ids.length) {
		throw new Error("Batch instruments must have unique instrument IDs");
	}
	const reports = input.instruments.map((instrument) =>
		runDailySwingBacktest(instrument, dependencies),
	);
	return summarizeDailySwingBacktests(input.universeName, reports);
}
