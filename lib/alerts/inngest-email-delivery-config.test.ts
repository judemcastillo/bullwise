import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALERT_EMAIL_DELIVERY_CRON,
	ALERT_EMAIL_DELIVERY_EVENT,
	ALERT_EMAIL_DELIVERY_FUNCTION_CONFIG,
} from "@/lib/inngest/alert-email-delivery.config";

describe("alert email delivery Inngest config", () => {
	it("supports scheduled and manual durable outbox delivery", () => {
		assert.equal(ALERT_EMAIL_DELIVERY_CRON, "* * * * *");
		assert.deepEqual(ALERT_EMAIL_DELIVERY_FUNCTION_CONFIG.triggers, [
			{ cron: ALERT_EMAIL_DELIVERY_CRON },
			{ event: ALERT_EMAIL_DELIVERY_EVENT },
		]);
		assert.equal(ALERT_EMAIL_DELIVERY_FUNCTION_CONFIG.concurrency, 1);
		assert.deepEqual(ALERT_EMAIL_DELIVERY_FUNCTION_CONFIG.singleton, {
			mode: "skip",
		});
	});
});
