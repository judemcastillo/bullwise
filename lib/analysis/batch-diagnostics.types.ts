import type { DailySwingBatchBacktestReport } from "@/lib/analysis/batch-backtest.types";

export type DiagnosticTradeMetrics = {
	tradeCount: number;
	wins: number;
	losses: number;
	breakeven: number;
	winRatePercent: number | null;
	netPnl: number;
	totalRMultiple: number;
	averageRMultiple: number | null;
	profitFactor: number | null;
	averageBarsHeld: number | null;
	averageFavorableExcursionPercent: number | null;
	averageAdverseExcursionPercent: number | null;
	targetOneReachRatePercent: number | null;
};

export type DiagnosticTradeGroup = {
	key: string;
	label: string;
	metrics: DiagnosticTradeMetrics;
};

export type FrictionSensitivityResult = {
	scenario: "configured" | "frictionless" | "stressed";
	transactionCostBpsPerSide: number;
	slippageBpsPerFill: number;
	totalTrades: number;
	pooledAverageRMultiple: number | null;
	pooledProfitFactor: number | null;
	equalWeightAverageReturnPercent: number;
	profitableInstrumentCount: number;
	beatBuyAndHoldCount: number;
};

export type DailySwingBatchDiagnostics = {
	bySetupType: DiagnosticTradeGroup[];
	byDirection: DiagnosticTradeGroup[];
	byTrendRegime: DiagnosticTradeGroup[];
	byVolatilityRegime: DiagnosticTradeGroup[];
	byCombinedRegime: DiagnosticTradeGroup[];
	byExitReason: DiagnosticTradeGroup[];
	byHoldingPeriod: DiagnosticTradeGroup[];
	frictionSensitivity: FrictionSensitivityResult[];
	warnings: string[];
};

export type DailySwingBatchDiagnosticReport = DailySwingBatchBacktestReport & {
	diagnostics: DailySwingBatchDiagnostics;
};
