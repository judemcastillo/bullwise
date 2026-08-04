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
const PEERS_TIMEOUT_MS = 1500;

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

export const getStockDashboardData = cache(async (symbol: string) => {
	const cleanSymbol = symbol.trim().toUpperCase();
	const encodedSymbol = encodeURIComponent(cleanSymbol);

	const [quoteData, profileData, financialsData] = await Promise.all([
		fetchStockData<DashboardQuoteData>(`quote?symbol=${encodedSymbol}`),
		fetchStockData<DashboardProfileData>(
			`stock/profile2?symbol=${encodedSymbol}`,
			3600,
		),
		fetchStockData<FinancialsData>(
			`stock/metric?symbol=${encodedSymbol}&metric=all`,
			1800,
		),
	]);

	const metrics = financialsData.metric ?? {};
	const currentPrice = quoteData.c ?? 0;
	const changePercent = quoteData.dp ?? 0;
	const marketCapInUsd = (profileData.marketCapitalization ?? 0) * 1_000_000;

	return {
		symbol: cleanSymbol,
		company: profileData.name || profileData.ticker || cleanSymbol,
		currentPrice,
		priceFormatted: currentPrice ? formatPrice(currentPrice) : "—",
		change: quoteData.d ?? 0,
		changePercent,
		changeFormatted: formatChangePercent(changePercent) || "0.00%",
		dayHigh: quoteData.h ?? 0,
		dayLow: quoteData.l ?? 0,
		openPrice: quoteData.o ?? 0,
		previousClose: quoteData.pc ?? 0,
		marketCapitalization: marketCapInUsd,
		peRatio: metrics.peNormalizedAnnual?.toFixed(1) || "—",
		eps:
			metrics.epsBasicExclExtraItemsAnnual ??
			metrics.epsNormalizedAnnual ??
			null,
		week52High: metrics["52WeekHigh"] ?? null,
		week52Low: metrics["52WeekLow"] ?? null,
		country: profileData.country || "—",
		currency: profileData.currency || null,
		exchange: profileData.exchange || "—",
		industry: profileData.finnhubIndustry || "—",
		ipo: profileData.ipo || "—",
		logo: profileData.logo || "",
		shareOutstanding: profileData.shareOutstanding ?? null,
		webUrl: profileData.weburl || "",
	};
});

export const getCompanyPeers = cache(async (symbol: string) => {
	const cleanSymbol = symbol.trim().toUpperCase();
	const encodedSymbol = encodeURIComponent(cleanSymbol);
	let payload: unknown;

	try {
		payload = await fetchStockData<unknown>(
			`stock/peers?symbol=${encodedSymbol}&grouping=sector`,
			3600,
			PEERS_TIMEOUT_MS,
		);
	} catch (error) {
		const reason =
			error instanceof Error ? `${error.name}: ${error.message}` : "unknown error";
		console.warn(`Unable to load peers for ${cleanSymbol} (${reason})`);
		return [];
	}

	if (!Array.isArray(payload)) return [];

	return Array.from(
		new Set(
			payload
				.filter((peer): peer is string => typeof peer === "string")
				.map((peer) => peer.trim().toUpperCase())
				.filter((peer) => peer.length > 0 && peer !== cleanSymbol),
		),
	);
});

export const getRelatedStockDetails = cache(async (symbol: string) => {
	const cleanSymbol = symbol.trim().toUpperCase();
	const encodedSymbol = encodeURIComponent(cleanSymbol);
	const [quoteData, profileData] = await Promise.all([
		fetchStockData<QuoteData>(`quote?symbol=${encodedSymbol}`),
		fetchStockData<DashboardProfileData>(
			`stock/profile2?symbol=${encodedSymbol}`,
			3600,
		),
	]);

	if (!quoteData.c || !profileData.name) {
		throw new Error("Invalid stock data received from API");
	}

	const changePercent = quoteData.dp || 0;

	return {
		symbol: cleanSymbol,
		company: profileData.name,
		currentPrice: quoteData.c,
		currency: profileData.currency || null,
		logo: profileData.logo || null,
		changePercent,
		changeFormatted: formatChangePercent(changePercent),
	};
});

export const getStocksDetails = cache(async (symbol: string) => {
	const cleanSymbol = symbol.trim().toUpperCase();
	const encodedSymbol = encodeURIComponent(cleanSymbol);

	try {
		const [quoteData, profileData, financialsData] = await Promise.all([
			fetchStockData<QuoteData>(`quote?symbol=${encodedSymbol}`),
			fetchStockData<DashboardProfileData>(
				`stock/profile2?symbol=${encodedSymbol}`,
				3600,
			),
			fetchStockData<FinancialsData>(
				`stock/metric?symbol=${encodedSymbol}&metric=all`,
				1800,
			),
		]);

		if (!quoteData.c || !profileData.name) {
			throw new Error("Invalid stock data received from API");
		}

		const changePercent = quoteData.dp || 0;
		const peRatio = financialsData.metric?.peNormalizedAnnual || null;

		return {
			symbol: cleanSymbol,
			company: profileData.name,
			currentPrice: quoteData.c,
			currency: profileData.currency || null,
			logo: profileData.logo || null,
			changePercent,
			priceFormatted: formatPrice(quoteData.c),
			changeFormatted: formatChangePercent(changePercent),
			peRatio: peRatio?.toFixed(1) || "—",
			marketCapFormatted: formatMarketCapValue(
				profileData.marketCapitalization || 0,
			),
		};
	} catch (error) {
		const reason =
			error instanceof Error ? `${error.name}: ${error.message}` : "unknown error";
		console.warn(`Unable to load stock details for ${cleanSymbol} (${reason})`);
		throw new Error("Failed to fetch stock details");
	}
});
