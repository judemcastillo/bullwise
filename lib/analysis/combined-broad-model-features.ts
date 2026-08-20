import type { DailySwingCombinedBroadEpisodeRow } from "@/lib/analysis/combined-broad-episode-dataset.types";

export const COMBINED_BROAD_CATEGORICAL_FEATURES = {
	direction: ["long", "short"],
	setupType: ["pullback", "breakout", "breakdown"],
	trendRegime: ["bullish", "mixed", "bearish"],
	volatilityRegime: ["low", "normal", "high"],
	evidenceStrength: ["weak", "moderate", "strong", "unavailable"],
	momentumRegime: ["bullish", "mixed", "bearish"],
	participationRegime: ["weak", "normal", "strong", "unavailable"],
} as const;

export const COMBINED_BROAD_NUMERIC_FEATURES = [
	"relativeStrength20Percent",
	"volumeZScore20",
	"planRiskReward",
	"sma20DistancePercent",
	"sma50DistancePercent",
	"sma200DistancePercent",
	"sma20SlopePercent",
	"sma50SlopePercent",
	"rsi14",
	"macdHistogramPercent",
	"atrPercent",
	"return5Percent",
	"return20Percent",
	"return60Percent",
	"realizedVolatility20Percent",
	"realizedVolatility60Percent",
	"volatilityPercentile",
	"relativeStrength60Percent",
	"medianDollarVolume20",
	"medianDollarVolume60",
	"missingOrZeroVolumeRate20",
	"dollarVolumePercentile252",
	"amihudIlliquidity20PerBillion",
	"bodyToRange",
	"upperWickToRange",
	"lowerWickToRange",
	"closeLocationInRange",
	"overnightGapAtr",
	"rangeAtr",
	"rangeCompression20",
	"directionalFollowThrough3Atr",
	"breakoutDisplacementAtr",
	"entryToNearestSupportAtr",
	"entryToNearestResistanceAtr",
	"nearestSupportPivotTouches",
	"nearestResistancePivotTouches",
	"supportZoneTouches120",
	"supportZoneRejections120",
	"resistanceZoneTouches120",
	"resistanceZoneRejections120",
	"volumePercentile252",
	"relativeVolume20",
	"volumeToPriceMove20",
] as const;

const NULLABLE_NUMERIC_FEATURES = new Set<string>([
	"relativeStrength20Percent",
	"volumeZScore20",
	"relativeStrength60Percent",
	"medianDollarVolume20",
	"medianDollarVolume60",
	"dollarVolumePercentile252",
	"amihudIlliquidity20PerBillion",
	"rangeCompression20",
	"breakoutDisplacementAtr",
	"entryToNearestSupportAtr",
	"entryToNearestResistanceAtr",
	"nearestSupportPivotTouches",
	"nearestResistancePivotTouches",
	"supportZoneTouches120",
	"supportZoneRejections120",
	"resistanceZoneTouches120",
	"resistanceZoneRejections120",
	"volumePercentile252",
	"relativeVolume20",
	"volumeToPriceMove20",
]);

export type CombinedBroadFeatureEncoder = {
	featureNames: string[];
	numeric: Array<{
		name: string;
		nullable: boolean;
		median: number;
		lowerClip: number;
		upperClip: number;
		mean: number;
		standardDeviation: number;
	}>;
	categorical: Array<{
		name: string;
		referenceCategory: string;
		encodedCategories: string[];
	}>;
};

function finite(value: unknown, name: string, nullable: boolean) {
	if (value === null && nullable) return null;
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new Error(`${name} must be finite${nullable ? " or null" : ""}`);
	}
	return value;
}

function median(sorted: readonly number[]) {
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[middle - 1] + sorted[middle]) / 2
		: sorted[middle];
}

function nearestRank(sorted: readonly number[], quantile: number) {
	return sorted[Math.max(0, Math.ceil(quantile * sorted.length) - 1)];
}

