import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, describe, it } from "node:test";
import {
	createDailyNewsUnsubscribeToken,
	createDailyNewsUnsubscribeUrls,
	verifyDailyNewsUnsubscribeToken,
} from "@/lib/email/unsubscribe-token";

const originalActiveKeyId = process.env.EMAIL_UNSUBSCRIBE_ACTIVE_KEY_ID;
const originalSigningKeys = process.env.EMAIL_UNSUBSCRIBE_KEYS;
const originalFallbackSecret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
const originalBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
const TEST_ACTIVE_KEY_ID = "test-2026-01";
const TEST_ACTIVE_SECRET = "test-only-unsubscribe-signing-secret-2026";

const setTestKeyring = ({
	activeKeyId = TEST_ACTIVE_KEY_ID,
	keys = { [TEST_ACTIVE_KEY_ID]: TEST_ACTIVE_SECRET },
}: {
	activeKeyId?: string;
	keys?: Record<string, string>;
} = {}) => {
	process.env.EMAIL_UNSUBSCRIBE_ACTIVE_KEY_ID = activeKeyId;
	process.env.EMAIL_UNSUBSCRIBE_KEYS = JSON.stringify(keys);
};

const signFixtureToken = ({
	keyId,
	secret,
	payload,
}: {
	keyId: string;
	secret: string;
	payload: Record<string, unknown>;
}) => {
	const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
		"base64url",
	);
	const signingInput = `v1.${keyId}.${encodedPayload}`;
	const signature = createHmac("sha256", secret)
		.update(signingInput)
		.digest("base64url");
	return `${signingInput}.${signature}`;
};

before(() => {
	setTestKeyring();
	process.env.NEXT_PUBLIC_BASE_URL = "https://bullwise.example/app/";
});

after(() => {
	if (originalActiveKeyId === undefined) {
		delete process.env.EMAIL_UNSUBSCRIBE_ACTIVE_KEY_ID;
	} else {
		process.env.EMAIL_UNSUBSCRIBE_ACTIVE_KEY_ID = originalActiveKeyId;
	}

	if (originalSigningKeys === undefined) {
		delete process.env.EMAIL_UNSUBSCRIBE_KEYS;
	} else {
		process.env.EMAIL_UNSUBSCRIBE_KEYS = originalSigningKeys;
	}

	if (originalBaseUrl === undefined) {
		delete process.env.NEXT_PUBLIC_BASE_URL;
	} else {
		process.env.NEXT_PUBLIC_BASE_URL = originalBaseUrl;
	}
});

