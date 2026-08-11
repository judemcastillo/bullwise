import "server-only";

import CommunicationPreference from "@/database/models/communication-preference.model";
import { connectToDatabase } from "@/database/mongoose";
import {
	MARKET_NEWS_RECIPIENT_PAGE_SIZE,
	type MarketNewsDeliveryFrequency,
} from "@/lib/email/market-news-delivery-policy";
import { type Filter, ObjectId } from "mongodb";

interface PreferenceUserId {
	userId: string;
}

interface BetterAuthUser {
	_id?: ObjectId;
	id?: string;
	email?: string | null;
	emailVerified?: boolean;
}

export interface MarketNewsRecipientPage {
	userIds: string[];
	nextCursor: string | null;
}

export async function listMarketNewsRecipientIdsPage({
	frequency,
	afterUserId,
}: {
	frequency: MarketNewsDeliveryFrequency;
	afterUserId?: string;
}): Promise<MarketNewsRecipientPage> {
	await connectToDatabase();

	const preferences = await CommunicationPreference.find({
		...(afterUserId ? { userId: { $gt: afterUserId } } : {}),
		emailSuppression: { $exists: false },
		subscriptions: {
			$elemMatch: {
				stream: "market_news",
				status: "subscribed",
				frequency,
				categories: { $exists: true, $ne: [] },
				consentSource: { $exists: true },
				consentedAt: { $type: "date" },
				consentPolicyVersion: { $exists: true, $ne: "" },
			},
		},
	})
		.select({ userId: 1, _id: 0 })
		.sort({ userId: 1 })
		.limit(MARKET_NEWS_RECIPIENT_PAGE_SIZE + 1)
		.lean<PreferenceUserId[]>();

	const hasMore = preferences.length > MARKET_NEWS_RECIPIENT_PAGE_SIZE;
	const userIds = preferences
		.slice(0, MARKET_NEWS_RECIPIENT_PAGE_SIZE)
		.map(({ userId }) => userId);

	return {
		userIds,
		nextCursor: hasMore ? (userIds.at(-1) ?? null) : null,
	};
}

export async function getVerifiedMarketNewsRecipient(userId: string) {
	const mongoose = await connectToDatabase();
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose connection is not connected");

	const identities: Filter<BetterAuthUser>[] = [{ id: userId }];
	if (ObjectId.isValid(userId)) {
		identities.push({ _id: new ObjectId(userId) });
	}

	const user = await db.collection<BetterAuthUser>("user").findOne(
		{
			$or: identities,
			emailVerified: true,
			email: { $type: "string" },
		},
		{ projection: { email: 1, _id: 0 } },
	);
	const email = typeof user?.email === "string" ? user.email.trim() : "";

	return email ? { id: userId, email } : null;
}
