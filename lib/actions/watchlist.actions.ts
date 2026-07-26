"use server";

import Watchlist from "@/database/models/watchlist.model";
import { auth } from "@/lib/better-auth/auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

interface WatchlistSymbol {
	symbol: string;
}

async function getCurrentUserId(): Promise<string> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) throw new Error("Unauthorized");

	return session.user.id;
}

export async function addToWatchlist(
	symbol: string,
	company: string,
): Promise<void> {
	const userId = await getCurrentUserId();
	const normalizedSymbol = symbol.trim().toUpperCase();

	await Watchlist.updateOne(
		{ userId, symbol: normalizedSymbol },
		{
			$setOnInsert: {
				userId,
				symbol: normalizedSymbol,
				company: company.trim(),
			},
		},
		{ upsert: true },
	);

	revalidatePath(`/stocks/${encodeURIComponent(normalizedSymbol)}`);
	revalidatePath("/watchlist");
}

export async function removeFromWatchlist(symbol: string): Promise<void> {
	const userId = await getCurrentUserId();
	const normalizedSymbol = symbol.trim().toUpperCase();

	await Watchlist.deleteOne({
		userId,
		symbol: normalizedSymbol,
	});

	revalidatePath(`/stocks/${encodeURIComponent(normalizedSymbol)}`);
	revalidatePath("/watchlist");
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
