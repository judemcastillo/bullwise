import { BROAD_DEVELOPMENT_LIQUIDITY_POLICY } from "@/lib/analysis/broad-development-universe";
import { parseMarketBar, type NumericBar } from "@/lib/analysis/indicators";
import {
	DAILY_SWING_OBJECTIVE_FEATURE_VERSION,
	type DailySwingLiquidityIneligibilityReason,
	type DailySwingObjectiveFeatureSnapshot,
} from "@/lib/analysis/objective-features.types";
import type {
	TechnicalAnalysisReadyResult,
	TechnicalLevel,
} from "@/lib/analysis/technical-analysis.types";
import type { MarketBar } from "@/lib/market-data/types";

const AMIHUD_SCALE = 1_000_000_000;
const STRUCTURE_LOOKBACK = 120;
const PRICE_MOVE_FLOOR_ATR = 0.1;

export type BuildDailySwingObjectiveFeaturesInput = {
	bars: readonly MarketBar[];
	result: TechnicalAnalysisReadyResult;
	equity: number;
	riskPerTradePercent: number;
};

function round(value: number, precision = 8) {
	const multiplier = 10 ** precision;
	return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function median(values: readonly number[]) {
	if (values.length === 0) return null;
	const sorted = [...values].sort((left, right) => left - right);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[middle - 1] + sorted[middle]) / 2
		: sorted[middle];
}

function percentileRank(values: readonly number[], current: number) {
	if (values.length === 0) return null;
	return values.filter((value) => value <= current).length / values.length;
}

function parseBars(bars: readonly MarketBar[]) {
	const parsed: NumericBar[] = [];
	let previous = Number.NEGATIVE_INFINITY;
	for (const bar of bars) {
		const numeric = parseMarketBar(bar);
		if (!numeric) throw new Error("objective feature bars contain an invalid market bar");
		const timestamp = numeric.startedAt.getTime();
		if (timestamp <= previous) {
			throw new Error("objective feature bars must be unique and chronological");
		}
		previous = timestamp;
		parsed.push(numeric);
	}
	return parsed;
}

function positiveDollarVolumes(bars: readonly NumericBar[]) {
	return bars.flatMap((bar) =>
		bar.close > 0 && bar.volume !== undefined && bar.volume > 0
			? [bar.close * bar.volume]
			: [],
	);
}

function positiveVolumes(bars: readonly NumericBar[]) {
	return bars.flatMap((bar) =>
		bar.volume !== undefined && bar.volume > 0 ? [bar.volume] : [],
	);
}

function nearestLevel(levels: readonly TechnicalLevel[]) {
	const level = levels[0];
	if (!level) return null;
	const price = Number(level.price);
	return Number.isFinite(price) && price > 0 ? { ...level, numericPrice: price } : null;
}

function zoneCounts(
	bars: readonly NumericBar[],
	levelPrice: number | null,
	tolerance: number,
	kind: "support" | "resistance",
) {
	if (levelPrice === null) return { touches: null, rejections: null };
	let touches = 0;
	let rejections = 0;
	for (const bar of bars.slice(-STRUCTURE_LOOKBACK)) {
		const touched =
			bar.low <= levelPrice + tolerance && bar.high >= levelPrice - tolerance;
		if (!touched) continue;
		touches += 1;
		const range = bar.high - bar.low;
		const closeLocation = range > 0 ? (bar.close - bar.low) / range : 0.5;
		if (
			(kind === "support" && bar.close > levelPrice && closeLocation >= 0.6) ||
			(kind === "resistance" && bar.close < levelPrice && closeLocation <= 0.4)
		) {
			rejections += 1;
		}
	}
	return { touches, rejections };
}

function requirePositive(value: number, label: string) {
	if (!Number.isFinite(value) || value <= 0) {
		throw new Error(`${label} must be a positive finite number`);
	}
	return value;
}

