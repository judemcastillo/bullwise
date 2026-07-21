"use server";

import { connectToDatabase } from "@/database/mongoose";

interface NewsEmailUser {
	id: string;
	email: string;
	name: string;
}

interface BetterAuthUser {
	id?: string;
	email?: string | null;
	name?: string | null;
}

export const getAllUsersForNewsEmail = async (): Promise<NewsEmailUser[]> => {
	try {
		const mongoose = await connectToDatabase();
		const db = mongoose.connection.db;
		if (!db) throw new Error("Mongoose connection is not connected");

		const users = await db
			.collection<BetterAuthUser>("user")
			.find(
				{ email: { $exists: true, $ne: null } },
				{ projection: { _id: 1, id: 1, email: 1, name: 1 } },
			)
			.toArray();

		return users.flatMap((user): NewsEmailUser[] => {
			if (typeof user.email !== "string" || typeof user.name !== "string") {
				return [];
			}

			return [
				{
					id: user.id || user._id.toString(),
					email: user.email,
					name: user.name,
				},
			];
		});
	} catch (error: unknown) {
		console.error("Error fetching users for news email:", error);
		return [];
	}
};
