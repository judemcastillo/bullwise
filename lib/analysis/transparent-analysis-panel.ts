import type {
	AnalysisDataQuality,
	AnalysisState,
	IndicatorSnapshot,
	TechnicalAnalysisReadyResult,
	TechnicalAnalysisResult,
	TechnicalAnalysisUnavailableReason,
} from "@/lib/analysis/technical-analysis.types";
import {
	TRANSPARENT_ANALYSIS_PANEL_DISCLAIMER,
	TRANSPARENT_ANALYSIS_PANEL_VERSION,
	type AnalysisPanelAvailableResponse,
	type AnalysisPanelContext,
	type AnalysisPanelDataQuality,
	type AnalysisPanelEvidenceFactor,
	type AnalysisPanelLevel,
	type AnalysisPanelResponse,
	type AnalysisPanelUnavailableReason,
	type AnalysisPanelUnavailableResponse,
} from "@/lib/analysis/transparent-analysis-panel.types";

export type BuildAnalysisPanelInput = {
	canonicalKey: string;
	name: string;
	result: TechnicalAnalysisResult;
};

const APPROVED_WARNING_MAP = new Map<string, string>([
	[
		"Bars after the completed-session boundary were excluded.",
		"An incomplete or future-dated daily bar was excluded.",
	],
	[
		"Historical bars were reordered by timestamp.",
		"Historical daily bars were reordered by timestamp.",
	],
	[
		"Benchmark data were unavailable; relative-strength fields are null.",
		"SPY benchmark data are unavailable; relative strength is omitted.",
	],
	[
		"Recent volume data are incomplete; participation may be unavailable.",
		"Recent volume data are incomplete; participation may be unavailable.",
	],
	[
		"Benchmark data were unusable or incomplete; some relative-strength fields are null.",
		"SPY benchmark data are incomplete; relative strength is omitted.",
	],
]);

const UNRECOGNIZED_WARNING =
	"Additional market-data quality checks require review.";

const ENGINE_UNAVAILABLE_REASON_MAP: Record<
	TechnicalAnalysisUnavailableReason,
	AnalysisPanelUnavailableReason
> = {
	ineligible_instrument: "unsupported_instrument",
	unsupported_interval: "invalid_market_data",
	unadjusted_data: "invalid_market_data",
	instrument_mismatch: "invalid_market_data",
	invalid_data: "invalid_market_data",
	insufficient_data: "insufficient_history",
	stale_data: "stale_market_data",
};

const PRODUCT_UNAVAILABLE_MESSAGES: Record<AnalysisPanelUnavailableReason, string> = {
	unsupported_instrument:
		"Daily market analysis is currently available only for eligible U.S. common stocks.",
	bars_provider_unavailable:
		"Daily market data are temporarily unavailable. Please try again later.",
	completed_session_unavailable:
		"A completed U.S. market session could not be determined.",
	invalid_market_data: "Daily market data could not be validated for analysis.",
	insufficient_history: "At least 300 completed daily bars are required for analysis.",
	stale_market_data: "The latest completed daily market data are stale.",
	analysis_failed: "Daily market analysis could not be prepared.",
};

function panelBase() {
	return {
		version: TRANSPARENT_ANALYSIS_PANEL_VERSION,
		disclaimer: TRANSPARENT_ANALYSIS_PANEL_DISCLAIMER,
	} as const;
}

export function buildUnavailableAnalysisPanelResponse(
	reason: AnalysisPanelUnavailableReason,
): AnalysisPanelUnavailableResponse {
	return {
		...panelBase(),
		status: "unavailable",
		reason,
		message: PRODUCT_UNAVAILABLE_MESSAGES[reason],
	};
}

export function analysisPanelContext(
	trend: AnalysisState,
	momentum: AnalysisState,
): AnalysisPanelContext {
	if (trend === "bullish" && momentum === "bullish") return "constructive";
	if (trend === "bearish" && momentum === "bearish") return "defensive";
	return "mixed";
}