function clip(value: number, lower: number, upper: number) {
	return Math.min(upper, Math.max(lower, value));
}

function validateFeatureShape(row: DailySwingCombinedBroadEpisodeRow) {
	const expected = new Set([
		...COMBINED_BROAD_NUMERIC_FEATURES,
		...Object.keys(COMBINED_BROAD_CATEGORICAL_FEATURES),
	]);
	const actual = Object.keys(row.features);
	if (actual.length !== expected.size || actual.some((name) => !expected.has(name))) {
		throw new Error(`${row.rowId} must contain exactly the 50 frozen feature fields`);
	}
}

export function fitCombinedBroadFeatureEncoder(
	rows: readonly DailySwingCombinedBroadEpisodeRow[],
): CombinedBroadFeatureEncoder {
	if (rows.length === 0) throw new Error("Fit rows are required for preprocessing");
	for (const row of rows) validateFeatureShape(row);
	const numeric = COMBINED_BROAD_NUMERIC_FEATURES.map((name) => {
		const nullable = NULLABLE_NUMERIC_FEATURES.has(name);
		const observed = rows
			.flatMap((row) => {
				const value = finite(row.features[name], name, nullable);
				return value === null ? [] : [value];
			})
			.sort((left, right) => left - right);
		if (observed.length === 0) throw new Error(`${name} has no observed fit values`);
		const imputationMedian = median(observed);
		const lowerClip = nearestRank(observed, 0.01);
		const upperClip = nearestRank(observed, 0.99);
		const transformed = rows.map((row) => {
			const value = finite(row.features[name], name, nullable);
			return clip(value ?? imputationMedian, lowerClip, upperClip);
		});
		const mean = transformed.reduce((total, value) => total + value, 0) / transformed.length;
		const variance =
			transformed.reduce((total, value) => total + (value - mean) ** 2, 0) /
			transformed.length;
		return {
			name,
			nullable,
			median: imputationMedian,
			lowerClip,
			upperClip,
			mean,
			standardDeviation: Math.sqrt(variance) || 1,
		};
	});
	const categorical = Object.entries(COMBINED_BROAD_CATEGORICAL_FEATURES).map(
		([name, categories]) => ({
			name,
			referenceCategory: categories[0],
			encodedCategories: [...categories.slice(1)],
		}),
	);
	return {
		featureNames: [
			...numeric.flatMap((feature) => [
				`numeric:${feature.name}`,
				...(feature.nullable ? [`missing:${feature.name}`] : []),
			]),
			...categorical.flatMap((feature) =>
				feature.encodedCategories.map(
					(category) => `category:${feature.name}=${category}`,
				),
			),
		],
		numeric,
		categorical,
	};
}

export function encodeCombinedBroadFeatureRows(
	rows: readonly DailySwingCombinedBroadEpisodeRow[],
	encoder: CombinedBroadFeatureEncoder,
) {
	return rows.map((row) => {
		validateFeatureShape(row);
		const values: number[] = [];
		for (const feature of encoder.numeric) {
			const raw = finite(
				row.features[feature.name as keyof typeof row.features],
				feature.name,
				feature.nullable,
			);
			const transformed = clip(
				raw ?? feature.median,
				feature.lowerClip,
				feature.upperClip,
			);
			values.push(
				(transformed - feature.mean) / feature.standardDeviation,
			);
			if (feature.nullable) values.push(raw === null ? 1 : 0);
		}
		for (const feature of encoder.categorical) {
			const value = row.features[feature.name as keyof typeof row.features];
			const allowed = [feature.referenceCategory, ...feature.encodedCategories];
			if (typeof value !== "string" || !allowed.includes(value)) {
				throw new Error(`${feature.name} has an unsupported category`);
			}
			for (const category of feature.encodedCategories) {
				values.push(value === category ? 1 : 0);
			}
		}
		return values;
	});
}
