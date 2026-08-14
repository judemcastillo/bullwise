import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
	ALERT_EMAIL_DELIVERY_CRON,
	ALERT_EMAIL_DELIVERY_EVENT,
	ALERT_EMAIL_DELIVERY_FUNCTION_CONFIG,
} from "@/lib/inngest/alert-email-delivery.config";

const getMonitorPriceAlertsSource = () => {
	const source = readFileSync(
		new URL("../inngest/functions.ts", import.meta.url),
		"utf8",
	);
	const start = source.indexOf("export const monitorPriceAlerts");
	const end = source.indexOf("export const sendSignUpEmail", start);

	assert.ok(start >= 0);
	assert.ok(end > start);
	return source.slice(start, end);
};

describe("alert email delivery Inngest config", () => {
	it("keeps one-minute scheduled delivery as a recovery fallback", () => {
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

	it("requests immediate delivery after one or more alerts trigger", () => {
		const source = getMonitorPriceAlertsSource();
		const monitorStep = source.indexOf('step.run("monitor-due-price-alerts"');
		const deliveryStep = source.indexOf(
			'step.sendEvent("request-alert-email-delivery"',
		);

		assert.match(source, /if \(summary\.triggered > 0\) \{/);
		assert.match(source, /name: ALERT_EMAIL_DELIVERY_EVENT/);
		assert.ok(monitorStep >= 0);
		assert.ok(deliveryStep > monitorStep);
	});

	it("does not request immediate delivery when nothing triggers", () => {
		const source = getMonitorPriceAlertsSource();
		const conditionalDelivery =
			/if \(summary\.triggered > 0\) \{\s*await step\.sendEvent\(\s*"request-alert-email-delivery",\s*\{\s*name: ALERT_EMAIL_DELIVERY_EVENT,\s*data: \{\},\s*\}\s*\);\s*\}/;

		assert.match(source, conditionalDelivery);
		assert.equal(source.match(/step\.sendEvent\(/g)?.length, 1);
	});
});