function approvedWarnings(warnings: readonly string[]) {
	return [
		...new Set(
			warnings.map(
				(warning) => APPROVED_WARNING_MAP.get(warning) ?? UNRECOGNIZED_WARNING,
			),
		),
	];
}

function mapDataQuality(
	dataQuality: AnalysisDataQuality,
): AnalysisPanelDataQuality | undefined {
	if (
		dataQuality.interval !== "1d" ||
		dataQuality.adjusted !== true ||
		dataQuality.firstBarAt === null ||
		dataQuality.lastBarAt === null
	) {
		return undefined;
	}
	return {
		provider: dataQuality.provider,
		interval: "1d",
		adjusted: true,
		barsUsed: dataQuality.barsUsed,
		firstBarAt: dataQuality.firstBarAt,
		lastBarAt: dataQuality.lastBarAt,
		completedThrough: dataQuality.completedThrough,
		warnings: approvedWarnings(dataQuality.warnings),
	};
}

function trendFactor(
	result: TechnicalAnalysisReadyResult,
): AnalysisPanelEvidenceFactor<AnalysisState> {
	const indicators = result.indicators;
	const close = Number(indicators.close);
	const sma20 = Number(indicators.sma20);
	const sma50 = Number(indicators.sma50);
	const sma200 = Number(indicators.sma200);
	const evidence: string[] = [];
	const counterEvidence: string[] = [];

	if (close > sma200) {
		evidence.push("Price is above its 200-day moving average.");
	} else {
		counterEvidence.push("Price is below its 200-day moving average.");
	}
	if (sma20 > sma50 && sma50 > sma200) {
		evidence.push("The 20-, 50-, and 200-day moving averages are bullishly aligned.");
	} else if (sma20 < sma50 && sma50 < sma200) {
		counterEvidence.push(
			"The 20-, 50-, and 200-day moving averages are bearishly aligned.",
		);
	} else {
		counterEvidence.push("The daily moving averages are not fully aligned.");
	}
	if (indicators.sma20SlopePercent > 0 && indicators.sma50SlopePercent > 0) {
		evidence.push("The 20- and 50-day moving averages are both rising.");
	} else if (
		indicators.sma20SlopePercent < 0 &&
		indicators.sma50SlopePercent < 0
	) {
		counterEvidence.push("The 20- and 50-day moving averages are both falling.");
	} else {
		counterEvidence.push("Short- and medium-term moving-average slopes disagree.");
	}

	return {
		state: result.assessments.trend.state,
		evidence,
		counterEvidence,
	};
}

function momentumFactor(
	result: TechnicalAnalysisReadyResult,
): AnalysisPanelEvidenceFactor<AnalysisState> {
	const indicators = result.indicators;
	const evidence: string[] = [];
	const counterEvidence: string[] = [];

	if (Number(indicators.macdHistogram) > 0) {
		evidence.push("Daily MACD momentum is positive.");
	} else {
		counterEvidence.push("Daily MACD momentum is negative.");
	}
	if (indicators.rsi14 >= 55 && indicators.rsi14 <= 70) {
		evidence.push(`RSI is constructive at ${indicators.rsi14}.`);
	} else if (indicators.rsi14 >= 30 && indicators.rsi14 <= 45) {
		counterEvidence.push(`RSI is weak at ${indicators.rsi14}.`);
	} else if (indicators.rsi14 > 70) {
		counterEvidence.push(`RSI is elevated at ${indicators.rsi14}.`);
	} else if (indicators.rsi14 < 30) {
		counterEvidence.push(`RSI is depressed at ${indicators.rsi14}.`);
	}
	if (indicators.return20Percent > 0) {
		evidence.push("The 20-day return is positive.");
	} else {
		counterEvidence.push("The 20-day return is negative.");
	}
	if (indicators.relativeStrength20Percent !== null) {
		if (indicators.relativeStrength20Percent > 0) {
			evidence.push("The instrument has outperformed SPY over 20 days.");
		} else {
			counterEvidence.push("The instrument has underperformed SPY over 20 days.");
		}
	}

	return {
		state: result.assessments.momentum.state,
		evidence,
		counterEvidence,
	};
}

