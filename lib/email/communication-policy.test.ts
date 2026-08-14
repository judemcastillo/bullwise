import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	COMMUNICATION_PREFERENCE_SCHEMA_VERSION,
	COMMUNICATION_POLICY_VERSION,
	evaluateEmailEligibility,
	validateMarketNewsPreferenceInput,
	type CommunicationPreferenceSnapshot,
} from "@/lib/email/communication-policy";

const consentedAt = new Date("2026-08-10T00:00:00.000Z");

const subscribedPreference = (): CommunicationPreferenceSnapshot => ({
	userId: "user-1",
	schemaVersion: COMMUNICATION_PREFERENCE_SCHEMA_VERSION,
	subscriptions: [
		{
			stream: "market_news",
			status: "subscribed",
			frequency: "daily",
			categories: ["watchlist_news", "general_market"],
			consentSource: "preference_center",
			consentedAt,
			consentPolicyVersion: COMMUNICATION_POLICY_VERSION,
		},
		{
			stream: "product_updates",
			status: "unknown",
			frequency: "off",
			categories: [],
		},
	],
});

describe("market-news preference input", () => {
	it("accepts explicit frequency and category selections", () => {
		assert.deepEqual(
			validateMarketNewsPreferenceInput({
				frequency: "weekly",
				categories: ["watchlist_news", "earnings"],
			}),
			{
				success: true,
				data: {
					frequency: "weekly",
					categories: ["watchlist_news", "earnings"],
				},
			},
		);
	});

	it("allows off with no selected categories", () => {
		assert.deepEqual(
			validateMarketNewsPreferenceInput({ frequency: "off", categories: [] }),
			{ success: true, data: { frequency: "off", categories: [] } },
		);
	});

	it("rejects invalid, duplicate, and empty subscribed categories", () => {
		for (const input of [
			{ frequency: "hourly", categories: ["watchlist_news"] },
			{ frequency: "daily", categories: ["unknown"] },
			{
				frequency: "daily",
				categories: ["watchlist_news", "watchlist_news"],
			},
			{ frequency: "daily", categories: [] },
		]) {
			assert.equal(validateMarketNewsPreferenceInput(input).success, false);
		}
	});
});

describe("communication eligibility policy", () => {
	it("keeps transactional email independent from optional subscriptions", () => {
		for (const messageType of [
			"email_verification",
			"account_welcome",
			"account_security",
			"price_alert",
		] as const) {
			assert.deepEqual(
				evaluateEmailEligibility({ preference: null, request: { messageType } }),
				{ eligible: true, reason: "eligible" },
			);
		}
	});

	it("suppresses every class after account deletion", () => {
		for (const messageType of [
			"email_verification",
			"account_welcome",
			"account_security",
			"price_alert",
			"market_news",
			"product_updates",
		] as const) {
			const preference = subscribedPreference();
			preference.emailSuppression = {
				reason: "account_deleted",
				source: "account_lifecycle",
				recordedAt: consentedAt,
			};

			assert.deepEqual(
				evaluateEmailEligibility({
					preference,
					request: { messageType },
				}),
				{ eligible: false, reason: "account_deleted" },
			);
		}
	});

	it("suppresses every class after a hard bounce or complaint", () => {
		for (const reason of ["hard_bounce", "complaint"] as const) {
			const preference = subscribedPreference();
			preference.emailSuppression = {
				reason,
				source: "provider_webhook",
				recordedAt: consentedAt,
			};

			for (const messageType of [
				"email_verification",
				"account_welcome",
				"account_security",
				"price_alert",
				"market_news",
				"product_updates",
			] as const) {
				assert.deepEqual(
					evaluateEmailEligibility({ preference, request: { messageType } }),
					{ eligible: false, reason },
				);
			}
		}
	});

	it("requires an explicit, auditable optional-email subscription", () => {
		assert.deepEqual(
			evaluateEmailEligibility({
				preference: null,
				request: { messageType: "market_news" },
			}),
			{ eligible: false, reason: "missing_preference" },
		);

		const preference = subscribedPreference();
		preference.subscriptions[0].consentPolicyVersion = undefined;
		assert.deepEqual(
			evaluateEmailEligibility({
				preference,
				request: { messageType: "market_news" },
			}),
			{ eligible: false, reason: "invalid_consent_record" },
		);
	});

	it("returns the selected frequency for an enabled market-news category", () => {
		assert.deepEqual(
			evaluateEmailEligibility({
				preference: subscribedPreference(),
				request: {
					messageType: "market_news",
					category: "watchlist_news",
				},
			}),
			{ eligible: true, reason: "eligible", frequency: "daily" },
		);
	});

	it("rejects a category or optional stream that is not enabled", () => {
		assert.deepEqual(
			evaluateEmailEligibility({
				preference: subscribedPreference(),
				request: { messageType: "market_news", category: "earnings" },
			}),
			{ eligible: false, reason: "category_disabled" },
		);
		assert.deepEqual(
			evaluateEmailEligibility({
				preference: subscribedPreference(),
				request: { messageType: "product_updates" },
			}),
			{ eligible: false, reason: "not_subscribed" },
		);
	});
});
