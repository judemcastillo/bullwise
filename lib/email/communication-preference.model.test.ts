import assert from "node:assert/strict";
import { describe, it } from "node:test";
import CommunicationPreference from "@/database/models/communication-preference.model";
import {
	COMMUNICATION_POLICY_VERSION,
	COMMUNICATION_PREFERENCE_SCHEMA_VERSION,
} from "@/lib/email/communication-policy";

const validSubscription = () => ({
	stream: "market_news" as const,
	status: "subscribed" as const,
	frequency: "daily" as const,
	categories: ["watchlist_news" as const],
	consentSource: "preference_center" as const,
	consentedAt: new Date("2026-08-10T00:00:00.000Z"),
	consentPolicyVersion: COMMUNICATION_POLICY_VERSION,
});

describe("CommunicationPreference model", () => {
	it("accepts an auditable optional-email consent record", async () => {
		const preference = new CommunicationPreference({
			userId: "model-user",
			subscriptions: [validSubscription()],
		});

		await assert.doesNotReject(preference.validate());
		assert.equal(
			preference.schemaVersion,
			COMMUNICATION_PREFERENCE_SCHEMA_VERSION,
		);
	});

	it("rejects subscribed records without complete consent evidence", async () => {
		const subscription = validSubscription();
		Reflect.deleteProperty(subscription, "consentSource");
		const preference = new CommunicationPreference({
			userId: "missing-consent-user",
			subscriptions: [subscription],
		});

		await assert.rejects(preference.validate(), /complete consent state/i);
	});

	it("requires unsubscribed records to be off and timestamped", async () => {
		const preference = new CommunicationPreference({
			userId: "invalid-unsubscribe-user",
			subscriptions: [
				{
					stream: "market_news",
					status: "unsubscribed",
					frequency: "daily",
					categories: ["watchlist_news"],
				},
			],
		});

		await assert.rejects(preference.validate(), /complete consent state/i);
	});

	it("rejects duplicate streams and product categories", async () => {
		const duplicateStreams = new CommunicationPreference({
			userId: "duplicate-stream-user",
			subscriptions: [validSubscription(), validSubscription()],
		});
		const invalidProductCategories = new CommunicationPreference({
			userId: "product-category-user",
			subscriptions: [
				{
					stream: "product_updates",
					status: "unknown",
					frequency: "off",
					categories: ["general_market"],
				},
			],
		});

		await assert.rejects(duplicateStreams.validate(), /unique streams/i);
		await assert.rejects(invalidProductCategories.validate(), /complete consent state/i);
	});

	it("rejects duplicate market-news categories", async () => {
		const subscription = validSubscription();
		subscription.categories = ["watchlist_news", "watchlist_news"];
		const preference = new CommunicationPreference({
			userId: "duplicate-category-user",
			subscriptions: [subscription],
		});

		await assert.rejects(preference.validate(), /complete consent state/i);
	});

	it("defines one preference document per user", () => {
		const indexes = CommunicationPreference.schema.indexes() as Array<
			[Record<string, number>, { unique?: boolean }]
		>;
		const userIndex = indexes.find(([fields]) => fields.userId === 1);

		assert.ok(userIndex);
		assert.equal(userIndex[1].unique, true);
	});

	it("indexes frequency-filtered recipient pagination", () => {
		const indexes = CommunicationPreference.schema.indexes() as Array<
			[Record<string, number>, { unique?: boolean }]
		>;
		const deliveryIndex = indexes.find(
			([fields]) =>
				fields["subscriptions.stream"] === 1 &&
				fields["subscriptions.status"] === 1 &&
				fields["subscriptions.frequency"] === 1 &&
				fields.userId === 1,
		);

		assert.ok(deliveryIndex);
	});
});