function volatilityFactor(
	result: TechnicalAnalysisReadyResult,
): AnalysisPanelAvailableResponse["factors"]["volatility"] {
	const indicators = result.indicators;
	return {
		state: result.assessments.volatility.state,
		evidence: [
			`20-day realized volatility is ${indicators.realizedVolatility20Percent}%.`,
			`Current volatility is in the ${indicators.volatilityPercentile}th percentile of the available history.`,
		],
		counterEvidence:
			result.assessments.volatility.state === "high"
				? ["Recent returns have varied more than usual."]
				: [],
	};
}

function participationFactor(
	indicators: IndicatorSnapshot,
	state: TechnicalAnalysisReadyResult["assessments"]["participation"]["state"],
): AnalysisPanelAvailableResponse["factors"]["participation"] {
	if (indicators.volumeZScore20 === null) {
		return {
			state: "unavailable",
			evidence: [],
			counterEvidence: ["Recent volume participation could not be calculated."],
		};
	}
	return {
		state,
		evidence: [
			`Latest volume is ${indicators.volumeZScore20} standard deviations from its 20-day baseline.`,
		],
		counterEvidence:
			state === "weak" ? ["Recent volume participation is below its normal range."] : [],
	};
}

function levels(
	items: TechnicalAnalysisReadyResult["marketStructure"]["support"],
): AnalysisPanelLevel[] {
	return items.slice(0, 3).map((level) => ({
		kind: level.kind,
		price: level.price,
		distancePercent: level.distancePercent,
		touches: level.touches,
		source: level.source,
	}));
}

function isPartial(result: TechnicalAnalysisReadyResult, warnings: readonly string[]) {
	return (
		warnings.length > 0 ||
		result.indicators.relativeStrength20Percent === null ||
		result.indicators.relativeStrength60Percent === null ||
		result.indicators.volumeZScore20 === null ||
		result.assessments.participation.state === "unavailable"
	);
}

export function buildAnalysisPanelResponse({
	canonicalKey,
	name,
	result,
}: BuildAnalysisPanelInput): AnalysisPanelResponse {
	if (
		result.instrument.assetClass !== "equity" ||
		result.instrument.securityType !== "common_stock"
	) {
		return buildUnavailableAnalysisPanelResponse("unsupported_instrument");
	}
	if (result.status === "unavailable") {
		const unavailable = buildUnavailableAnalysisPanelResponse(
			ENGINE_UNAVAILABLE_REASON_MAP[result.reason],
		);
		const dataQuality = mapDataQuality(result.dataQuality);
		return {
			...unavailable,
			...(dataQuality ? { dataQuality } : {}),
		};
	}

	const dataQuality = mapDataQuality(result.dataQuality);
	if (!dataQuality) {
		return buildUnavailableAnalysisPanelResponse("analysis_failed");
	}
	return {
		...panelBase(),
		status: isPartial(result, dataQuality.warnings) ? "partial" : "ready",
		instrument: {
			canonicalKey,
			displaySymbol: result.instrument.displaySymbol,
			name,
			currency: result.instrument.currency,
		},
		asOf: dataQuality.lastBarAt,
		timeframe: {
			interval: "1d",
			description: "Daily context",
		},
		context: analysisPanelContext(
			result.assessments.trend.state,
			result.assessments.momentum.state,
		),
		factors: {
			trend: trendFactor(result),
			momentum: momentumFactor(result),
			volatility: volatilityFactor(result),
			participation: participationFactor(
				result.indicators,
				result.assessments.participation.state,
			),
		},
		levels: {
			support: levels(result.marketStructure.support),
			resistance: levels(result.marketStructure.resistance),
		},
		dataQuality,
	};
}
