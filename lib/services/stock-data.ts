import "server-only";

import {
	formatChangePercent,
	formatMarketCapValue,
	formatPrice,
} from "@/lib/utils";
import { cache } from "react";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const FINNHUB_API_KEY =
	process.env.FINNHUB_API_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? "";

async function fetchStockData<T>(
	path: string,
	revalidateSeconds?: number,
): Promise<T> {
	const response = await fetch(
		`${FINNHUB_BASE_URL}/${path}${path.includes("?") ? "&" : "?"}token=${FINNHUB_API_KEY}`,
		revalidateSeconds === undefined
			? { cache: "no-store", signal: AbortSignal.timeout(8000) }
			: {
					cache: "force-cache",
					next: { revalidate: revalidateSeconds },
					signal: AbortSignal.timeout(8000),
				},
	);

	if (!response.ok) {
		throw new Error(
			`Finnhub request failed with ${response.status} ${response.statusText}`,
		);
	}

	return (await response.json()) as T;
}

export const getStocksDetails = cache(async (symbol: string) => {
	const cleanSymbol = symbol.trim().toUpperCase();
	const encodedSymbol = encodeURIComponent(cleanSymbol);

	try {
		const [quoteData, profileData, financialsData] = await Promise.all([
			fetchStockData<QuoteData>(`quote?symbol=${encodedSymbol}`),
			fetchStockData<ProfileData>(
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
			changePercent,
			priceFormatted: formatPrice(quoteData.c),
			changeFormatted: formatChangePercent(changePercent),
			peRatio: peRatio?.toFixed(1) || "—",
			marketCapFormatted: formatMarketCapValue(
				profileData.marketCapitalization || 0,
			),
		};
	} catch (error) {
		console.error(`Error fetching details for ${cleanSymbol}:`, error);
		throw new Error("Failed to fetch stock details");
	}
});
