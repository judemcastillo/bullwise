import {
	COMMUNICATION_POLICY_VERSION,
	type EmailConsentSource,
	type EmailFrequency,
	type EmailSubscriptionPreferenceSnapshot,
	type MarketNewsCategory,
} from "@/lib/email/communication-policy";

export interface MarketNewsPreferenceWriteRepository {
	writeLegacyEnabled: (enabled: boolean) => Promise<void>;
	writeCommunicationSubscription: (
		subscription: EmailSubscriptionPreferenceSnapshot,
	) => Promise<void>;
}

export const saveMarketNewsPreferenceWorkflow = async ({
	frequency,
	categories,
	consentSource,
	now,
	repository,
}: {
	frequency: EmailFrequency;
	categories: MarketNewsCategory[];
	consentSource?: EmailConsentSource;
	now: Date;
	repository: MarketNewsPreferenceWriteRepository;
}) => {
	if (frequency === "off") {
		// Clear the rollback field first. The live job re-checks the dedicated
		// preference document and cannot deliver after the unsubscribe is recorded.
		await repository.writeLegacyEnabled(false);
		await repository.writeCommunicationSubscription({
			stream: "market_news",
			status: "unsubscribed",
			frequency: "off",
			categories,
			unsubscribedAt: now,
		});
		return;
	}

	if (!consentSource) {
		throw new Error("A consent source is required to subscribe to market news");
	}

	// Record auditable consent before mirroring rollback state.
	await repository.writeCommunicationSubscription({
		stream: "market_news",
		status: "subscribed",
		frequency,
		categories,
		consentSource,
		consentedAt: now,
		consentPolicyVersion: COMMUNICATION_POLICY_VERSION,
	});
	// The live jobs ignore this legacy field. Keep it aligned temporarily so a
	// rollback cannot map a weekly preference onto the old daily-only schedule.
	await repository.writeLegacyEnabled(frequency === "daily");
};
