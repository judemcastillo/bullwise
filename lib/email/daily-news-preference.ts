import "server-only";

import UserProfile from "@/database/models/user-profile.model";
import { connectToDatabase } from "@/database/mongoose";

export const setLegacyDailyNewsEmailPreference = async ({
	userId,
	enabled,
}: {
	userId: string;
	enabled: boolean;
}) => {
	await connectToDatabase();

	const update = enabled
		? {
				$set: { dailyNewsEmailEnabled: true },
				$unset: { dailyNewsEmailUnsubscribedAt: 1 as const },
			}
		: {
				$set: {
					dailyNewsEmailEnabled: false,
					dailyNewsEmailUnsubscribedAt: new Date(),
				},
			};

	const result = await UserProfile.updateOne({ userId }, update);
	return result.matchedCount > 0;
};

export const getLegacyDailyNewsEmailPreference = async (userId: string) => {
	await connectToDatabase();
	const profile = await UserProfile.findOne({ userId })
		.select({ dailyNewsEmailEnabled: 1, _id: 0 })
		.lean<{ dailyNewsEmailEnabled?: boolean } | null>();

	return profile?.dailyNewsEmailEnabled !== false;
};
