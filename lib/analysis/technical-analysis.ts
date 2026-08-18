import {
	annualizedRealizedVolatility,
	averageTrueRangeSeries,
	macdSeries,
	parseMarketBar,
	percentageReturn,
	relativeStrengthIndexSeries,
	simpleMovingAverageSeries,
	volatilityPercentile,
	volumeZScore,
	type NumericBar,
} from "@/lib/analysis/indicators";
import {
	deriveMarketStructure,
	type DerivedMarketStructure,
	type InternalPriceLevel,
} from "@/lib/analysis/market-structure";
import {
	DAILY_SWING_STRATEGY_VERSION,
	TECHNICAL_ANALYSIS_ENGINE_VERSION,
	type AnalysisDataQuality,
	type AnalysisSignal,
	type AnalysisState,
	type EvidenceStrength,
	type FactorAssessment,
	type IndicatorSnapshot,
	type ParticipationState,
	type TechnicalAnalysisAssessments,
	type TechnicalAnalysisInstrument,
	type TechnicalAnalysisResult,
	type TechnicalAnalysisUnavailableReason,
	type TradePlan,
	type VolatilityState,
} from "@/lib/analysis/technical-analysis.types";
import { normalizeMarketNumber } from "@/lib/market-data/normalization";
import type { MarketBars } from "@/lib/market-data/types";

const MINIMUM_DAILY_BARS = 300;
const MAXIMUM_STALENESS_MS = 7 * 24 * 60 * 60 * 1000;
const MINIMUM_REWARD_RISK = 1.5;
const SETUP_EXPIRATION_BARS = 10;

export type DailySwingAnalysisInput = {
	instrument: TechnicalAnalysisInstrument;
	marketData: MarketBars;
	benchmarkData?: MarketBars;
	completedThrough: Date;
	analyzedAt: Date;
	allowShortSetups?: boolean;
};

type PreparedBars = {
	bars: NumericBar[];
	dataQuality: AnalysisDataQuality;
	error?: {
		reason: TechnicalAnalysisUnavailableReason;
		message: string;
	};
};

