import type { TechnicalLevel } from "@/lib/analysis/technical-analysis.types";
import type { NumericBar } from "@/lib/analysis/indicators";
import { normalizeMarketNumber } from "@/lib/market-data/normalization";

type LevelSource = TechnicalLevel["source"];

export type InternalPriceLevel = {
	price: number;
	touches: number;
	source: LevelSource;
};

export type DerivedMarketStructure = {
	support: TechnicalLevel[];
	resistance: TechnicalLevel[];
	pivotHighs: InternalPriceLevel[];
	pivotLows: InternalPriceLevel[];
};

function findPivots(
	bars: readonly NumericBar[],
	field: "high" | "low",
	window = 3,
) {
	const values: number[] = [];
	const start = Math.max(window, bars.length - 120);
	for (let index = start; index < bars.length - window; index += 1) {
		const value = bars[index][field];
		let isPivot = true;
		for (let offset = 1; offset <= window; offset += 1) {
			const left = bars[index - offset][field];
			const right = bars[index + offset][field];
			if (
				(field === "high" && (value <= left || value < right)) ||
				(field === "low" && (value >= left || value > right))
			) {
				isPivot = false;
				break;
			}
		}
		if (isPivot) values.push(value);
	}
	return values;
}

function clusterLevels(
	prices: readonly number[],
	tolerance: number,
	source: LevelSource,
) {
	const sorted = [...prices].sort((left, right) => left - right);
	const clusters: InternalPriceLevel[] = [];
	for (const price of sorted) {
		const cluster = clusters.find(
			(candidate) => Math.abs(candidate.price - price) <= tolerance,
		);
		if (!cluster) {
			clusters.push({ price, touches: 1, source });
			continue;
		}
		cluster.price =
			(cluster.price * cluster.touches + price) / (cluster.touches + 1);
		cluster.touches += 1;
	}
	return clusters;
}

function addRangeBoundary(
	levels: InternalPriceLevel[],
	price: number,
	tolerance: number,
) {
	const existing = levels.find(
		(level) => Math.abs(level.price - price) <= tolerance,
	);
	if (existing) {
		existing.touches += 1;
		return;
	}
	levels.push({ price, touches: 1, source: "range_boundary" });
}

function toPublicLevel(
	level: InternalPriceLevel,
	kind: TechnicalLevel["kind"],
	close: number,
	precision: number,
): TechnicalLevel {
	return {
		kind,
		price: normalizeMarketNumber(level.price, precision) ?? String(level.price),
		distancePercent: round(Math.abs((level.price / close - 1) * 100), 2),
		touches: level.touches,
		source: level.source,
	};
}

function round(value: number, precision: number) {
	const multiplier = 10 ** precision;
	return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

export function deriveMarketStructure(
	bars: readonly NumericBar[],
	atr: number,
	pricePrecision: number,
): DerivedMarketStructure {
	const close = bars.at(-1)?.close;
	if (close === undefined) {
		return { support: [], resistance: [], pivotHighs: [], pivotLows: [] };
	}
	const tolerance = Math.max(atr * 0.5, close * 0.0025);
	const pivotHighs = clusterLevels(
		findPivots(bars, "high"),
		tolerance,
		"swing_cluster",
	);
	const pivotLows = clusterLevels(
		findPivots(bars, "low"),
		tolerance,
		"swing_cluster",
	);
	const recentBars = bars.slice(-20);
	addRangeBoundary(
		pivotHighs,
		Math.max(...recentBars.map((bar) => bar.high)),
		tolerance,
	);
	addRangeBoundary(
		pivotLows,
		Math.min(...recentBars.map((bar) => bar.low)),
		tolerance,
	);

	const allLevels = [...pivotHighs, ...pivotLows];
	const support = allLevels
		.filter((level) => level.price < close)
		.sort((left, right) => right.price - left.price)
		.filter(
			(level, index, values) =>
				index === 0 || Math.abs(values[index - 1].price - level.price) > tolerance,
		)
		.slice(0, 3)
		.map((level) => toPublicLevel(level, "support", close, pricePrecision));
	const resistance = allLevels
		.filter((level) => level.price > close)
		.sort((left, right) => left.price - right.price)
		.filter(
			(level, index, values) =>
				index === 0 || Math.abs(values[index - 1].price - level.price) > tolerance,
		)
		.slice(0, 3)
		.map((level) => toPublicLevel(level, "resistance", close, pricePrecision));

	return {
		support,
		resistance,
		pivotHighs: pivotHighs.sort((left, right) => left.price - right.price),
		pivotLows: pivotLows.sort((left, right) => left.price - right.price),
	};
}
