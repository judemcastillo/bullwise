import assert from "node:assert/strict";
import { describe, it } from "node:test";
import VerificationEmailRateLimit from "@/database/models/verification-email-rate-limit.model";
import {
	createRateLimitedVerificationEmailSender,
	createVerificationEmailIdentifier,
	evaluateVerificationEmailLimit,
	MAX_VERIFICATION_EMAILS_PER_WINDOW,
	VERIFICATION_EMAIL_COOLDOWN_SECONDS,
} from "@/lib/auth/verification-email-policy";

const atSeconds = (seconds: number) => new Date(seconds * 1000);

describe("verification email resend policy", () => {
	it("enforces a full 60-second cooldown", () => {
		const first = evaluateVerificationEmailLimit([], atSeconds(0));
		assert.equal(first.allowed, true);

		const tooSoon = evaluateVerificationEmailLimit(
			first.attempts,
			atSeconds(VERIFICATION_EMAIL_COOLDOWN_SECONDS - 1),
		);
		assert.deepEqual(tooSoon, {
			allowed: false,
			attempts: [atSeconds(0)],
			retryAfterSeconds: 1,
		});

		const afterCooldown = evaluateVerificationEmailLimit(
			first.attempts,
			atSeconds(VERIFICATION_EMAIL_COOLDOWN_SECONDS),
		);
		assert.equal(afterCooldown.allowed, true);
	});

	it("allows at most five deliveries in a rolling hour", () => {
		let attempts: Date[] = [];

		for (let index = 0; index < MAX_VERIFICATION_EMAILS_PER_WINDOW; index++) {
			const decision = evaluateVerificationEmailLimit(
				attempts,
				atSeconds(index * VERIFICATION_EMAIL_COOLDOWN_SECONDS),
			);
			assert.equal(decision.allowed, true);
			attempts = decision.attempts;
		}

		const limited = evaluateVerificationEmailLimit(attempts, atSeconds(300));
		assert.equal(limited.allowed, false);
		if (limited.allowed) assert.fail("Expected the hourly limit to apply");
		assert.equal(limited.retryAfterSeconds, 3300);

		const nextWindow = evaluateVerificationEmailLimit(attempts, atSeconds(3601));
		assert.equal(nextWindow.allowed, true);
	});

	it("uses the same opaque identifier for normalized email variants", () => {
		const secret = "test-secret";
		assert.equal(
			createVerificationEmailIdentifier(" User@Example.com ", secret),
			createVerificationEmailIdentifier("user@example.com", secret),
		);
		assert.doesNotMatch(
			createVerificationEmailIdentifier("user@example.com", secret),
			/user|example/i,
		);
	});

	it("suppresses delivery when quota cannot be consumed", async () => {
		const delivered: string[] = [];
		const sender = createRateLimitedVerificationEmailSender({
			consumeQuota: async () => false,
			deliver: async ({ email }) => {
				delivered.push(email);
			},
		});

		const result = await sender({
			email: "user@example.com",
			name: "Test User",
			url: "http://localhost:3000/api/auth/verify-email?token=test",
		});

		assert.deepEqual(result, { sent: false });
		assert.deepEqual(delivered, []);
	});

	it("delivers after successfully consuming quota", async () => {
		const delivered: string[] = [];
		const sender = createRateLimitedVerificationEmailSender({
			consumeQuota: async () => true,
			deliver: async ({ email }) => {
				delivered.push(email);
			},
		});

		const result = await sender({
			email: "user@example.com",
			name: "Test User",
			url: "http://localhost:3000/api/auth/verify-email?token=test",
		});

		assert.deepEqual(result, { sent: true });
		assert.deepEqual(delivered, ["user@example.com"]);
	});

	it("persists one limiter per email and expires stale limiter data", () => {
		const indexes = VerificationEmailRateLimit.schema.indexes() as Array<
			[Record<string, number>, { unique?: boolean; expireAfterSeconds?: number }]
		>;
		const identifierIndex = indexes.find(([fields]) => fields.identifier === 1);
		const expirationIndex = indexes.find(([fields]) => fields.expiresAt === 1);

		assert.equal(identifierIndex?.[1].unique, true);
		assert.equal(expirationIndex?.[1].expireAfterSeconds, 0);
	});
});
