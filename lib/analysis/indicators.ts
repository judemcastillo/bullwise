import type { MarketBar } from "@/lib/market-data/types";

export type NumericBar = {
	startedAt: Date;
	open: number;
	high: number;
	low: number;
	close: number;
	volume?: number;
};

export function simpleMovingAverage(values: readonly number[], period: number) {
	if (period <= 0 || values.length < period) return null;
	let total = 0;
	for (let index = values.length - period; index < values.length; index += 1) {
		total += values[index];
	}
	return total / period;
}

export function simpleMovingAverageSeries(
	values: readonly number[],
	period: number,
) {
	const result: Array<number | null> = Array(values.length).fill(null);
	if (period <= 0 || values.length < period) return result;

	let total = 0;
	for (let index = 0; index < values.length; index += 1) {
		total += values[index];
		if (index >= period) total -= values[index - period];
		if (index >= period - 1) result[index] = total / period;
	}
	return result;
}

export function exponentialMovingAverageSeries(
	values: readonly number[],
	period: number,
) {
	const result: Array<number | null> = Array(values.length).fill(null);
	if (period <= 0 || values.length < period) return result;

	const seed = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
	result[period - 1] = seed;
	const multiplier = 2 / (period + 1);
	let previous = seed;
	for (let index = period; index < values.length; index += 1) {
		previous = (values[index] - previous) * multiplier + previous;
		result[index] = previous;
	}
	return result;
}

export function relativeStrengthIndexSeries(
	values: readonly number[],
	period = 14,
) {
	const result: Array<number | null> = Array(values.length).fill(null);
	if (period <= 0 || values.length <= period) return result;

	let gains = 0;
	let losses = 0;
	for (let index = 1; index <= period; index += 1) {
		const change = values[index] - values[index - 1];
		if (change >= 0) gains += change;
		else losses -= change;
	}

	let averageGain = gains / period;
	let averageLoss = losses / period;
	result[period] = rsiFromAverages(averageGain, averageLoss);
	for (let index = period + 1; index < values.length; index += 1) {
		const change = values[index] - values[index - 1];
		const gain = Math.max(change, 0);
		const loss = Math.max(-change, 0);
		averageGain = (averageGain * (period - 1) + gain) / period;
		averageLoss = (averageLoss * (period - 1) + loss) / period;
		result[index] = rsiFromAverages(averageGain, averageLoss);
	}
	return result;
}

function rsiFromAverages(averageGain: number, averageLoss: number) {
	if (averageLoss === 0) return averageGain === 0 ? 50 : 100;
	if (averageGain === 0) return 0;
	const relativeStrength = averageGain / averageLoss;
	return 100 - 100 / (1 + relativeStrength);
}

export function averageTrueRangeSeries(
	bars: readonly NumericBar[],
	period = 14,
) {
	const result: Array<number | null> = Array(bars.length).fill(null);
	if (period <= 0 || bars.length < period) return result;

	const trueRanges = bars.map((bar, index) => {
		if (index === 0) return bar.high - bar.low;
		const previousClose = bars[index - 1].close;
		return Math.max(
			bar.high - bar.low,
			Math.abs(bar.high - previousClose),
			Math.abs(bar.low - previousClose),
		);
	});

	let atr = trueRanges
		.slice(0, period)
		.reduce((sum, value) => sum + value, 0) / period;
	result[period - 1] = atr;
	for (let index = period; index < bars.length; index += 1) {
		atr = (atr * (period - 1) + trueRanges[index]) / period;
		result[index] = atr;
	}
	return result;
}

export function macdSeries(
	values: readonly number[],
	fastPeriod = 12,
	slowPeriod = 26,
	signalPeriod = 9,
) {
	const fast = exponentialMovingAverageSeries(values, fastPeriod);
	const slow = exponentialMovingAverageSeries(values, slowPeriod);
	const macd: Array<number | null> = values.map((_, index) =>
		fast[index] !== null && slow[index] !== null
			? (fast[index] as number) - (slow[index] as number)
			: null,
	);
	const compactMacd = macd.filter((value): value is number => value !== null);
	const compactSignal = exponentialMovingAverageSeries(compactMacd, signalPeriod);
	const signal: Array<number | null> = Array(values.length).fill(null);
	const firstMacdIndex = macd.findIndex((value) => value !== null);
	for (let index = 0; index < compactSignal.length; index += 1) {
		signal[firstMacdIndex + index] = compactSignal[index];
	}
	const histogram = macd.map((value, index) =>
		value !== null && signal[index] !== null
			? value - (signal[index] as number)
			: null,
	);
	return { macd, signal, histogram };
}

export function percentageReturn(values: readonly number[], periods: number) {
	if (periods <= 0 || values.length <= periods) return null;
	const previous = values[values.length - 1 - periods];
	const current = values[values.length - 1];
	return previous > 0 ? ((current / previous) - 1) * 100 : null;
}

export function annualizedRealizedVolatility(
	values: readonly number[],
	period: number,
) {
	if (period <= 1 || values.length <= period) return null;
	const returns: number[] = [];
	for (let index = values.length - period; index < values.length; index += 1) {
		returns.push(Math.log(values[index] / values[index - 1]));
	}
	const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
	const variance = returns.reduce(
		(sum, value) => sum + (value - mean) ** 2,
		0,
	) / (returns.length - 1);
	return Math.sqrt(Math.max(variance, 0)) * Math.sqrt(252) * 100;
}

export function volatilityPercentile(values: readonly number[], period = 20) {
	if (values.length < period + 2) return null;
	const samples: number[] = [];
	for (let end = period; end < values.length; end += 1) {
		const sample = annualizedRealizedVolatility(values.slice(0, end + 1), period);
		if (sample !== null) samples.push(sample);
	}
	const recent = samples.at(-1);
	if (recent === undefined || samples.length === 0) return null;
	const lessOrEqual = samples.filter((sample) => sample <= recent).length;
	return (lessOrEqual / samples.length) * 100;
}

export function volumeZScore(bars: readonly NumericBar[], period = 20) {
	if (bars.length <= period) return null;
	const current = bars.at(-1)?.volume;
	const history = bars.slice(-period - 1, -1).map((bar) => bar.volume);
	if (current === undefined || history.some((volume) => volume === undefined)) {
		return null;
	}
	const numericHistory = history as number[];
	const mean = numericHistory.reduce((sum, value) => sum + value, 0) / period;
	const variance = numericHistory.reduce(
		(sum, value) => sum + (value - mean) ** 2,
		0,
	) / period;
	const standardDeviation = Math.sqrt(variance);
	return standardDeviation === 0 ? 0 : (current - mean) / standardDeviation;
}

export function parseMarketBar(bar: MarketBar): NumericBar | null {
	const open = Number(bar.open);
	const high = Number(bar.high);
	const low = Number(bar.low);
	const close = Number(bar.close);
	const volume = bar.volume === undefined ? undefined : Number(bar.volume);
	if (
		Number.isNaN(bar.startedAt.getTime()) ||
		![open, high, low, close].every(
			(value) => Number.isFinite(value) && value > 0,
		) ||
		high < Math.max(open, low, close) ||
		low > Math.min(open, high, close) ||
		(volume !== undefined && (!Number.isFinite(volume) || volume < 0))
	) {
		return null;
	}
	return {
		startedAt: bar.startedAt,
		open,
		high,
		low,
		close,
		...(volume !== undefined ? { volume } : {}),
	};
}
