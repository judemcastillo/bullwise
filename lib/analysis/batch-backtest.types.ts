import type { DailySwingBacktestReport } from "@/lib/analysis/backtest.types";

export const DAILY_SWING_BATCH_BACKTEST_VERSION = "1.2.0";

export type BatchInstrumentSummary = {
	instrumentId: string;
	displaySymbol: string;
	barsAvailable: number;
	firstEvaluatedAt: string | null;
	lastEvaluatedAt: string | null;
	analyses: number;
	setups: number;
	tradeCount: number;
	winRatePercent: number | null;
	averageRMultiple: number | null;
	profitFactor: number | null;
	totalReturnPercent: number;
	maximumDrawdownPercent: number;
	buyAndHoldReturnPercent: number | null;
	excessReturnPercent: number | null;
	benchmarkReturnPercent: number | null;
};

export type BatchAggregateSummary = {
	instrumentsTested: number;
	instrumentsWithTrades: number;
	profitableInstrumentCount: number;
	beatBuyAndHoldCount: number;
	totalAnalyses: number;
	totalSetups: number;
	totalTrades: number;
	totalWins: number;
	totalLosses: number;
	totalBreakeven: number;
	pooledWinRatePercent: number | null;
	pooledAverageRMultiple: number | null;
	pooledProfitFactor: number | null;
	equalWeightAverageReturnPercent: number;
	medianInstrumentReturnPercent: number;
	averageMaximumDrawdownPercent: number;
	equalWeightAverageBuyAndHoldReturnPercent: number | null;
	equalWeightAverageExcessReturnPercent: number | null;
	bestInstrument: { displaySymbol: string; totalReturnPercent: number } | null;
	worstInstrument: { displaySymbol: string; totalReturnPercent: number } | null;
};

export type DailySwingBatchBacktestReport = {
	batchVersion: typeof DAILY_SWING_BATCH_BACKTEST_VERSION;
	generatedAt: string;
	universeName: string;
	methodology: {
		accountModel: "independent_equal_starting_equity";
		description: string;
	};
	coverage: {
		minimumRequiredBars: 1250;
		recommendedBars: 2500;
		minimumBarsAvailable: number;
		instrumentsMeetingMinimum: number;
		instrumentsMeetingRecommended: number;
		researchReady: boolean;
		recommendedDepthAvailable: boolean;
	};
	aggregate: BatchAggregateSummary;
	instruments: BatchInstrumentSummary[];
	reports: DailySwingBacktestReport[];
	warnings: string[];
};
