import "server-only";

import UserProfile from "@/database/models/user-profile.model";
import Watchlist from "@/database/models/watchlist.model";
import { connectToDatabase } from "@/database/mongoose";
import { requireCompletedUser } from "@/lib/auth/require-user";
import { mapWithConcurrency } from "@/lib/concurrency";
import { getStocksDetails } from "@/lib/services/stock-data";
import {
	paginateWatchlist,
	WATCHLIST_MAX_ITEMS,
} from "@/lib/watchlist-policy";
import { toWatchlistClientItem } from "@/lib/watchlist-serialization";

interface WatchlistSymbol {
	symbol: string;
}

interface WatchlistRecord extends WatchlistSymbol {
	company: string;
}

const WATCHLIST_SYMBOL_PATTERN = /^[A-Z0-9._:/-]{1,40}$/;
const MAX_COMPANY_LENGTH = 160;
const WATCHLIST_STOCK_DATA_CONCURRENCY = 4;

const watchlistLimitResult = () => ({
	success: false as const,
	error: `Your watchlist can contain up to ${WATCHLIST_MAX_ITEMS} stocks`,
});

function isDuplicateKeyError(error: unknown) {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: unknown }).code === 11000
	);
}

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
		const mongoose = await connectToDatabase();
		return await mongoose.connection.transaction(async (session) => {
			const reservation = await UserProfile.findOneAndUpdate(
				{ userId, watchlistItemCount: { $lt: WATCHLIST_MAX_ITEMS } },
				{ $inc: { watchlistItemCount: 1 } },
				{ returnDocument: "after", session },
			);

			if (!reservation) {
				const existingItem = await Watchlist.exists({
					userId,
					symbol: normalizedSymbol,
				}).session(session);
				return existingItem
					? { success: false, error: "Stock already exists" }
					: watchlistLimitResult();
			}

			await Watchlist.create(
				[
					{
						userId,
						symbol: normalizedSymbol,
						company: normalizedCompany,
					},
				],
				{ session },
			);

			return { success: true, message: "Stock added to watchlist" };
		});
	} catch (e) {
		if (isDuplicateKeyError(e)) {
			return { success: false, error: "Stock already exists" };
		}
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
		const mongoose = await connectToDatabase();
		return await mongoose.connection.transaction(async (session) => {
			const result = await Watchlist.deleteOne(
				{ userId, symbol: normalizedSymbol },
				{ session },
			);

			if (result.deletedCount === 0) {
				return { success: false, error: "Stock is not in watchlist" };
			}

			const counterUpdate = await UserProfile.updateOne(
				{ userId, watchlistItemCount: { $gt: 0 } },
				{ $inc: { watchlistItemCount: -1 } },
				{ session },
			);
			if (counterUpdate.modifiedCount !== 1) {
				throw new Error("Watchlist counter is inconsistent");
			}

			return { success: true, message: "Stock removed from watchlist" };
		});
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

async function enrichWatchlistItems(watchlist: readonly WatchlistRecord[]) {
	return mapWithConcurrency(
		watchlist,
		WATCHLIST_STOCK_DATA_CONCURRENCY,
		async (item): Promise<StockWithData> => {
			const clientItem = toWatchlistClientItem(item);

			try {
				const stockData = await getStocksDetails(item.symbol);

				if (!stockData) {
					console.warn(`Failed to fetch data for ${item.symbol}`);
					return clientItem;
				}

				return {
					...clientItem,
					company: stockData.company,
					symbol: stockData.symbol,
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
				return clientItem;
			}
		},
	);
}

// Get user's watchlist with stock data
export const getWatchlistWithData = async (
	limit?: number,
): Promise<StockWithData[]> => {
	const userId = await getCurrentUserId();

	try {
		const query = Watchlist.find({ userId })
			.select({ symbol: 1, company: 1, _id: 0 })
			.sort({ addedAt: -1 });
		if (limit && limit > 0) query.limit(limit);
		const watchlist = await query.lean<WatchlistRecord[]>();

		if (watchlist.length === 0) return [];
		return enrichWatchlistItems(watchlist);
	} catch (error) {
		console.error("Error loading watchlist:", error);
		throw new Error("Failed to fetch watchlist");
	}
};

export async function getPaginatedWatchlistWithData(
	requestedPage?: string | string[],
) {
	const userId = await getCurrentUserId();

	try {
		const watchlist = await Watchlist.find({ userId })
			.select({ symbol: 1, company: 1, _id: 0 })
			.sort({ addedAt: -1 })
			.lean<WatchlistRecord[]>();
		const pagination = paginateWatchlist(watchlist, requestedPage);

		return {
			...pagination,
			items: await enrichWatchlistItems(pagination.items),
			allItems: watchlist.map(({ company, symbol }) => ({ company, symbol })),
		};
	} catch (error) {
		console.error("Error loading paginated watchlist:", error);
		throw new Error("Failed to fetch watchlist");
	}
}