describe("daily news unsubscribe tokens", () => {
	it("round-trips a versioned, purpose-bound user ID", () => {
		const now = new Date("2026-08-10T12:00:00.000Z");
		const token = createDailyNewsUnsubscribeToken("user-123", { now });
		const [version, keyId, encodedPayload] = token.split(".");
		const payload = JSON.parse(
			Buffer.from(encodedPayload, "base64url").toString("utf8"),
		) as Record<string, unknown>;

		assert.equal(
			verifyDailyNewsUnsubscribeToken(token, { now }),
			"user-123",
		);
		assert.notEqual(token, "user-123");
		assert.equal(version, "v1");
		assert.equal(keyId, TEST_ACTIVE_KEY_ID);
		assert.deepEqual(payload, {
			sub: "user-123",
			purpose: "unsubscribe",
			stream: "market_news",
			iat: 1_786_363_200,
			exp: 1_849_521_600,
		});
	});

	it("rejects changed and malformed tokens", () => {
		const token = createDailyNewsUnsubscribeToken("user-123");
		const lastCharacter = token.at(-1);
		const tamperedToken = `${token.slice(0, -1)}${lastCharacter === "A" ? "B" : "A"}`;

		assert.equal(verifyDailyNewsUnsubscribeToken(tamperedToken), null);
		assert.equal(verifyDailyNewsUnsubscribeToken("missing-signature"), null);
		assert.equal(verifyDailyNewsUnsubscribeToken("a.b.c"), null);
	});

	it("expires tokens exactly 24 calendar months after issuance", () => {
		const issuedAt = new Date("2028-02-29T12:00:00.000Z");
		const token = createDailyNewsUnsubscribeToken("user-123", { now: issuedAt });

		assert.equal(
			verifyDailyNewsUnsubscribeToken(token, {
				now: new Date("2030-02-28T11:59:59.000Z"),
			}),
			"user-123",
		);
		assert.equal(
			verifyDailyNewsUnsubscribeToken(token, {
				now: new Date("2030-02-28T12:00:00.000Z"),
			}),
			null,
		);
	});

	it("keeps retired keys valid until they are removed from the keyring", () => {
		const oldKeyId = "test-2025-01";
		const oldSecret = "test-only-unsubscribe-signing-secret-2025";
		const issuedAt = new Date("2026-01-01T00:00:00.000Z");

		try {
			setTestKeyring({
				activeKeyId: oldKeyId,
				keys: { [oldKeyId]: oldSecret },
			});
			const retiredKeyToken = createDailyNewsUnsubscribeToken("user-123", {
				now: issuedAt,
			});

			setTestKeyring({
				keys: {
					[oldKeyId]: oldSecret,
					[TEST_ACTIVE_KEY_ID]: TEST_ACTIVE_SECRET,
				},
			});
			assert.equal(
				verifyDailyNewsUnsubscribeToken(retiredKeyToken, {
					now: new Date("2027-01-01T00:00:00.000Z"),
				}),
				"user-123",
			);
			assert.match(
				createDailyNewsUnsubscribeToken("user-456", { now: issuedAt }),
				/^v1\.test-2026-01\./,
			);

			setTestKeyring();
			assert.equal(
				verifyDailyNewsUnsubscribeToken(retiredKeyToken, {
					now: new Date("2027-01-01T00:00:00.000Z"),
				}),
				null,
			);
		} finally {
			setTestKeyring();
		}
	});

	it("supports the documented single-key local fallback", () => {
		try {
			delete process.env.EMAIL_UNSUBSCRIBE_ACTIVE_KEY_ID;
			delete process.env.EMAIL_UNSUBSCRIBE_KEYS;
			process.env.EMAIL_UNSUBSCRIBE_SECRET =
				"test-only-local-fallback-signing-secret";

			const now = new Date("2026-08-10T12:00:00.000Z");
			const token = createDailyNewsUnsubscribeToken("user-123", { now });
			assert.match(token, /^v1\.default\./);
			assert.equal(
				verifyDailyNewsUnsubscribeToken(token, { now }),
				"user-123",
			);
		} finally {
			if (originalFallbackSecret === undefined) {
				delete process.env.EMAIL_UNSUBSCRIBE_SECRET;
			} else {
				process.env.EMAIL_UNSUBSCRIBE_SECRET = originalFallbackSecret;
			}
			setTestKeyring();
		}
	});

	it("rejects tokens issued beyond the allowed clock skew", () => {
		const verificationTime = new Date("2026-08-10T12:00:00.000Z");
		const withinSkew = createDailyNewsUnsubscribeToken("user-123", {
			now: new Date("2026-08-10T12:05:00.000Z"),
		});
		const beyondSkew = createDailyNewsUnsubscribeToken("user-123", {
			now: new Date("2026-08-10T12:05:01.000Z"),
		});

		assert.equal(
			verifyDailyNewsUnsubscribeToken(withinSkew, { now: verificationTime }),
			"user-123",
		);
		assert.equal(
			verifyDailyNewsUnsubscribeToken(beyondSkew, { now: verificationTime }),
			null,
		);
	});

	it("rejects tokens for another purpose, stream, or lifetime", () => {
		const issuedAt = 1_786_363_200;
		const expiresAt = 1_849_521_600;
		const verificationTime = new Date("2026-08-10T12:00:00.000Z");
		const basePayload = {
			sub: "user-123",
			purpose: "unsubscribe",
			stream: "market_news",
			iat: issuedAt,
			exp: expiresAt,
		};

		for (const payload of [
			{ ...basePayload, purpose: "sign_in" },
			{ ...basePayload, stream: "product_updates" },
			{ ...basePayload, exp: expiresAt + 1 },
		]) {
			const token = signFixtureToken({
				keyId: TEST_ACTIVE_KEY_ID,
				secret: TEST_ACTIVE_SECRET,
				payload,
			});
			assert.equal(
				verifyDailyNewsUnsubscribeToken(token, { now: verificationTime }),
				null,
			);
		}
	});

	it("creates separate confirmation and one-click endpoints", () => {
		const urls = createDailyNewsUnsubscribeUrls("user-123", {
			now: new Date("2026-08-10T12:00:00.000Z"),
		});
		const confirmationUrl = new URL(urls.confirmationUrl);
		const oneClickUrl = new URL(urls.oneClickUrl);

		assert.equal(confirmationUrl.pathname, "/app/unsubscribe");
		assert.equal(oneClickUrl.pathname, "/app/api/email/unsubscribe");
		assert.equal(urls.dashboardUrl, "https://bullwise.example/app/");
		assert.equal(
			confirmationUrl.searchParams.get("token"),
			oneClickUrl.searchParams.get("token"),
		);
	});
});
