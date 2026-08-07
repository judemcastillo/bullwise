import "server-only";

import UserProfile from "@/database/models/user-profile.model";
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
	emailVerified?: boolean;
}

export const getAllUsersForNewsEmail = async (): Promise<NewsEmailUser[]> => {
	try {
		const mongoose = await connectToDatabase();
		const db = mongoose.connection.db;
		if (!db) throw new Error("Mongoose connection is not connected");

		const users = await db
			.collection<BetterAuthUser>("user")
			.find(
				{ email: { $exists: true, $ne: null }, emailVerified: true },
				{ projection: { _id: 1, id: 1, email: 1, name: 1 } },
			)
			.toArray();
		const userIds = users.map((user) => user.id || user._id.toString());
		const completedProfiles = await UserProfile.find({
			userId: { $in: userIds },
			onboardingCompletedAt: { $ne: null },
		})
			.select({ userId: 1, _id: 0 })
			.lean<Array<{ userId: string }>>();
		const eligibleUserIds = new Set(
			completedProfiles.map(({ userId }) => userId),
		);

		return users.flatMap((user): NewsEmailUser[] => {
			const id = user.id || user._id.toString();
			if (typeof user.email !== "string" || typeof user.name !== "string") {
				return [];
			}
			if (!eligibleUserIds.has(id)) return [];

			return [
				{
					id,
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
