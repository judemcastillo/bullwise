import type { BacktestTrade } from "@/lib/analysis/backtest.types";

export const DAILY_SWING_PORTFOLIO_BACKTEST_VERSION = "1.0.0";

export type PortfolioCandidateSelectionPolicy =
	| "symbol"
	| "v3_signal_quality";

export type PortfolioBacktestConfiguration = {
	initialEquity: number;
	riskPerTradePercent: number;
	maximumOpenPositions: number;
	maximumTotalRiskPercent: number;
	maximumGrossExposurePercent: number;
	candidateSelectionPolicy: PortfolioCandidateSelectionPolicy;
};

export type PortfolioAcceptedTrade = {
	instrumentId: string;
	displaySymbol: string;
	entryAt: string;
	exitAt: string;
	portfolioPositionUnits: number;
	portfolioRiskCapital: number;
	scaleFactor: number;
	netPnl: number;
	rMultiple: number;
	sourceTrade: BacktestTrade;
};

export type PortfolioRejectedTrade = {
	instrumentId: string;
	displaySymbol: string;
	entryAt: string;
	exitAt: string;
	reason: "maximum_open_positions" | "maximum_total_risk" | "maximum_gross_exposure";
};

export type PortfolioEquityPoint = {
	at: string;
	equity: number;
	drawdownPercent: number;
	openPositions: number;
	grossExposurePercent: number;
	committedRiskPercent: number;
};

export type DailySwingPortfolioBacktestReport = {
	portfolioBacktestVersion: typeof DAILY_SWING_PORTFOLIO_BACKTEST_VERSION;
	generatedAt: string;
	universeName: string;
	configuration: PortfolioBacktestConfiguration;
	source: {
		backtestVersions: string[];
		strategyVersions: string[];
		transactionCostBpsPerSide: number;
		slippageBpsPerFill: number;
		maximumHoldingBars: number;
		sameBarPolicy: "stop_first" | "target_first";
	};
	candidateTrades: number;
	acceptedTrades: PortfolioAcceptedTrade[];
	rejectedTrades: PortfolioRejectedTrade[];
	performance: {
		tradeCount: number;
		wins: number;
		losses: number;
		winRatePercent: number | null;
		averageRMultiple: number | null;
		profitFactor: number | null;
		initialEquity: number;
		endingEquity: number;
		totalReturnPercent: number;
		annualizedReturnPercent: number | null;
		maximumDrawdownPercent: number;
	};
	period: {
		startAt: string | null;
		endAt: string | null;
		years: number | null;
	};
	exposure: {
		maximumConcurrentPositions: number;
		maximumGrossExposurePercent: number;
		maximumCommittedRiskPercent: number;
	};
	rejections: {
		maximumOpenPositions: number;
		maximumTotalRisk: number;
		maximumGrossExposure: number;
	};
	equityCurve: PortfolioEquityPoint[];
	warnings: string[];
};
