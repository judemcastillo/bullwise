import "server-only";

import CommunicationPreference from "@/database/models/communication-preference.model";
import { connectToDatabase } from "@/database/mongoose";
import { setLegacyDailyNewsEmailPreference } from "@/lib/email/daily-news-preference";
import {
	COMMUNICATION_PREFERENCE_SCHEMA_VERSION,
	DEFAULT_MARKET_NEWS_CATEGORIES,
	type EmailConsentSource,
	type EmailFrequency,
	type EmailSubscriptionPreferenceSnapshot,
	type MarketNewsCategory,
	type MarketNewsPreferenceView,
} from "@/lib/email/communication-policy";
import { saveMarketNewsPreferenceWorkflow } from "@/lib/email/market-news-preference-workflow";

const defaultView = (): MarketNewsPreferenceView => ({
	status: "unknown",
	frequency: "off",
	categories: [...DEFAULT_MARKET_NEWS_CATEGORIES],
});

export const getMarketNewsPreference = async (
	userId: string,
): Promise<MarketNewsPreferenceView> => {
	await connectToDatabase();
	const preference = await CommunicationPreference.findOne({
		userId,
		"subscriptions.stream": "market_news",
	})
		.select({ subscriptions: { $elemMatch: { stream: "market_news" } }, _id: 0 })
		.lean<{
			subscriptions?: EmailSubscriptionPreferenceSnapshot[];
		} | null>();
	const subscription = preference?.subscriptions?.[0];
	if (!subscription) return defaultView();

	return {
		status: subscription.status,
		frequency: subscription.frequency,
		categories: [...subscription.categories],
	};
};

const replaceOrInsertMarketNewsSubscription = async ({
	userId,
	subscription,
}: {
	userId: string;
	subscription: EmailSubscriptionPreferenceSnapshot;
}) => {
	await connectToDatabase();

	const replaced = await CommunicationPreference.updateOne(
		{ userId, "subscriptions.stream": "market_news" },
		{ $set: { "subscriptions.$": subscription } },
		{ runValidators: true },
	);
	if (replaced.matchedCount > 0) return;

	try {
		await CommunicationPreference.updateOne(
			{ userId, "subscriptions.stream": { $ne: "market_news" } },
			{
				$setOnInsert: {
					userId,
					schemaVersion: COMMUNICATION_PREFERENCE_SCHEMA_VERSION,
				},
				$push: { subscriptions: subscription },
			},
			{ upsert: true, runValidators: true },
		);
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			error.code === 11000
		) {
			await CommunicationPreference.updateOne(
				{ userId, "subscriptions.stream": "market_news" },
				{ $set: { "subscriptions.$": subscription } },
				{ runValidators: true },
			);
			return;
		}

		throw error;
	}
};

export const saveMarketNewsPreference = async ({
	userId,
	frequency,
	categories,
	consentSource,
	now = new Date(),
}: {
	userId: string;
	frequency: EmailFrequency;
	categories: MarketNewsCategory[];
	consentSource?: EmailConsentSource;
	now?: Date;
}) => {
	await saveMarketNewsPreferenceWorkflow({
		frequency,
		categories,
		consentSource,
		now,
		repository: {
			writeLegacyEnabled: async (enabled) => {
				await setLegacyDailyNewsEmailPreference({ userId, enabled });
			},
			writeCommunicationSubscription: async (subscription) => {
				await replaceOrInsertMarketNewsSubscription({ userId, subscription });
			},
		},
	});
};

export const unsubscribeFromMarketNews = async ({
	userId,
	now = new Date(),
}: {
	userId: string;
	now?: Date;
}) => {
	const current = await getMarketNewsPreference(userId);
	await saveMarketNewsPreference({
		userId,
		frequency: "off",
		categories:
			current.categories.length > 0
				? current.categories
				: [...DEFAULT_MARKET_NEWS_CATEGORIES],
		now,
	});
};
