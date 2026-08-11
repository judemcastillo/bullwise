import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createEmailEventWebhookSignature,
	isEmailEventWebhookSecretConfigured,
	isPermanentRecipientSmtpFailure,
	parseEmailSuppressionEvent,
	verifyEmailEventWebhook,
} from "@/lib/email/suppression-policy";

const secret = "0123456789abcdef0123456789abcdef";
const now = new Date("2026-08-11T12:00:00.000Z");
const timestamp = String(Math.floor(now.getTime() / 1000));

describe("email suppression event policy", () => {
	it("normalizes valid hard-bounce and complaint events", () => {
		assert.deepEqual(
			parseEmailSuppressionEvent({
				eventId: " evt-1 ",
				type: "hard_bounce",
				email: " User@Example.COM ",
				provider: " Provider-1 ",
				occurredAt: "2026-08-11T11:59:00.000Z",
			}),
			{
				success: true,
				data: {
					eventId: "evt-1",
					type: "hard_bounce",
					source: "provider_webhook",
					email: "user@example.com",
					provider: "provider-1",
					occurredAt: new Date("2026-08-11T11:59:00.000Z"),
				},
			},
		);

		assert.equal(
			parseEmailSuppressionEvent({
				eventId: "evt-2",
				type: "complaint",
				email: "user@example.com",
				provider: "provider",
				occurredAt: "2026-08-11T11:59:00.000Z",
			}).success,
			true,
		);
	});

	it("rejects soft bounces and malformed recipient events", () => {
		for (const input of [
			{
				eventId: "evt-1",
				type: "soft_bounce",
				email: "user@example.com",
				provider: "provider",
				occurredAt: now.toISOString(),
			},
			{
				eventId: "evt-1",
				type: "hard_bounce",
				email: "not-an-email",
				provider: "provider",
				occurredAt: now.toISOString(),
			},
			{
				eventId: "evt-1",
				type: "complaint",
				email: "user@example.com",
				provider: "bad provider",
				occurredAt: "not-a-date",
			},
		]) {
			assert.equal(parseEmailSuppressionEvent(input).success, false);
		}
	});
});

describe("email event webhook authentication", () => {
	it("requires a non-placeholder secret with at least 32 bytes", () => {
		assert.equal(isEmailEventWebhookSecretConfigured(secret), true);
		assert.equal(isEmailEventWebhookSecretConfigured("too-short"), false);
		assert.equal(
			isEmailEventWebhookSecretConfigured(
				"replace-with-output-of-openssl-rand-base64-32",
			),
			false,
		);
	});

	it("accepts an untampered, current signature", () => {
		const body = '{"eventId":"evt-1"}';
		const signature = createEmailEventWebhookSignature({
			body,
			timestamp,
			secret,
		});

		assert.equal(
			verifyEmailEventWebhook({ body, timestamp, signature, secret, now }),
			true,
		);
	});

	it("rejects tampering, replayed requests, future requests, and weak secrets", () => {
		const body = '{"eventId":"evt-1"}';
		const signature = createEmailEventWebhookSignature({
			body,
			timestamp,
			secret,
		});

		assert.equal(
			verifyEmailEventWebhook({
				body: `${body} `,
				timestamp,
				signature,
				secret,
				now,
			}),
			false,
		);
		assert.equal(
			verifyEmailEventWebhook({
				body,
				timestamp,
				signature,
				secret,
				now: new Date(now.getTime() + 5 * 60_000 + 1),
			}),
			false,
		);
		assert.equal(
			verifyEmailEventWebhook({
				body,
				timestamp: String(Math.floor(now.getTime() / 1000) + 61),
				signature,
				secret,
				now,
			}),
			false,
		);
		assert.equal(
			verifyEmailEventWebhook({
				body,
				timestamp,
				signature,
				secret: "too-short",
				now,
			}),
			false,
		);
	});
});

describe("Gmail SMTP hard-bounce classification", () => {
	it("recognizes permanent recipient-address failures", () => {
		assert.equal(
			isPermanentRecipientSmtpFailure(
				{
					responseCode: 550,
					response: "550 5.1.1 The email account does not exist",
					rejected: ["User@Example.com"],
				},
				"user@example.com",
			),
			true,
		);
	});

	it("does not suppress temporary, policy, or different-recipient failures", () => {
		for (const error of [
			{ responseCode: 452, response: "452 4.2.2 Mailbox full" },
			{ responseCode: 550, response: "550 5.7.1 Message rejected as spam" },
			{
				responseCode: 550,
				response: "550 5.1.1 The email account does not exist",
				rejected: ["another@example.com"],
			},
		]) {
			assert.equal(
				isPermanentRecipientSmtpFailure(error, "user@example.com"),
				false,
			);
		}
	});
});