function round(value: number, precision = 2) {
	const multiplier = 10 ** precision;
	return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function price(value: number, precision: number) {
	return normalizeMarketNumber(value, precision) ?? String(value);
}

function signedDecimal(value: number, precision: number) {
	const magnitude =
		normalizeMarketNumber(Math.abs(value), precision, { allowZero: true }) ??
		String(Math.abs(value));
	return value < 0 ? `-${magnitude}` : magnitude;
}

function baseResult(input: DailySwingAnalysisInput, dataQuality: AnalysisDataQuality) {
	return {
		engineVersion: TECHNICAL_ANALYSIS_ENGINE_VERSION,
		strategyVersion: DAILY_SWING_STRATEGY_VERSION,
		instrument: input.instrument,
		analyzedAt: input.analyzedAt.toISOString(),
		scope: {
			style: "swing" as const,
			primaryInterval: "1d" as const,
			expectedHoldingPeriod: "5-20 trading days" as const,
		},
		dataQuality,
	} as const;
}

function unavailable(
	input: DailySwingAnalysisInput,
	dataQuality: AnalysisDataQuality,
	reason: TechnicalAnalysisUnavailableReason,
	message: string,
): TechnicalAnalysisResult {
	return {
		...baseResult(input, dataQuality),
		status: "unavailable",
		reason,
		message,
	};
}

function initialDataQuality(input: DailySwingAnalysisInput): AnalysisDataQuality {
	return {
		provider: input.marketData.provider,
		providerSymbol: input.marketData.providerSymbol,
		interval: input.marketData.interval,
		adjusted: input.marketData.adjusted,
		barsReceived: input.marketData.bars.length,
		barsUsed: 0,
		barsExcluded: 0,
		firstBarAt: null,
		lastBarAt: null,
		completedThrough: input.completedThrough.toISOString(),
		warnings: [],
	};
}

function prepareBars(input: DailySwingAnalysisInput): PreparedBars {
	const dataQuality = initialDataQuality(input);
	if (input.marketData.instrumentId !== input.instrument.instrumentId) {
		return {
			bars: [],
			dataQuality,
			error: {
				reason: "instrument_mismatch",
				message: "Historical bars do not belong to the requested instrument.",
			},
		};
	}
	if (
		input.marketData.currency.trim().toUpperCase() !==
		input.instrument.currency.trim().toUpperCase()
	) {
		return {
			bars: [],
			dataQuality,
			error: {
				reason: "instrument_mismatch",
				message: "Historical bars use a different currency from the instrument.",
			},
		};
	}
	if (input.marketData.interval !== "1d") {
		return {
			bars: [],
			dataQuality,
			error: {
				reason: "unsupported_interval",
				message: "The daily swing engine requires one-day bars.",
			},
		};
	}
	if (!input.marketData.adjusted) {
		return {
			bars: [],
			dataQuality,
			error: {
				reason: "unadjusted_data",
				message: "Adjusted historical bars are required for equity analysis.",
			},
		};
	}

	const completedThrough = input.completedThrough.getTime();
	const eligible = input.marketData.bars.filter(
		(bar) => bar.startedAt.getTime() <= completedThrough,
	);
	dataQuality.barsExcluded = input.marketData.bars.length - eligible.length;
	if (dataQuality.barsExcluded > 0) {
		dataQuality.warnings.push("Bars after the completed-session boundary were excluded.");
	}

	const timestamps = new Set<number>();
	const parsed: NumericBar[] = [];
	let wasOrdered = true;
	for (const bar of eligible) {
		const timestamp = bar.startedAt.getTime();
		if (timestamps.has(timestamp)) {
			return {
				bars: [],
				dataQuality,
				error: {
					reason: "invalid_data",
					message: "Historical bars contain duplicate timestamps.",
				},
			};
		}
		if (parsed.length > 0 && timestamp < parsed.at(-1)!.startedAt.getTime()) {
			wasOrdered = false;
		}
		timestamps.add(timestamp);
		const numeric = parseMarketBar(bar);
		if (!numeric) {
			return {
				bars: [],
				dataQuality,
				error: {
					reason: "invalid_data",
					message: "Historical bars contain invalid price, volume, or timestamp data.",
				},
			};
		}
		parsed.push(numeric);
	}
	parsed.sort((left, right) => left.startedAt.getTime() - right.startedAt.getTime());
	if (!wasOrdered) dataQuality.warnings.push("Historical bars were reordered by timestamp.");
	dataQuality.barsUsed = parsed.length;
	dataQuality.firstBarAt = parsed[0]?.startedAt.toISOString() ?? null;
	dataQuality.lastBarAt = parsed.at(-1)?.startedAt.toISOString() ?? null;

	if (parsed.length < MINIMUM_DAILY_BARS) {
		return {
			bars: parsed,
			dataQuality,
			error: {
				reason: "insufficient_data",
				message: `At least ${MINIMUM_DAILY_BARS} completed daily bars are required.`,
			},
		};
	}
	const lastBarTime = parsed.at(-1)!.startedAt.getTime();
	if (completedThrough - lastBarTime > MAXIMUM_STALENESS_MS) {
		return {
			bars: parsed,
			dataQuality,
			error: {
				reason: "stale_data",
				message: "The latest completed daily bar is stale.",
			},
		};
	}
	return { bars: parsed, dataQuality };
}

function relativeStrength(
	instrumentBars: readonly NumericBar[],
	benchmarkData: MarketBars | undefined,
	period: number,
) {
	if (!benchmarkData || benchmarkData.interval !== "1d" || !benchmarkData.adjusted) {
		return null;
	}
	const lastInstrumentTime = instrumentBars.at(-1)!.startedAt.getTime();
	const benchmarkCloses = benchmarkData.bars
		.filter((bar) => bar.startedAt.getTime() <= lastInstrumentTime)
		.map(parseMarketBar)
		.filter((bar): bar is NumericBar => bar !== null)
		.sort((left, right) => left.startedAt.getTime() - right.startedAt.getTime())
		.map((bar) => bar.close);
	const instrumentReturn = percentageReturn(
		instrumentBars.map((bar) => bar.close),
		period,
	);
	const benchmarkReturn = percentageReturn(benchmarkCloses, period);
	return instrumentReturn !== null && benchmarkReturn !== null
		? instrumentReturn - benchmarkReturn
		: null;
}

function currentValue(series: readonly (number | null)[], name: string) {
	const value = series.at(-1);
	if (value === null || value === undefined || !Number.isFinite(value)) {
		throw new Error(`${name} is unavailable after data validation`);
	}
	return value;
}

function buildIndicators(
	bars: readonly NumericBar[],
	benchmarkData: MarketBars | undefined,
	precision: number,
): IndicatorSnapshot {
	const closes = bars.map((bar) => bar.close);
	const sma20 = simpleMovingAverageSeries(closes, 20);
	const sma50 = simpleMovingAverageSeries(closes, 50);
	const sma200 = simpleMovingAverageSeries(closes, 200);
	const rsi14 = relativeStrengthIndexSeries(closes, 14);
	const atr14 = averageTrueRangeSeries(bars, 14);
	const macd = macdSeries(closes);
	const latestClose = closes.at(-1)!;
	const latestSma20 = currentValue(sma20, "SMA 20");
	const latestSma50 = currentValue(sma50, "SMA 50");
	const latestAtr = currentValue(atr14, "ATR 14");
	const sma20FiveBarsAgo = sma20.at(-6);
	const sma50FiveBarsAgo = sma50.at(-6);
	const realized20 = annualizedRealizedVolatility(closes, 20)!;
	const realized60 = annualizedRealizedVolatility(closes, 60)!;
	const recentVolumeZScore = volumeZScore(bars, 20);
	const latestMacd = currentValue(macd.macd, "MACD");
	const latestMacdSignal = currentValue(macd.signal, "MACD signal");
	const latestMacdHistogram = currentValue(macd.histogram, "MACD histogram");

	return {
		close: price(latestClose, precision),
		sma20: price(latestSma20, precision),
		sma50: price(latestSma50, precision),
		sma200: price(currentValue(sma200, "SMA 200"), precision),
		sma20SlopePercent: round(
			(((latestSma20 / (sma20FiveBarsAgo as number)) - 1) * 100),
		),
		sma50SlopePercent: round(
			(((latestSma50 / (sma50FiveBarsAgo as number)) - 1) * 100),
		),
		rsi14: round(currentValue(rsi14, "RSI 14"), 1),
		macd: signedDecimal(latestMacd, precision),
		macdSignal: signedDecimal(latestMacdSignal, precision),
		macdHistogram: signedDecimal(latestMacdHistogram, precision),
		atr14: price(latestAtr, precision),
		atrPercent: round((latestAtr / latestClose) * 100),
		return5Percent: round(percentageReturn(closes, 5)!),
		return20Percent: round(percentageReturn(closes, 20)!),
		return60Percent: round(percentageReturn(closes, 60)!),
		realizedVolatility20Percent: round(realized20),
		realizedVolatility60Percent: round(realized60),
		volatilityPercentile: round(volatilityPercentile(closes, 20)!, 1),
		volumeZScore20:
			recentVolumeZScore === null ? null : round(recentVolumeZScore, 2),
		relativeStrength20Percent: nullableRound(
			relativeStrength(bars, benchmarkData, 20),
		),
		relativeStrength60Percent: nullableRound(
			relativeStrength(bars, benchmarkData, 60),
		),
	};
}

function nullableRound(value: number | null) {
	return value === null ? null : round(value);
}

function trendAssessment(indicators: IndicatorSnapshot) {
	const close = Number(indicators.close);
	const sma20 = Number(indicators.sma20);
	const sma50 = Number(indicators.sma50);
	const sma200 = Number(indicators.sma200);
	let score = 0;
	const evidence: string[] = [];
	const counterEvidence: string[] = [];
	if (close > sma200) {
		score += 1;
		evidence.push("Price is above the 200-day moving average.");
	} else {
		score -= 1;
		counterEvidence.push("Price is below the 200-day moving average.");
	}
	if (sma20 > sma50 && sma50 > sma200) {
		score += 2;
		evidence.push("The 20-, 50-, and 200-day averages are bullishly aligned.");
	} else if (sma20 < sma50 && sma50 < sma200) {
		score -= 2;
		counterEvidence.push("The 20-, 50-, and 200-day averages are bearishly aligned.");
	} else {
		counterEvidence.push("The moving averages are not fully aligned.");
	}
	if (indicators.sma20SlopePercent > 0 && indicators.sma50SlopePercent > 0) {
		score += 1;
		evidence.push("Both the 20- and 50-day averages are rising.");
	} else if (
		indicators.sma20SlopePercent < 0 &&
		indicators.sma50SlopePercent < 0
	) {
		score -= 1;
		counterEvidence.push("Both the 20- and 50-day averages are falling.");
	}
	return {
		state: stateFromScore(score),
		score,
		assessment: { state: stateFromScore(score), evidence, counterEvidence },
	};
}

function momentumAssessment(indicators: IndicatorSnapshot) {
	let score = 0;
	const evidence: string[] = [];
	const counterEvidence: string[] = [];
	if (Number(indicators.macdHistogram) > 0) {
		score += 1;
		evidence.push("MACD momentum is positive.");
	} else {
		score -= 1;
		counterEvidence.push("MACD momentum is negative.");
	}
	if (indicators.rsi14 >= 55 && indicators.rsi14 <= 70) {
		score += 1;
		evidence.push(`RSI is constructive at ${indicators.rsi14}.`);
	} else if (indicators.rsi14 >= 30 && indicators.rsi14 <= 45) {
		score -= 1;
		counterEvidence.push(`RSI is weak at ${indicators.rsi14}.`);
	} else if (indicators.rsi14 > 70) {
		counterEvidence.push(`RSI is extended at ${indicators.rsi14}.`);
	} else if (indicators.rsi14 < 30) {
		counterEvidence.push(`RSI is oversold at ${indicators.rsi14}.`);
	}
	if (indicators.return20Percent > 0) {
		score += 1;
		evidence.push("The 20-day return is positive.");
	} else {
		score -= 1;
		counterEvidence.push("The 20-day return is negative.");
	}
	if (indicators.relativeStrength20Percent !== null) {
		if (indicators.relativeStrength20Percent > 0) {
			score += 1;
			evidence.push("The instrument has outperformed its benchmark over 20 days.");
		} else {
			score -= 1;
			counterEvidence.push(
				"The instrument has underperformed its benchmark over 20 days.",
			);
		}
	}
	return {
		state: stateFromScore(score),
		score,
		assessment: { state: stateFromScore(score), evidence, counterEvidence },
	};
}

function stateFromScore(score: number): AnalysisState {
	return score >= 2 ? "bullish" : score <= -2 ? "bearish" : "mixed";
}

function buildAssessments(indicators: IndicatorSnapshot) {
	const trend = trendAssessment(indicators);
	const momentum = momentumAssessment(indicators);
	const volatilityState: VolatilityState =
		indicators.volatilityPercentile >= 80
			? "high"
			: indicators.volatilityPercentile <= 20
				? "low"
				: "normal";
	const volatility: FactorAssessment<VolatilityState> = {
		state: volatilityState,
		evidence: [
			`20-day realized volatility is ${indicators.realizedVolatility20Percent}%.`,
			`Current volatility ranks in the ${indicators.volatilityPercentile}th percentile of the available history.`,
		],
		counterEvidence:
			volatilityState === "high"
				? ["High volatility can widen stops and reduce position efficiency."]
				: [],
	};
	const volumeZ = indicators.volumeZScore20;
	const participationState: ParticipationState =
		volumeZ === null ? "unavailable" : volumeZ >= 1 ? "strong" : volumeZ <= -1 ? "weak" : "normal";
	const participation: FactorAssessment<ParticipationState> = {
		state: participationState,
		evidence:
			volumeZ === null
				? []
				: [`Latest volume is ${volumeZ} standard deviations from its 20-day baseline.`],
		counterEvidence:
			participationState === "weak"
				? ["Recent participation is below its normal range."]
				: [],
	};
	return {
		assessments: {
			trend: trend.assessment,
			momentum: momentum.assessment,
			volatility,
			participation,
		} satisfies TechnicalAnalysisAssessments,
		trendScore: trend.score,
		momentumScore: momentum.score,
	};
}

function nearestBelow(levels: readonly InternalPriceLevel[], current: number) {
	return [...levels]
		.filter((level) => level.price < current)
		.sort((left, right) => right.price - left.price)[0];
}

function nearestAbove(levels: readonly InternalPriceLevel[], current: number) {
	return [...levels]
		.filter((level) => level.price > current)
		.sort((left, right) => left.price - right.price)[0];
}

function rewardRisk(entry: number, stop: number, target: number, direction: "long" | "short") {
	const risk = direction === "long" ? entry - stop : stop - entry;
	const reward = direction === "long" ? target - entry : entry - target;
	return risk > 0 ? reward / risk : -1;
}

function buildLongPlan(
	bars: readonly NumericBar[],
	structure: DerivedMarketStructure,
	atr: number,
	precision: number,
) {
	const current = bars.at(-1)!.close;
	const previous = bars.at(-2)!.close;
	const brokenResistance = [...structure.pivotHighs]
		.filter(
			(level) =>
				previous <= level.price &&
				current > level.price &&
				current <= level.price + atr * 0.5,
		)
		.sort((left, right) => right.price - left.price)[0];
	const support = nearestBelow(structure.pivotLows, current);
	const nearbySupport = support && current - support.price <= atr * 1.25 ? support : undefined;
	const upcomingResistance = nearestAbove(structure.pivotHighs, current);

	let entryLow: number;
	let entryHigh: number;
	let entryType: "pullback" | "breakout";
	let trigger: string;
	let status: "watching" | "active";
	let structuralStopAnchor: InternalPriceLevel | undefined;
	if (brokenResistance) {
		entryType = "breakout";
		entryLow = brokenResistance.price + atr * 0.1;
		entryHigh = brokenResistance.price + atr * 0.4;
		trigger = `A daily close above ${price(brokenResistance.price, precision)} confirms the breakout.`;
		status = current >= entryLow && current <= entryHigh ? "active" : "watching";
		structuralStopAnchor = support ?? brokenResistance;
	} else if (nearbySupport) {
		entryType = "pullback";
		entryLow = nearbySupport.price;
		entryHigh = nearbySupport.price + atr * 0.5;
		trigger = `Bullish stabilization is required near ${price(nearbySupport.price, precision)} support.`;
		status = current >= entryLow && current <= entryHigh ? "active" : "watching";
		structuralStopAnchor = nearbySupport;
	} else {
		const watchedResistance = nearestAbove(structure.pivotHighs, current);
		if (!watchedResistance || watchedResistance.price - current > atr * 2) return null;
		entryType = "breakout";
		entryLow = watchedResistance.price + atr * 0.1;
		entryHigh = watchedResistance.price + atr * 0.4;
		trigger = `A daily close above ${price(watchedResistance.price, precision)} is required.`;
		status = "watching";
		structuralStopAnchor = support ?? watchedResistance;
	}

	const entryMid = (entryLow + entryHigh) / 2;
	const stop = Math.min(structuralStopAnchor.price - atr * 0.25, entryMid - atr);
	if (!(stop > 0 && stop < entryMid)) return null;
	const risk = entryMid - stop;
	const structuralTarget = upcomingResistance?.price;
	const target1 =
		structuralTarget && structuralTarget > entryMid + risk
			? structuralTarget
			: entryMid + risk * 1.5;
	const target2 = Math.max(entryMid + risk * 2, target1 + risk * 0.5);
	const rr1 = rewardRisk(entryMid, stop, target1, "long");
	const rr2 = rewardRisk(entryMid, stop, target2, "long");
	if (rr2 < MINIMUM_REWARD_RISK) return null;
	return {
		direction: "long" as const,
		status,
		entry: {
			type: entryType,
			low: price(entryLow, precision),
			high: price(entryHigh, precision),
			trigger,
		},
		stopLoss: {
			price: price(stop, precision),
			reason: "Below the structural invalidation level with an ATR volatility buffer.",
		},
		targets: [
			{
				price: price(target1, precision),
				rewardRisk: round(rr1, 2),
				reason: structuralTarget === target1 ? "Next structural resistance." : "1.5R projection.",
			},
			{
				price: price(target2, precision),
				rewardRisk: round(rr2, 2),
				reason: "Extended risk-multiple objective.",
			},
		],
		riskReward: round(rr2, 2),
		invalidation: `A daily close below ${price(stop, precision)} invalidates the long setup.`,
		expiresAfterCompletedBars: SETUP_EXPIRATION_BARS,
		expiresAt: null,
	} satisfies TradePlan;
}

function buildShortPlan(
	bars: readonly NumericBar[],
	structure: DerivedMarketStructure,
	atr: number,
	precision: number,
) {
	const current = bars.at(-1)!.close;
	const previous = bars.at(-2)!.close;
	const brokenSupport = [...structure.pivotLows]
		.filter(
			(level) =>
				previous >= level.price &&
				current < level.price &&
				current >= level.price - atr * 0.5,
		)
		.sort((left, right) => left.price - right.price)[0];
	const resistance = nearestAbove(structure.pivotHighs, current);
	const nearbyResistance =
		resistance && resistance.price - current <= atr * 1.25 ? resistance : undefined;
	const upcomingSupport = nearestBelow(structure.pivotLows, current);

	let entryLow: number;
	let entryHigh: number;
	let entryType: "pullback" | "breakdown";
	let trigger: string;
	let status: "watching" | "active";
	let structuralStopAnchor: InternalPriceLevel | undefined;
	if (brokenSupport) {
		entryType = "breakdown";
		entryLow = brokenSupport.price - atr * 0.4;
		entryHigh = brokenSupport.price - atr * 0.1;
		trigger = `A daily close below ${price(brokenSupport.price, precision)} confirms the breakdown.`;
		status = current >= entryLow && current <= entryHigh ? "active" : "watching";
		structuralStopAnchor = resistance ?? brokenSupport;
	} else if (nearbyResistance) {
		entryType = "pullback";
		entryLow = nearbyResistance.price - atr * 0.5;
		entryHigh = nearbyResistance.price;
		trigger = `Bearish rejection is required near ${price(nearbyResistance.price, precision)} resistance.`;
		status = current >= entryLow && current <= entryHigh ? "active" : "watching";
		structuralStopAnchor = nearbyResistance;
	} else {
		const watchedSupport = nearestBelow(structure.pivotLows, current);
		if (!watchedSupport || current - watchedSupport.price > atr * 2) return null;
		entryLow = watchedSupport.price - atr * 0.4;
		entryHigh = watchedSupport.price - atr * 0.1;
		entryType = "breakdown";
		trigger = `A daily close below ${price(watchedSupport.price, precision)} is required.`;
		status = "watching";
		structuralStopAnchor = resistance ?? watchedSupport;
	}

	const entryMid = (entryLow + entryHigh) / 2;
	const stop = Math.max(structuralStopAnchor.price + atr * 0.25, entryMid + atr);
	const risk = stop - entryMid;
	if (!(risk > 0 && entryMid > 0)) return null;
	const structuralTarget = upcomingSupport?.price;
	const target1 =
		structuralTarget && structuralTarget < entryMid - risk
			? structuralTarget
			: entryMid - risk * 1.5;
	const target2 = Math.min(entryMid - risk * 2, target1 - risk * 0.5);
	if (target2 <= 0) return null;
	const rr1 = rewardRisk(entryMid, stop, target1, "short");
	const rr2 = rewardRisk(entryMid, stop, target2, "short");
	if (rr2 < MINIMUM_REWARD_RISK) return null;
	return {
		direction: "short" as const,
		status,
		entry: {
			type: entryType,
			low: price(entryLow, precision),
			high: price(entryHigh, precision),
			trigger,
		},
		stopLoss: {
			price: price(stop, precision),
			reason: "Above the structural invalidation level with an ATR volatility buffer.",
		},
		targets: [
			{
				price: price(target1, precision),
				rewardRisk: round(rr1, 2),
				reason: structuralTarget === target1 ? "Next structural support." : "1.5R projection.",
			},
			{
				price: price(target2, precision),
				rewardRisk: round(rr2, 2),
				reason: "Extended risk-multiple objective.",
			},
		],
		riskReward: round(rr2, 2),
		invalidation: `A daily close above ${price(stop, precision)} invalidates the short setup.`,
		expiresAfterCompletedBars: SETUP_EXPIRATION_BARS,
		expiresAt: null,
	} satisfies TradePlan;
}

function evidenceStrength(
	trendScore: number,
	momentumScore: number,
	assessments: TechnicalAnalysisAssessments,
): EvidenceStrength {
	const agreement = Math.abs(trendScore) + Math.abs(momentumScore);
	const aligned = Math.sign(trendScore) === Math.sign(momentumScore);
	if (aligned && agreement >= 6 && assessments.volatility.state !== "high") return "strong";
	if (aligned && agreement >= 4) return "moderate";
	return "weak";
}

function buildSignal(
	assessments: TechnicalAnalysisAssessments,
	trendScore: number,
	momentumScore: number,
	tradePlan: TradePlan | null,
): AnalysisSignal {
	const strength = evidenceStrength(trendScore, momentumScore, assessments);
	if (!tradePlan) {
		return {
			action: "no_trade",
			status: "none",
			evidenceStrength: strength,
			reasons: ["No entry, invalidation, and target combination met the strategy rules."],
			counterEvidence: [
				...assessments.trend.counterEvidence,
				...assessments.momentum.counterEvidence,
			],
		};
	}
	return {
		action: tradePlan.direction === "long" ? "long_setup" : "short_setup",
		status: tradePlan.status,
		evidenceStrength: strength,
		reasons: [
			...assessments.trend.evidence,
			...assessments.momentum.evidence,
		].slice(0, 5),
		counterEvidence: [
			...assessments.trend.counterEvidence,
			...assessments.momentum.counterEvidence,
			...assessments.volatility.counterEvidence,
		].slice(0, 4),
	};
}

/**
 * Produces a pure, reproducible daily-swing analysis from completed bars.
 * The draft strategy must pass walk-forward validation before product exposure.
 */
export function analyzeDailySwing(
	input: DailySwingAnalysisInput,
): TechnicalAnalysisResult {
	if (
		Number.isNaN(input.completedThrough.getTime()) ||
		Number.isNaN(input.analyzedAt.getTime())
	) {
		throw new Error("Valid analysis and completed-session timestamps are required");
	}
	const dataQuality = initialDataQuality(input);
	if (
		input.instrument.assetClass !== "equity" ||
		(input.instrument.securityType !== "common_stock" &&
			(input.instrument.securityType !== "etf" ||
				input.instrument.etfProfile !== "standard"))
	) {
		return unavailable(
			input,
			dataQuality,
			"ineligible_instrument",
			"Daily swing analysis currently supports common stocks and ETFs explicitly classified as standard, unleveraged products only.",
		);
	}

	const prepared = prepareBars(input);
	if (prepared.error) {
		return unavailable(
			input,
			prepared.dataQuality,
			prepared.error.reason,
			prepared.error.message,
		);
	}
	if (!input.benchmarkData) {
		prepared.dataQuality.warnings.push(
			"Benchmark data were unavailable; relative-strength fields are null.",
		);
	}
	if (prepared.bars.slice(-21).some((bar) => bar.volume === undefined)) {
		prepared.dataQuality.warnings.push(
			"Recent volume data are incomplete; participation may be unavailable.",
		);
	}

	const indicators = buildIndicators(
		prepared.bars,
		input.benchmarkData,
		input.instrument.pricePrecision,
	);
	if (
		input.benchmarkData &&
		(indicators.relativeStrength20Percent === null ||
			indicators.relativeStrength60Percent === null)
	) {
		prepared.dataQuality.warnings.push(
			"Benchmark data were unusable or incomplete; some relative-strength fields are null.",
		);
	}
	const { assessments, trendScore, momentumScore } = buildAssessments(indicators);
	const structure = deriveMarketStructure(
		prepared.bars,
		Number(indicators.atr14),
		input.instrument.pricePrecision,
	);
	let tradePlan: TradePlan | null = null;
	if (assessments.trend.state === "bullish" && assessments.momentum.state !== "bearish") {
		tradePlan = buildLongPlan(
			prepared.bars,
			structure,
			Number(indicators.atr14),
			input.instrument.pricePrecision,
		);
	} else if (
		input.allowShortSetups === true &&
		assessments.trend.state === "bearish" &&
		assessments.momentum.state !== "bullish"
	) {
		tradePlan = buildShortPlan(
			prepared.bars,
			structure,
			Number(indicators.atr14),
			input.instrument.pricePrecision,
		);
	}
	const signal = buildSignal(
		assessments,
		trendScore,
		momentumScore,
		tradePlan,
	);
	return {
		...baseResult(input, prepared.dataQuality),
		status: "ready",
		indicators,
		assessments,
		marketStructure: {
			support: structure.support,
			resistance: structure.resistance,
		},
		signal,
		tradePlan,
	};
}
