"use server";

import Watchlist from "@/database/models/watchlist.model";
import { auth } from "@/lib/better-auth/auth";
import { getStocksDetails } from "@/lib/services/stock-data";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

interface WatchlistSymbol {
	symbol: string;
}

async function getCurrentUserId(): Promise<string> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) redirect("/sign-in");

	return session.user.id;
}

export async function addToWatchlist(symbol: string, company: string) {
	const userId = await getCurrentUserId();
	const normalizedSymbol = symbol.trim().toUpperCase();
	const normalizedCompany = company.trim();

	if (!normalizedSymbol || !normalizedCompany) {
		return { success: false, error: "Symbol and company are required" };
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

export async function removeFromWatchlist(symbol: string) {
	const userId = await getCurrentUserId();
	const normalizedSymbol = symbol.trim().toUpperCase();

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

export async function getWatchlistSymbolsByUserId(
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

// Get user's watchlist
export const getUserWatchlist = async () => {
	const userId = await getCurrentUserId();

	try {
		const watchlist = await Watchlist.find({ userId })
			.sort({ addedAt: -1 })
			.lean();

		return JSON.parse(JSON.stringify(watchlist));
	} catch (error) {
		console.error("Error fetching watchlist:", error);
		throw new Error("Failed to fetch watchlist");
	}
};

// Get user's watchlist with stock data
export const getWatchlistWithData = async (): Promise<StockWithData[]> => {
	const userId = await getCurrentUserId();

	try {
		const watchlist = await Watchlist.find({ userId })
			.sort({ addedAt: -1 })
			.lean();

		if (watchlist.length === 0) return [];

		const stocksWithData = await Promise.all(
			watchlist.map(async (item) => {
				const stockData = await getStocksDetails(item.symbol);

				if (!stockData) {
					console.warn(`Failed to fetch data for ${item.symbol}`);
					return item;
				}

				return {
					company: stockData.company,
					symbol: stockData.symbol,
					currentPrice: stockData.currentPrice,
					priceFormatted: stockData.priceFormatted,
					changeFormatted: stockData.changeFormatted,
					changePercent: stockData.changePercent,
					marketCap: stockData.marketCapFormatted,
					peRatio: stockData.peRatio,
				};
			}),
		);

		return JSON.parse(JSON.stringify(stocksWithData)) as StockWithData[];
	} catch (error) {
		console.error("Error loading watchlist:", error);
		throw new Error("Failed to fetch watchlist");
	}
};
