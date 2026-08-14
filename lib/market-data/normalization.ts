import type {
	MarketBar,
	MarketBars,
	MarketQuote,
	MarketState,
} from "@/lib/market-data/types";

const MAX_PRICE_PRECISION = 18;

export function normalizeMarketNumber(
	value: unknown,
	precision: number | undefined,
	options: { allowZero?: boolean } = {},
) {
	const numeric = typeof value === "number" ? value : Number(value);
	const minimum = options.allowZero ? 0 : Number.MIN_VALUE;
	if (!Number.isFinite(numeric) || numeric < minimum) return null;

	if (precision === undefined) return String(numeric);
	const safePrecision = Math.max(
		0,
		Math.min(Math.trunc(precision), MAX_PRICE_PRECISION),
	);
	const fixed = numeric.toFixed(safePrecision);
	const normalized = safePrecision === 0
		? fixed
		: fixed.replace(/\.?0+$/, "");
	return !options.allowZero && Number(normalized) <= 0 ? null : normalized;
}

export function marketStateForCalendar(calendarId: string | undefined): MarketState {
	return calendarId?.toLowerCase() === "crypto-24x7" ? "open" : "unknown";
}

function invertPositiveDecimal(value: string, precision: number | undefined) {
	const numeric = Number(value);
	if (!Number.isFinite(numeric) || numeric <= 0) {
		throw new Error("Cannot invert an invalid market price");
	}
	const inverted = normalizeMarketNumber(1 / numeric, precision);
	if (!inverted) throw new Error("Cannot normalize an inverted market price");
	return inverted;
}

export function invertQuote(
	quote: MarketQuote,
	pricePrecision: number | undefined,
): MarketQuote {
	return {
		...quote,
		price: invertPositiveDecimal(quote.price, pricePrecision),
	};
}

export function invertBars(
	result: MarketBars,
	pricePrecision: number | undefined,
): MarketBars {
	const bars: MarketBar[] = result.bars.map((bar) => ({
		startedAt: bar.startedAt,
		open: invertPositiveDecimal(bar.open, pricePrecision),
		high: invertPositiveDecimal(bar.low, pricePrecision),
		low: invertPositiveDecimal(bar.high, pricePrecision),
		close: invertPositiveDecimal(bar.close, pricePrecision),
		...(bar.transactionCount !== undefined
			? { transactionCount: bar.transactionCount }
			: {}),
	}));

	return { ...result, bars };
}
