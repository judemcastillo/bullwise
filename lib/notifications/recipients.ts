import UserProfile from "@/database/models/user-profile.model";
import { notificationDatabase } from "./store";
import type { ClientSession } from "mongoose";

// A stable user-id cursor supports both Better Auth id shapes without exposing identities to clients.
export async function eligibleRecipientPage(
	cutoff: Date,
	afterUserId = "",
	session?: ClientSession,
) {
	await notificationDatabase();
	return UserProfile.aggregate<{ userId: string }>([
		{
			$match: {
				userId: { $gt: afterUserId },
				onboardingCompletedAt: { $type: "date", $lte: cutoff },
			},
		},
		{ $sort: { userId: 1 } },
		{
			$lookup: {
				from: "user",
				let: { uid: "$userId" },
				pipeline: [
					{
						$match: {
							emailVerified: true,
							$expr: {
								$or: [
									{ $eq: ["$id", "$$uid"] },
									{ $eq: [{ $toString: "$_id" }, "$$uid"] },
								],
							},
						},
					},
					{ $project: { _id: 1 } },
				],
				as: "identity",
			},
		},
		{ $match: { "identity.0": { $exists: true } } },
		{ $limit: 100 },
		{ $project: { _id: 0, userId: 1 } },
	]).session(session ?? null);
}
export async function isEligibleRecipient(userId: string) {
	const db = await notificationDatabase();
	const profile = await UserProfile.exists({
		userId,
		onboardingCompletedAt: { $type: "date" },
	});
	if (!profile) return false;
	return Boolean(
		await db.collection("user").findOne(
			{
				emailVerified: true,
				$expr: {
					$or: [
						{ $eq: ["$id", userId] },
						{ $eq: [{ $toString: "$_id" }, userId] },
					],
				},
			},
			{ projection: { _id: 1 } },
		),
	);
}
