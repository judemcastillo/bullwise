"use server";

import { requireCompletedUser } from "@/lib/auth/require-user";
import { getWatchlistSymbolsForUser } from "@/lib/data/watchlist";
import { searchFinnhubStocks } from "@/lib/market-data/finnhub";

const MAX_SEARCH_QUERY_LENGTH = 20;

export async function searchStocks(
	query?: string,
): Promise<StockWithWatchlistStatus[]> {
	const user = await requireCompletedUser();
	const normalizedQuery = typeof query === "string" ? query.trim() : undefined;

	if (normalizedQuery && normalizedQuery.length > MAX_SEARCH_QUERY_LENGTH) {
		return [];
	}

	const watchlistSymbols = await getWatchlistSymbolsForUser(user.id);
	return searchFinnhubStocks(normalizedQuery, watchlistSymbols);
}
