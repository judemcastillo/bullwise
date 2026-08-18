import type {
	AnalysisState,
	EvidenceStrength,
	TechnicalAnalysisInstrument,
	TradePlan,
	VolatilityState,
} from "@/lib/analysis/technical-analysis.types";
import type { MarketBars } from "@/lib/market-data/types";

export const DAILY_SWING_BACKTEST_VERSION = "1.2.0";

export type SameBarPolicy = "stop_first" | "target_first";

export type BacktestConfiguration = {
	initialEquity: number;
	riskPerTradePercent: number;
	transactionCostBpsPerSide: number;
	slippageBpsPerFill: number;
	maximumHoldingBars: number;
	sameBarPolicy: SameBarPolicy;
	allowShortSetups: boolean;
};

export type DailySwingBacktestInput = {
	instrument: TechnicalAnalysisInstrument;
	marketData: MarketBars;
	benchmarkData?: MarketBars;
	startAt?: Date;
	endAt?: Date;
	configuration?: Partial<BacktestConfiguration>;
};

export type BacktestTradeExitReason =
	| "stop_loss"
	| "target_2"
	| "maximum_holding_period"
	| "end_of_data";

export type BacktestExitFill = {
	reason: "target_1" | BacktestTradeExitReason;
	filledAt: string;
	price: number;
	positionFraction: number;
};

export type BacktestTrade = {
	instrumentId: string;
	direction: TradePlan["direction"];
	setupType: TradePlan["entry"]["type"];
	signalAt: string;
	entryAt: string;
	entryPrice: number;
	stopPrice: number;
	targetPrices: number[];
	exitAt: string;
	exitReason: BacktestTradeExitReason;
	exitFills: BacktestExitFill[];
	barsHeld: number;
	trendRegime: AnalysisState;
	volatilityRegime: VolatilityState;
	signalQuality: BacktestSignalQuality;
	positionUnits: number;
	riskCapital: number;
	grossPnl: number;
	transactionCosts: number;
	netPnl: number;
	netReturnOnEquityPercent: number;
	rMultiple: number;
	maximumFavorableExcursionPercent: number;
	maximumAdverseExcursionPercent: number;
	markToMarket: BacktestTradeMark[];
};

export type BacktestSignalQuality = {
	evidenceStrength: EvidenceStrength | "unavailable";
	relativeStrength20Percent: number | null;
	volumeZScore20: number | null;
	planRiskReward: number;
};

export type BacktestTradeMark = {
	at: string;
	markPrice: number;
	remainingPositionFraction: number;
	realizedGrossPnl: number;
	unrealizedGrossPnl: number;
	transactionCosts: number;
	netPnl: number;
};

export type UntriggeredSetup = {
	direction: TradePlan["direction"];
	signalAt: string;
	resolvedAt: string;
	reason: "expired" | "end_of_data";
	barsObserved: number;
};

export type TradeSimulationResult =
	| {
			status: "completed";
			barsConsumed: number;
			trade: BacktestTrade;
	  }
	| {
			status: "untriggered";
			barsConsumed: number;
			setup: UntriggeredSetup;
	  };

export type TradeGroupMetrics = {
	tradeCount: number;
	wins: number;
	losses: number;
	breakeven: number;
	winRatePercent: number | null;
	netPnl: number;
	averageNetPnl: number | null;
	averageRMultiple: number | null;
	profitFactor: number | null;
	averageFavorableExcursionPercent: number | null;
	averageAdverseExcursionPercent: number | null;
};

export type BacktestPerformance = TradeGroupMetrics & {
	initialEquity: number;
	endingEquity: number;
	totalReturnPercent: number;
	maximumDrawdownPercent: number;
};

export type RegimePerformance = {
	trend: AnalysisState;
	volatility: VolatilityState;
	metrics: TradeGroupMetrics;
};

export type BacktestBaselines = {
	instrumentBuyAndHoldReturnPercent: number | null;
	benchmarkBuyAndHoldReturnPercent: number | null;
	simpleMomentumReturnPercent: number | null;
	definition: "Long when close is above SMA200 and 20-day return is positive; otherwise cash.";
};

export type DailySwingBacktestReport = {
	backtestVersion: typeof DAILY_SWING_BACKTEST_VERSION;
	engineVersion: string;
	strategyVersion: string;
	instrument: TechnicalAnalysisInstrument;
	configuration: BacktestConfiguration;
	window: {
		requestedStartAt: string | null;
		requestedEndAt: string | null;
		firstEvaluatedAt: string | null;
		lastEvaluatedAt: string | null;
		barsAvailable: number;
	};
	signalCounts: {
		analyses: number;
		unavailable: number;
		noTrade: number;
		longSetups: number;
		shortSetups: number;
		triggered: number;
		expiredUntriggered: number;
		endOfDataUntriggered: number;
	};
	performance: BacktestPerformance;
	byDirection: {
		long: TradeGroupMetrics;
		short: TradeGroupMetrics;
	};
	byRegime: RegimePerformance[];
	baselines: BacktestBaselines;
	equityCurve: Array<{ at: string; equity: number; drawdownPercent: number }>;
	trades: BacktestTrade[];
	untriggeredSetups: UntriggeredSetup[];
	warnings: string[];
};
