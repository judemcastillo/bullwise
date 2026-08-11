import {
	COMMUNICATION_PREFERENCE_SCHEMA_VERSION,
	DEFAULT_MARKET_NEWS_CATEGORIES,
	type CommunicationPreferenceSnapshot,
} from "@/lib/email/communication-policy";

export interface LegacyUserProfileEmailPreference {
	userId: string;
	dailyNewsEmailEnabled?: boolean;
	dailyNewsEmailUnsubscribedAt?: Date;
	updatedAt?: Date;
}

export interface LegacyCommunicationPreferenceSeed
	extends CommunicationPreferenceSnapshot {
	legacyMigration: {
		source: "user_profile_v1";
		migratedAt: Date;
	};
}

export const createLegacyCommunicationPreferenceSeed = ({
	profile,
	migratedAt,
}: {
	profile: LegacyUserProfileEmailPreference;
	migratedAt: Date;
}): LegacyCommunicationPreferenceSeed => {
	const explicitlyUnsubscribed = profile.dailyNewsEmailEnabled === false;

	return {
		userId: profile.userId,
		schemaVersion: COMMUNICATION_PREFERENCE_SCHEMA_VERSION,
		subscriptions: [
			{
				stream: "market_news",
				status: explicitlyUnsubscribed ? "unsubscribed" : "unknown",
				frequency: "off",
				categories: [...DEFAULT_MARKET_NEWS_CATEGORIES],
				...(explicitlyUnsubscribed
					? {
							unsubscribedAt:
								profile.dailyNewsEmailUnsubscribedAt ??
								profile.updatedAt ??
								migratedAt,
						}
					: {}),
			},
			{
				stream: "product_updates",
				status: "unknown",
				frequency: "off",
				categories: [],
			},
		],
		legacyMigration: {
			source: "user_profile_v1",
			migratedAt,
		},
	};
};
