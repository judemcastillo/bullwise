"use server";

import Watchlist from "@/database/models/watchlist.model";

interface WatchlistSymbol {
	symbol: string;
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
