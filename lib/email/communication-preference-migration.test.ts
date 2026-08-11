import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createLegacyCommunicationPreferenceSeed } from "@/lib/email/communication-preference-migration";

const migratedAt = new Date("2026-08-10T12:00:00.000Z");

describe("legacy communication-preference migration", () => {
	it("does not invent consent for a previously enabled profile", () => {
		const seed = createLegacyCommunicationPreferenceSeed({
			profile: { userId: "legacy-enabled", dailyNewsEmailEnabled: true },
			migratedAt,
		});
		const marketNews = seed.subscriptions.find(
			({ stream }) => stream === "market_news",
		);

		assert.equal(marketNews?.status, "unknown");
		assert.equal(marketNews?.frequency, "off");
		assert.equal(marketNews?.consentedAt, undefined);
		assert.equal(marketNews?.consentSource, undefined);
	});

	it("maps an explicit legacy opt-out and preserves its timestamp", () => {
		const unsubscribedAt = new Date("2026-07-01T00:00:00.000Z");
		const seed = createLegacyCommunicationPreferenceSeed({
			profile: {
				userId: "legacy-unsubscribed",
				dailyNewsEmailEnabled: false,
				dailyNewsEmailUnsubscribedAt: unsubscribedAt,
			},
			migratedAt,
		});
		const marketNews = seed.subscriptions.find(
			({ stream }) => stream === "market_news",
		);

		assert.equal(marketNews?.status, "unsubscribed");
		assert.equal(marketNews?.frequency, "off");
		assert.equal(marketNews?.unsubscribedAt, unsubscribedAt);
	});

	it("uses the migration time when a legacy opt-out has no timestamp", () => {
		const seed = createLegacyCommunicationPreferenceSeed({
			profile: {
				userId: "legacy-unsubscribed-without-date",
				dailyNewsEmailEnabled: false,
			},
			migratedAt,
		});
		const marketNews = seed.subscriptions.find(
			({ stream }) => stream === "market_news",
		);

		assert.equal(marketNews?.unsubscribedAt, migratedAt);
		assert.deepEqual(seed.legacyMigration, {
			source: "user_profile_v1",
			migratedAt,
		});
	});

	it("keeps product updates unknown and off", () => {
		const seed = createLegacyCommunicationPreferenceSeed({
			profile: { userId: "legacy-user" },
			migratedAt,
		});
		const productUpdates = seed.subscriptions.find(
			({ stream }) => stream === "product_updates",
		);

		assert.deepEqual(productUpdates, {
			stream: "product_updates",
			status: "unknown",
			frequency: "off",
			categories: [],
		});
	});
});

