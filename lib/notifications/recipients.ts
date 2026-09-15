import UserProfile from "@/database/models/user-profile.model";
import { notificationDatabase } from "./store";
import { Types, type ClientSession } from "mongoose";

// Better Auth's MongoDB adapter stores identities in the indexed ObjectId _id field.
export async function eligibleRecipientPage(
	cutoff: Date,
	afterUserId = "",
	session?: ClientSession,
	limit = 100,
) {
	await notificationDatabase();
	const candidates = await UserProfile.aggregate<{
		userId: string;
		identity: { _id: Types.ObjectId }[];
	}>([
		{
			$match: {
				userId: { $gt: afterUserId },
				onboardingCompletedAt: { $type: "date", $lte: cutoff },
			},
		},
		{ $sort: { userId: 1 } },
		{ $limit: limit },
		{
			$set: {
				identityId: {
					$convert: { input: "$userId", to: "objectId", onError: null, onNull: null },
				},
			},
		},
		{
			$lookup: {
				from: "user",
				localField: "identityId",
				foreignField: "_id",
				pipeline: [
					{ $match: { emailVerified: true } },
					{ $project: { _id: 1 } },
				],
				as: "identity",
			},
		},
		{ $project: { _id: 0, userId: 1, identity: 1 } },
	]).session(session ?? null);
	return {
		recipients: candidates
			.filter(({ identity }) => identity.length > 0)
			.map(({ userId }) => ({ userId })),
		// Advance past unverified/missing identities, including entirely ineligible batches.
		nextCursor: candidates.length === limit ? candidates.at(-1)!.userId : null,
	};
}

// Fill an eligible page without skipping recipients or joining unbounded candidates.
export async function filledEligibleRecipientPage(
	cutoff: Date,
	afterUserId = "",
	session?: ClientSession,
) {
	const recipients: { userId: string }[] = [];
	let nextCursor: string | null = afterUserId;
	do {
		const page = await eligibleRecipientPage(
			cutoff, nextCursor, session, 100 - recipients.length,
		);
		recipients.push(...page.recipients);
		nextCursor = page.nextCursor;
	} while (nextCursor !== null && recipients.length < 100);
	return { recipients, nextCursor };
}

export async function isEligibleRecipient(userId: string) {
	if (!Types.ObjectId.isValid(userId)) return false;
	const db = await notificationDatabase();
	const profile = await UserProfile.exists({
		userId,
		onboardingCompletedAt: { $type: "date" },
	});
	if (!profile) return false;
	return Boolean(
		await db.collection("user").findOne(
			{ _id: new Types.ObjectId(userId), emailVerified: true },
			{ projection: { _id: 1 } },
		),
	);
}
