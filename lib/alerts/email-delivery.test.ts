import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	deliverPendingAlertEmails,
	type AlertEmailDeliveryStore,
	type AlertEmailJob,
} from "@/lib/alerts/email-delivery";

function job(id = "event-1"): AlertEmailJob {
	return {
		id,
		userId: "user-1",
		source: "market",
		operator: "crosses_above",
		threshold: "100",
		observedValue: "101",
		triggeredAt: new Date("2026-08-01T12:00:00.000Z"),
		instrument: {
			displaySymbol: "TEST",
			name: "Test Instrument",
			quoteCurrency: "USD",
		},
		attempt: 1,
		leaseId: "lease-1",
	};
}

function storeFor(jobs: AlertEmailJob[]) {
	const sent: string[] = [];
	const failed: Array<{ id: string; error: string }> = [];
	const store: AlertEmailDeliveryStore = {
		async claimNext() {
			return jobs.shift() ?? null;
		},
		async markSent(claimed) {
			sent.push(claimed.id);
			return true;
		},
		async markFailed(claimed, error) {
			failed.push({ id: claimed.id, error });
			return true;
		},
	};
	return { store, sent, failed };
}

describe("alert email outbox delivery", () => {
	it("resolves the recipient from the immutable owner and records success", async () => {
		const state = storeFor([job()]);
		const recipients: string[] = [];
		const delivered: string[] = [];

		const summary = await deliverPendingAlertEmails(
			state.store,
			{
				async findByUserId(userId) {
					recipients.push(userId);
					return { email: "owner@example.com" };
				},
			},
			{
				async send(claimed, recipient) {
					delivered.push(`${claimed.id}:${recipient.email}`);
				},
			},
		);

		assert.deepEqual(recipients, ["user-1"]);
		assert.deepEqual(delivered, ["event-1:owner@example.com"]);
		assert.deepEqual(state.sent, ["event-1"]);
		assert.deepEqual(summary, {
			claimed: 1,
			sent: 1,
			failed: 0,
			conflicts: 0,
		});
	});

	it("records a retryable failure when the owner has no email", async () => {
		const state = storeFor([job()]);
		const summary = await deliverPendingAlertEmails(
			state.store,
			{ async findByUserId() { return null; } },
			{ async send() { assert.fail("send must not be called"); } },
		);

		assert.equal(state.failed.length, 1);
		assert.match(state.failed[0].error, /no deliverable email/i);
		assert.equal(summary.failed, 1);
	});

	it("isolates delivery failures and continues through the batch", async () => {
		const state = storeFor([job("bad"), job("good")]);
		const summary = await deliverPendingAlertEmails(
			state.store,
			{ async findByUserId() { return { email: "owner@example.com" }; } },
			{
				async send(claimed) {
					if (claimed.id === "bad") throw new Error("SMTP unavailable");
				},
			},
		);

		assert.deepEqual(state.sent, ["good"]);
		assert.deepEqual(state.failed, [{ id: "bad", error: "SMTP unavailable" }]);
		assert.equal(summary.sent, 1);
		assert.equal(summary.failed, 1);
	});
});
