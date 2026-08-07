import "server-only";

import Watchlist from "@/database/models/watchlist.model";
import { requireCompletedUser } from "@/lib/auth/require-user";
import { getStocksDetails } from "@/lib/services/stock-data";

interface WatchlistSymbol {
	symbol: string;
}

const WATCHLIST_SYMBOL_PATTERN = /^[A-Z0-9._:/-]{1,40}$/;
const MAX_COMPANY_LENGTH = 160;

async function getCurrentUserId(): Promise<string> {
	return (await requireCompletedUser()).id;
}

export async function addToCurrentUserWatchlist(
	symbol: string,
	company: string,
) {
	const userId = await getCurrentUserId();
	const normalizedSymbol =
		typeof symbol === "string" ? symbol.trim().toUpperCase() : "";
	const normalizedCompany =
		typeof company === "string" ? company.trim() : "";

	if (!WATCHLIST_SYMBOL_PATTERN.test(normalizedSymbol)) {
		return { success: false, error: "Choose a valid stock symbol" };
	}
	if (
		!normalizedCompany ||
		normalizedCompany.length > MAX_COMPANY_LENGTH
	) {
		return { success: false, error: "Choose a valid company" };
	}

	try {
		const result = await Watchlist.updateOne(
			{ userId, symbol: normalizedSymbol },
			{
				$setOnInsert: {
					userId,
					symbol: normalizedSymbol,
					company: normalizedCompany,
				},
			},
			{ upsert: true, runValidators: true },
		);

		if (result.upsertedCount === 0) {
			return { success: false, error: "Stock already exists" };
		}

		return { success: true, message: "Stock added to watchlist" };
	} catch (e) {
		console.error("Error adding to watchlist", e);
		throw new Error("Failed to add stock to watchlist");
	}
}

export async function removeFromCurrentUserWatchlist(symbol: string) {
	const userId = await getCurrentUserId();
	const normalizedSymbol =
		typeof symbol === "string" ? symbol.trim().toUpperCase() : "";
	if (!WATCHLIST_SYMBOL_PATTERN.test(normalizedSymbol)) {
		return { success: false, error: "Choose a valid stock symbol" };
	}

	try {
		await Watchlist.deleteOne({
			userId,
			symbol: normalizedSymbol,
		});

		return { success: true, message: "Stock removed from watchlist" };
	} catch (error) {
		console.error("Error removing from watchlist:", error);
		throw new Error("Failed to remove stock from watchlist");
	}
}

export async function getWatchlistSymbolsForUser(
	userId: string,
): Promise<string[]> {
	try {
		const items = await Watchlist.find({ userId })
			.select({ symbol: 1, _id: 0 })
			.lean<WatchlistSymbol[]>();

		return items.map(({ symbol }) => symbol);
	} catch (error: unknown) {
		console.error("Error fetching watchlist symbols:", error);
		return [];
	}
}

// Get user's watchlist with stock data
export const getWatchlistWithData = async (
	limit?: number,
): Promise<StockWithData[]> => {
	const userId = await getCurrentUserId();

	try {
		const query = Watchlist.find({ userId }).sort({ addedAt: -1 });
		if (limit && limit > 0) query.limit(limit);
		const watchlist = await query.lean();

		if (watchlist.length === 0) return [];

		const stocksWithData: StockWithData[] = await Promise.all(
			watchlist.map(async (item): Promise<StockWithData> => {
				try {
					const stockData = await getStocksDetails(item.symbol);

					if (!stockData) {
						console.warn(`Failed to fetch data for ${item.symbol}`);
						return item;
					}

					return {
						userId: item.userId,
						company: stockData.company,
						symbol: stockData.symbol,
						addedAt: item.addedAt,
						currentPrice: stockData.currentPrice,
						currency: stockData.currency,
						logo: stockData.logo,
						priceFormatted: stockData.priceFormatted,
						changeFormatted: stockData.changeFormatted,
						changePercent: stockData.changePercent,
						marketCap: stockData.marketCapFormatted,
						peRatio: stockData.peRatio,
					};
				} catch (error) {
					const reason =
						error instanceof Error ? error.message : "unknown error";
					console.warn(
						`Unable to load watchlist data for ${item.symbol} (${reason})`,
					);
					return item;
				}
			}),
		);

		return stocksWithData;
	} catch (error) {
		console.error("Error loading watchlist:", error);
		throw new Error("Failed to fetch watchlist");
	}
};
