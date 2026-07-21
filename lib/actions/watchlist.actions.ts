"use server";

import Watchlist from "@/database/models/watchlist.model";
import { connectToDatabase } from "@/database/mongoose";

interface BetterAuthUser {
	id?: string;
	email: string;
}

interface WatchlistSymbol {
	symbol: string;
}

export async function getWatchlistSymbolsByEmail(
	email: string,
): Promise<string[]> {
	try {
		const mongoose = await connectToDatabase();
		const db = mongoose.connection.db;

		if (!db) {
			console.error("Unable to fetch watchlist: MongoDB is not connected");
			return [];
		}

		const user = await db
			.collection<BetterAuthUser>("user")
			.findOne({ email }, { projection: { id: 1, email: 1 } });

		if (!user?.id) return [];

		const items = await Watchlist.find({ userId: user.id })
			.select({ symbol: 1, _id: 0 })
			.lean<WatchlistSymbol[]>();

		return items.map(({ symbol }) => symbol);
	} catch (error: unknown) {
		console.error("Error fetching watchlist symbols:", error);
		return [];
	}
}
