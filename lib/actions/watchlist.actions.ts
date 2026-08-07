"use server";

import {
	addToCurrentUserWatchlist,
	removeFromCurrentUserWatchlist,
} from "@/lib/data/watchlist";

export async function addToWatchlist(symbol: string, company: string) {
	return addToCurrentUserWatchlist(symbol, company);
}

export async function removeFromWatchlist(symbol: string) {
	return removeFromCurrentUserWatchlist(symbol);
}
