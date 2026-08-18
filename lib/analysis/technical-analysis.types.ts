import type { MarketDataInterval } from "@/lib/market-data/types";
import type { AssetClass, EquitySecurityType } from "@/types/instruments";

export const TECHNICAL_ANALYSIS_ENGINE_VERSION = "1.0.0";
export const DAILY_SWING_STRATEGY_VERSION = "daily-swing-v1-draft";
export const DAILY_SWING_V2_STRATEGY_VERSION = "daily-swing-v2-confirmation";

export type DailySwingStrategyVersion =
	| typeof DAILY_SWING_STRATEGY_VERSION
	| typeof DAILY_SWING_V2_STRATEGY_VERSION;

export type TechnicalAnalysisInstrument = {
	instrumentId: string;
	displaySymbol: string;
	assetClass: AssetClass;
	securityType?: EquitySecurityType;
	etfProfile?: "standard" | "leveraged" | "inverse" | "leveraged_inverse" | "unknown";
	currency: string;
	pricePrecision: number;
};

export type AnalysisState = "bullish" | "mixed" | "bearish";
export type VolatilityState = "low" | "normal" | "high";
export type ParticipationState = "weak" | "normal" | "strong" | "unavailable";
export type EvidenceStrength = "weak" | "moderate" | "strong";
export type SignalAction = "long_setup" | "short_setup" | "no_trade";
export type SetupStatus = "watching" | "active" | "none";

export type TechnicalLevel = {
	kind: "support" | "resistance";
	price: string;
	distancePercent: number;
	touches: number;
	source: "swing_cluster" | "range_boundary";
};

export type IndicatorSnapshot = {
	close: string;
	sma20: string;
	sma50: string;
	sma200: string;
	sma20SlopePercent: number;
	sma50SlopePercent: number;
	rsi14: number;
	macd: string;
	macdSignal: string;
	macdHistogram: string;
	atr14: string;
	atrPercent: number;
	return5Percent: number;
	return20Percent: number;
	return60Percent: number;
	realizedVolatility20Percent: number;
	realizedVolatility60Percent: number;
	volatilityPercentile: number;
	volumeZScore20: number | null;
	relativeStrength20Percent: number | null;
	relativeStrength60Percent: number | null;
};

export type FactorAssessment<TState extends string> = {
	state: TState;
	evidence: string[];
	counterEvidence: string[];
};

export type TechnicalAnalysisAssessments = {
	trend: FactorAssessment<AnalysisState>;
	momentum: FactorAssessment<AnalysisState>;
	volatility: FactorAssessment<VolatilityState>;
	participation: FactorAssessment<ParticipationState>;
};

export type TradeEntry = {
	type: "pullback" | "breakout" | "breakdown";
	low: string;
	high: string;
	trigger: string;
};

export type TradeStop = {
	price: string;
	reason: string;
};

export type TradeTarget = {
	price: string;
	rewardRisk: number;
	reason: string;
};

export type TradePlan = {
	direction: "long" | "short";
	status: Exclude<SetupStatus, "none">;
	entry: TradeEntry;
	stopLoss: TradeStop;
	targets: TradeTarget[];
	riskReward: number;
	invalidation: string;
	expiresAfterCompletedBars: number;
	expiresAt: string | null;
};

export type AnalysisSignal = {
	action: SignalAction;
	status: SetupStatus;
	evidenceStrength: EvidenceStrength;
	reasons: string[];
	counterEvidence: string[];
};

export type AnalysisDataQuality = {
	provider: string;
	providerSymbol: string;
	interval: MarketDataInterval;
	adjusted: boolean;
	barsReceived: number;
	barsUsed: number;
	barsExcluded: number;
	firstBarAt: string | null;
	lastBarAt: string | null;
	completedThrough: string;
	warnings: string[];
};

export type TechnicalAnalysisUnavailableReason =
	| "ineligible_instrument"
	| "unsupported_interval"
	| "unadjusted_data"
	| "instrument_mismatch"
	| "invalid_data"
	| "insufficient_data"
	| "stale_data";

type TechnicalAnalysisBase = {
	engineVersion: typeof TECHNICAL_ANALYSIS_ENGINE_VERSION;
	strategyVersion: DailySwingStrategyVersion;
	instrument: TechnicalAnalysisInstrument;
	analyzedAt: string;
	scope: {
		style: "swing";
		primaryInterval: "1d";
		expectedHoldingPeriod: "5-20 trading days";
	};
	dataQuality: AnalysisDataQuality;
};

export type TechnicalAnalysisUnavailableResult = TechnicalAnalysisBase & {
	status: "unavailable";
	reason: TechnicalAnalysisUnavailableReason;
	message: string;
};

export type TechnicalAnalysisReadyResult = TechnicalAnalysisBase & {
	status: "ready";
	indicators: IndicatorSnapshot;
	assessments: TechnicalAnalysisAssessments;
	marketStructure: {
		support: TechnicalLevel[];
		resistance: TechnicalLevel[];
	};
	signal: AnalysisSignal;
	tradePlan: TradePlan | null;
};

export type TechnicalAnalysisResult =
	| TechnicalAnalysisUnavailableResult
	| TechnicalAnalysisReadyResult;
