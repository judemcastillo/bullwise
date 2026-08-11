import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COMMUNICATION_POLICY_VERSION } from "@/lib/email/communication-policy";
import {
	saveMarketNewsPreferenceWorkflow,
	type MarketNewsPreferenceWriteRepository,
} from "@/lib/email/market-news-preference-workflow";

const now = new Date("2026-08-10T12:00:00.000Z");

const recordingRepository = () => {
	const events: Array<{ operation: string; value: unknown }> = [];
	const repository: MarketNewsPreferenceWriteRepository = {
		writeLegacyEnabled: async (enabled) => {
			events.push({ operation: "legacy", value: enabled });
		},
		writeCommunicationSubscription: async (subscription) => {
			events.push({ operation: "communication", value: subscription });
		},
	};

	return { events, repository };
};

describe("market-news preference dual-write workflow", () => {
	it("records consent before mirroring daily rollback state", async () => {
		const { events, repository } = recordingRepository();

		await saveMarketNewsPreferenceWorkflow({
			frequency: "daily",
			categories: ["watchlist_news"],
			consentSource: "notification_settings",
			now,
			repository,
		});

		assert.deepEqual(events, [
			{
				operation: "communication",
				value: {
					stream: "market_news",
					status: "subscribed",
					frequency: "daily",
					categories: ["watchlist_news"],
					consentSource: "notification_settings",
					consentedAt: now,
					consentPolicyVersion: COMMUNICATION_POLICY_VERSION,
				},
			},
			{ operation: "legacy", value: true },
		]);
	});

	it("disables legacy rollback state before recording an unsubscribe", async () => {
		const { events, repository } = recordingRepository();

		await saveMarketNewsPreferenceWorkflow({
			frequency: "off",
			categories: ["general_market"],
			now,
			repository,
		});

		assert.deepEqual(events, [
			{
				operation: "communication",
				value: {
					stream: "market_news",
					status: "unsubscribed",
					frequency: "off",
					categories: ["general_market"],
					unsubscribedAt: now,
				},
			},
			{ operation: "legacy", value: false },
		]);
	});

	it("does not map a weekly preference to legacy daily rollback state", async () => {
		const { events, repository } = recordingRepository();

		await saveMarketNewsPreferenceWorkflow({
			frequency: "weekly",
			categories: ["earnings"],
			consentSource: "notification_settings",
			now,
			repository,
		});

		assert.equal(events[0].operation, "communication");
		assert.deepEqual(events[1], { operation: "legacy", value: false });
	});

	it("rejects a subscription without a consent source", async () => {
		const { repository } = recordingRepository();

		await assert.rejects(
			saveMarketNewsPreferenceWorkflow({
				frequency: "daily",
				categories: ["watchlist_news"],
				now,
				repository,
			}),
			/consent source/i,
		);
	});
});
