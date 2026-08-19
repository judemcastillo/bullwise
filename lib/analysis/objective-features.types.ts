import type { BROAD_DEVELOPMENT_LIQUIDITY_POLICY } from "@/lib/analysis/broad-development-universe";

export const DAILY_SWING_OBJECTIVE_FEATURE_VERSION = "1.0.0";

export type DailySwingLiquidityIneligibilityReason =
	| "insufficient_observed_sessions"
	| "median_dollar_volume_below_minimum"
	| "position_fraction_above_maximum"
	| "invalid_position_plan";

export type DailySwingObjectiveFeatureValues = {
	medianDollarVolume20: number | null;
	medianDollarVolume60: number | null;
	missingOrZeroVolumeRate20: number;
	dollarVolumePercentile252: number | null;
	amihudIlliquidity20PerBillion: number | null;
	bodyToRange: number;
	upperWickToRange: number;
	lowerWickToRange: number;
	closeLocationInRange: number;
	overnightGapAtr: number;
	rangeAtr: number;
	rangeCompression20: number | null;
	directionalFollowThrough3Atr: number;
	breakoutDisplacementAtr: number | null;
	entryToNearestSupportAtr: number | null;
	entryToNearestResistanceAtr: number | null;
	nearestSupportPivotTouches: number | null;
	nearestResistancePivotTouches: number | null;
	supportZoneTouches120: number | null;
	supportZoneRejections120: number | null;
	resistanceZoneTouches120: number | null;
	resistanceZoneRejections120: number | null;
	volumePercentile252: number | null;
	relativeVolume20: number | null;
	volumeToPriceMove20: number | null;
};

export type DailySwingLiquidityEligibility = {
	eligible: boolean;
	reasons: DailySwingLiquidityIneligibilityReason[];
	observedSessions20: number;
	medianDollarVolume20: number | null;
	plannedPositionNotional: number | null;
	positionFractionOfMedianDollarVolume: number | null;
	thresholds: Pick<
		typeof BROAD_DEVELOPMENT_LIQUIDITY_POLICY,
		| "windowSessions"
		| "minimumObservedSessions"
		| "minimumMedianDollarVolume"
		| "maximumPositionFractionOfMedianDollarVolume"
	>;
};

export type DailySwingObjectiveFeatureSnapshot = {
	featureVersion: typeof DAILY_SWING_OBJECTIVE_FEATURE_VERSION;
	signalAt: string;
	features: DailySwingObjectiveFeatureValues;
	liquidity: DailySwingLiquidityEligibility;
};

export type DailySwingObjectiveFeatureRecord = {
	instrumentId: string;
	signalAt: string;
	snapshot: DailySwingObjectiveFeatureSnapshot;
};