/** Builds one completed-bar-only feature snapshot at the final supplied bar. */
export function buildDailySwingObjectiveFeatures(
	input: BuildDailySwingObjectiveFeaturesInput,
): DailySwingObjectiveFeatureSnapshot {
	if (!input.result.tradePlan) {
		throw new Error("Objective setup features require a trade plan");
	}
	const bars = parseBars(input.bars);
	if (bars.length < 60) {
		throw new Error("Objective setup features require at least 60 completed bars");
	}
	const latest = bars.at(-1)!;
	const previous = bars.at(-2)!;
	if (input.result.dataQuality.lastBarAt !== latest.startedAt.toISOString()) {
		throw new Error("The analysis result must end at the final objective feature bar");
	}
	const atr = requirePositive(Number(input.result.indicators.atr14), "atr14");
	const equity = requirePositive(input.equity, "equity");
	const riskPerTradePercent = requirePositive(
		input.riskPerTradePercent,
		"riskPerTradePercent",
	);
	if (riskPerTradePercent > 100) {
		throw new Error("riskPerTradePercent must be at most 100");
	}

	const plan = input.result.tradePlan;
	const entryLow = requirePositive(Number(plan.entry.low), "entry.low");
	const entryHigh = requirePositive(Number(plan.entry.high), "entry.high");
	const stop = requirePositive(Number(plan.stopLoss.price), "stopLoss.price");
	if (entryLow > entryHigh) throw new Error("entry.low cannot exceed entry.high");
	const entryMid = (entryLow + entryHigh) / 2;
	const riskPerUnit = Math.abs(entryMid - stop);
	const plannedPositionNotional =
		riskPerUnit > 0
			? ((equity * riskPerTradePercent) / 100 / riskPerUnit) * entryMid
			: null;

	const liquidity20 = bars.slice(-BROAD_DEVELOPMENT_LIQUIDITY_POLICY.windowSessions);
	const dollarVolumes20 = positiveDollarVolumes(liquidity20);
	const medianDollarVolume20 = median(dollarVolumes20);
	const medianDollarVolume60 = median(positiveDollarVolumes(bars.slice(-60)));
	const observedSessions20 = dollarVolumes20.length;
	const positionFractionOfMedianDollarVolume =
		plannedPositionNotional !== null && medianDollarVolume20 !== null
			? plannedPositionNotional / medianDollarVolume20
			: null;
	const reasons: DailySwingLiquidityIneligibilityReason[] = [];
	if (
		observedSessions20 <
		BROAD_DEVELOPMENT_LIQUIDITY_POLICY.minimumObservedSessions
	) {
		reasons.push("insufficient_observed_sessions");
	}
	if (
		medianDollarVolume20 === null ||
		medianDollarVolume20 <
			BROAD_DEVELOPMENT_LIQUIDITY_POLICY.minimumMedianDollarVolume
	) {
		reasons.push("median_dollar_volume_below_minimum");
	}
	if (plannedPositionNotional === null) reasons.push("invalid_position_plan");
	if (
		positionFractionOfMedianDollarVolume === null ||
		positionFractionOfMedianDollarVolume >
			BROAD_DEVELOPMENT_LIQUIDITY_POLICY.maximumPositionFractionOfMedianDollarVolume
	) {
		reasons.push("position_fraction_above_maximum");
	}

	const range = latest.high - latest.low;
	const body = Math.abs(latest.close - latest.open);
	const upperWick = latest.high - Math.max(latest.open, latest.close);
	const lowerWick = Math.min(latest.open, latest.close) - latest.low;
	const closeLocation = range > 0 ? (latest.close - latest.low) / range : 0.5;
	const priorRanges = bars.slice(-21, -1).map((bar) => bar.high - bar.low);
	const medianPriorRange = median(priorRanges);
	const followThroughSign = plan.direction === "long" ? 1 : -1;
	const closeThreeBarsAgo = bars.at(-4)!.close;
	const nearestSupport = nearestLevel(input.result.marketStructure.support);
	const nearestResistance = nearestLevel(input.result.marketStructure.resistance);
	const tolerance = Math.max(atr * 0.5, latest.close * 0.0025);
	const supportCounts = zoneCounts(
		bars,
		nearestSupport?.numericPrice ?? null,
		tolerance,
		"support",
	);
	const resistanceCounts = zoneCounts(
		bars,
		nearestResistance?.numericPrice ?? null,
		tolerance,
		"resistance",
	);

	const trailing252 = bars.slice(-252);
	const dollarVolumes252 = positiveDollarVolumes(trailing252);
	const currentDollarVolume =
		latest.volume !== undefined && latest.volume > 0
			? latest.close * latest.volume
			: null;
	const volumes252 = positiveVolumes(trailing252);
	const currentVolume =
		latest.volume !== undefined && latest.volume > 0 ? latest.volume : null;
	const priorVolumes20 = positiveVolumes(bars.slice(-21, -1));
	const medianPriorVolume20 = median(priorVolumes20);
	const relativeVolume20 =
		currentVolume !== null && medianPriorVolume20 !== null
			? currentVolume / medianPriorVolume20
			: null;
	const priceMoveAtr = Math.abs(latest.close - previous.close) / atr;
	const amihudSamples = liquidity20.flatMap((bar, localIndex) => {
		const globalIndex = bars.length - liquidity20.length + localIndex;
		const prior = bars[globalIndex - 1];
		if (!prior || bar.volume === undefined || bar.volume <= 0) return [];
		const dollarVolume = bar.close * bar.volume;
		return [Math.abs(bar.close / prior.close - 1) / dollarVolume];
	});
	const amihudMean =
		amihudSamples.length === 0
			? null
			: amihudSamples.reduce((sum, value) => sum + value, 0) /
				amihudSamples.length;
	const breakoutDisplacementAtr =
		plan.entry.type === "breakout"
			? (latest.close - entryLow) / atr
			: plan.entry.type === "breakdown"
				? (entryHigh - latest.close) / atr
				: null;

	return {
		featureVersion: DAILY_SWING_OBJECTIVE_FEATURE_VERSION,
		signalAt: latest.startedAt.toISOString(),
		features: {
			medianDollarVolume20:
				medianDollarVolume20 === null ? null : round(medianDollarVolume20),
			medianDollarVolume60:
				medianDollarVolume60 === null ? null : round(medianDollarVolume60),
			missingOrZeroVolumeRate20: round(
				1 - observedSessions20 / BROAD_DEVELOPMENT_LIQUIDITY_POLICY.windowSessions,
			),
			dollarVolumePercentile252:
				currentDollarVolume === null
					? null
					: round(percentileRank(dollarVolumes252, currentDollarVolume)!),
			amihudIlliquidity20PerBillion:
				amihudMean === null ? null : round(amihudMean * AMIHUD_SCALE),
			bodyToRange: round(range > 0 ? body / range : 0),
			upperWickToRange: round(range > 0 ? upperWick / range : 0),
			lowerWickToRange: round(range > 0 ? lowerWick / range : 0),
			closeLocationInRange: round(closeLocation),
			overnightGapAtr: round((latest.open - previous.close) / atr),
			rangeAtr: round(range / atr),
			rangeCompression20:
				medianPriorRange === null || medianPriorRange <= 0
					? null
					: round(range / medianPriorRange),
			directionalFollowThrough3Atr: round(
				(followThroughSign * (latest.close - closeThreeBarsAgo)) / atr,
			),
			breakoutDisplacementAtr:
				breakoutDisplacementAtr === null ? null : round(breakoutDisplacementAtr),
			entryToNearestSupportAtr:
				nearestSupport === null
					? null
					: round((entryMid - nearestSupport.numericPrice) / atr),
			entryToNearestResistanceAtr:
				nearestResistance === null
					? null
					: round((nearestResistance.numericPrice - entryMid) / atr),
			nearestSupportPivotTouches: nearestSupport?.touches ?? null,
			nearestResistancePivotTouches: nearestResistance?.touches ?? null,
			supportZoneTouches120: supportCounts.touches,
			supportZoneRejections120: supportCounts.rejections,
			resistanceZoneTouches120: resistanceCounts.touches,
			resistanceZoneRejections120: resistanceCounts.rejections,
			volumePercentile252:
				currentVolume === null
					? null
					: round(percentileRank(volumes252, currentVolume)!),
			relativeVolume20:
				relativeVolume20 === null ? null : round(relativeVolume20),
			volumeToPriceMove20:
				relativeVolume20 === null
					? null
					: round(relativeVolume20 / Math.max(priceMoveAtr, PRICE_MOVE_FLOOR_ATR)),
		},
		liquidity: {
			eligible: reasons.length === 0,
			reasons,
			observedSessions20,
			medianDollarVolume20:
				medianDollarVolume20 === null ? null : round(medianDollarVolume20),
			plannedPositionNotional:
				plannedPositionNotional === null ? null : round(plannedPositionNotional),
			positionFractionOfMedianDollarVolume:
				positionFractionOfMedianDollarVolume === null
					? null
					: round(positionFractionOfMedianDollarVolume),
			thresholds: {
				windowSessions: BROAD_DEVELOPMENT_LIQUIDITY_POLICY.windowSessions,
				minimumObservedSessions:
					BROAD_DEVELOPMENT_LIQUIDITY_POLICY.minimumObservedSessions,
				minimumMedianDollarVolume:
					BROAD_DEVELOPMENT_LIQUIDITY_POLICY.minimumMedianDollarVolume,
				maximumPositionFractionOfMedianDollarVolume:
					BROAD_DEVELOPMENT_LIQUIDITY_POLICY.maximumPositionFractionOfMedianDollarVolume,
			},
		},
	};
}
