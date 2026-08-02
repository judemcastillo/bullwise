import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALERT_MONITORING_CRON,
	ALERT_MONITORING_EVENT,
	ALERT_MONITORING_FUNCTION_CONFIG,
} from "@/lib/inngest/alert-monitoring.config";

describe("price alert Inngest configuration", () => {
	it("supports one-minute cron and manual development events", () => {
		assert.equal(ALERT_MONITORING_CRON, "* * * * *");
		assert.equal(ALERT_MONITORING_EVENT, "app/alerts.monitor.requested");
		assert.deepEqual(ALERT_MONITORING_FUNCTION_CONFIG.triggers, [
			{ cron: "* * * * *" },
			{ event: "app/alerts.monitor.requested" },
		]);
	});

	it("prevents overlapping runs and enables retries", () => {
		assert.equal(ALERT_MONITORING_FUNCTION_CONFIG.concurrency, 1);
		assert.deepEqual(ALERT_MONITORING_FUNCTION_CONFIG.singleton, {
			mode: "skip",
		});
		assert.equal(ALERT_MONITORING_FUNCTION_CONFIG.retries, 3);
	});
});
