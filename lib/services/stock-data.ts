import "server-only";

import {
	formatChangePercent,
	formatMarketCapValue,
	formatPrice,
} from "@/lib/utils";
import { getFinnhubApiKey } from "@/lib/market-data/finnhub-config";
import { cache } from "react";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const DEFAULT_FINNHUB_TIMEOUT_MS = 5000;

type DashboardQuoteData = QuoteData & {
	d?: number;
	h?: number;
	l?: number;
	o?: number;
	pc?: number;
};

type DashboardProfileData = ProfileData & {
	country?: string;
	currency?: string;
	exchange?: string;
	finnhubIndustry?: string;
	ipo?: string;
	logo?: string;
	shareOutstanding?: number;
	ticker?: string;
	weburl?: string;
};

type StockQuote = {
	symbol: string;
	currentPrice?: number;
	change?: number;
	changePercent?: number;
	dayHigh?: number;
	dayLow?: number;
	openPrice?: number;
	previousClose?: number;
};

type StockProfile = DashboardProfileData & {
	symbol: string;
};

type StockMetrics = {
	symbol: string;
	values: NonNullable<FinancialsData["metric"]>;
};

async function fetchStockData<T>(
	path: string,
	revalidateSeconds?: number,
	timeoutMs = DEFAULT_FINNHUB_TIMEOUT_MS,
): Promise<T> {
	const response = await fetch(
		`${FINNHUB_BASE_URL}/${path}${path.includes("?") ? "&" : "?"}token=${getFinnhubApiKey()}`,
		revalidateSeconds === undefined
			? { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) }
			: {
					cache: "force-cache",
					next: { revalidate: revalidateSeconds },
					signal: AbortSignal.timeout(timeoutMs),
				},
	);

	if (!response.ok) {
		throw new Error(
			`Finnhub request failed with ${response.status} ${response.statusText}`,
		);
	}

	return (await response.json()) as T;
}

function normalizeSymbol(symbol: string) {
	return symbol.trim().toUpperCase();
}

export const getStockQuote = cache(
	async (symbol: string): Promise<StockQuote> => {
		const cleanSymbol = normalizeSymbol(symbol);
		const quote = await fetchStockData<DashboardQuoteData>(
			`quote?symbol=${encodeURIComponent(cleanSymbol)}`,
		);

		return {
			symbol: cleanSymbol,
			currentPrice: quote.c,
			change: quote.d,
			changePercent: quote.dp,
			dayHigh: quote.h,
			dayLow: quote.l,
			openPrice: quote.o,
			previousClose: quote.pc,
		};
	},
);

export const getStockProfile = cache(
	async (symbol: string): Promise<StockProfile> => {
		const cleanSymbol = normalizeSymbol(symbol);
		const profile = await fetchStockData<DashboardProfileData>(
			`stock/profile2?symbol=${encodeURIComponent(cleanSymbol)}`,
			3600,
		);

		return { ...profile, symbol: cleanSymbol };
	},
);

export const getStockMetrics = cache(
	async (symbol: string): Promise<StockMetrics> => {
		const cleanSymbol = normalizeSymbol(symbol);
		const financials = await fetchStockData<FinancialsData>(
			`stock/metric?symbol=${encodeURIComponent(cleanSymbol)}&metric=all`,
			1800,
		);

		return {
			symbol: cleanSymbol,
			values: financials.metric ?? {},
		};
	},
);

export const getStocksDetails = cache(async (symbol: string) => {
	const cleanSymbol = normalizeSymbol(symbol);

	try {
		const [quote, profile, financials] = await Promise.all([
			getStockQuote(cleanSymbol),
			getStockProfile(cleanSymbol),
			getStockMetrics(cleanSymbol),
		]);

		if (!quote.currentPrice || !profile.name) {
			throw new Error("Invalid stock data received from API");
		}

		const changePercent = quote.changePercent || 0;
		const peRatio = financials.values.peNormalizedAnnual || null;

		return {
			symbol: cleanSymbol,
			company: profile.name,
			currentPrice: quote.currentPrice,
			currency: profile.currency || null,
			logo: profile.logo || null,
			changePercent,
			priceFormatted: formatPrice(quote.currentPrice),
			changeFormatted: formatChangePercent(changePercent),
			peRatio: peRatio?.toFixed(1) || "—",
			marketCapFormatted: formatMarketCapValue(
				(profile.marketCapitalization || 0) * 1_000_000,
			),
		};
	} catch (error) {
		const reason =
			error instanceof Error ? `${error.name}: ${error.message}` : "unknown error";
		console.warn(`Unable to load stock details for ${cleanSymbol} (${reason})`);
		throw new Error("Failed to fetch stock details");
	}
});

export const getListedSecurityQuoteDetails = cache(async (symbol: string) => {
	const quote = await getStockQuote(symbol);
	if (!quote.currentPrice) {
		throw new Error("Invalid listed security quote received from API");
	}

	const changePercent = quote.changePercent ?? 0;
	return {
		currentPrice: quote.currentPrice,
		changePercent,
		priceFormatted: formatPrice(quote.currentPrice),
		changeFormatted: formatChangePercent(changePercent),
	};
});
