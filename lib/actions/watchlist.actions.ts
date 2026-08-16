"use server";

import {
	addToCurrentUserWatchlist,
	removeFromCurrentUserWatchlist,
} from "@/lib/data/watchlist";
import { revalidatePath } from "next/cache";

function revalidateWatchlistViews() {
	revalidatePath("/");
	revalidatePath("/watchlist");
}

export async function addToWatchlist(instrumentId: string) {
	const result = await addToCurrentUserWatchlist(instrumentId);
	if (result.success) revalidateWatchlistViews();
	return result;
}

export async function removeFromWatchlist(instrumentId: string) {
	const result = await removeFromCurrentUserWatchlist(instrumentId);
	if (result.success) revalidateWatchlistViews();
	return result;
}
