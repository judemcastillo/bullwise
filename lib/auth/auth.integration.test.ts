import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { betterAuth } from "better-auth";
import { createAuthOptions } from "@/lib/better-auth/options";

const BASE_URL = "http://localhost:3000";
const AUTH_BASE_URL = `${BASE_URL}/api/auth`;
const TEST_SECRET = "test-secret-that-is-at-least-thirty-two-characters";

type TestAuth = {
	handler: (request: Request) => Promise<Response>;
};

type SentVerification = {
	user: { id: string; email: string; name: string; emailVerified: boolean };
	url: string;
	token: string;
};

type JsonObject = Record<string, unknown>;

const responseJson = async <T extends JsonObject>(response: Response) =>
	(await response.json()) as T;

const responseCookies = (response: Response) => {
	const headers = response.headers as Headers & {
		getSetCookie?: () => string[];
	};
	const setCookies =
		headers.getSetCookie?.() ??
		(response.headers.get("set-cookie")
			? [response.headers.get("set-cookie") as string]
			: []);

	return setCookies
		.map((cookie) => cookie.split(";", 1)[0])
		.filter(Boolean)
		.join("; ");
};

const post = (
	auth: TestAuth,
	path: string,
	body: JsonObject,
	cookie?: string,
) =>
	auth.handler(
		new Request(`${AUTH_BASE_URL}${path}`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				origin: BASE_URL,
				...(cookie ? { cookie } : {}),
			},
			body: JSON.stringify(body),
		}),
	);

const get = (auth: TestAuth, url: string, cookie?: string) =>
	auth.handler(
		new Request(url, {
			headers: cookie ? { cookie } : undefined,
		}),
	);

const createTestAuth = ({
	verificationExpiresIn,
	googleUser,
}: {
	verificationExpiresIn?: number;
	googleUser?: {
		id: string;
		email: string;
		name: string;
		emailVerified: boolean;
	};
} = {}) => {
	const sentVerifications: SentVerification[] = [];
	const options = createAuthOptions({
		secret: TEST_SECRET,
		baseURL: BASE_URL,
		googleClientId: "test-google-client",
		googleClientSecret: "test-google-secret",
		verificationExpiresIn,
		sendVerificationEmail: async ({ user, url, token }) => {
			sentVerifications.push({
				user: {
					id: user.id,
					email: user.email,
					name: user.name,
					emailVerified: user.emailVerified,
				},
				url,
				token,
			});
		},
	});

	if (googleUser) {
		Object.assign(options.socialProviders.google, {
			verifyIdToken: async () => true,
			getUserInfo: async () => ({
				user: googleUser,
				data: {},
			}),
		});
	}

	Object.assign(options, {
		logger: { disabled: true },
		rateLimit: { enabled: false },
	});

	return {
		auth: betterAuth(options),
		sentVerifications,
	};
};

describe("Better Auth account-linking policy", () => {
	it("keeps implicit same-email linking behind verified ownership checks", () => {
		const options = createAuthOptions({
			secret: TEST_SECRET,
			baseURL: BASE_URL,
			googleClientId: "test-google-client",
			googleClientSecret: "test-google-secret",
			sendVerificationEmail: async () => {},
		});

		assert.deepEqual(options.account?.accountLinking, {
			enabled: true,
			disableImplicitLinking: false,
			trustedProviders: [],
			requireLocalEmailVerified: true,
			allowDifferentEmails: false,
			allowUnlinkingAll: false,
			updateUserInfoOnLink: false,
		});
	});
});

const signUp = async (auth: TestAuth, email: string) => {
	const response = await post(auth, "/sign-up/email", {
		name: "Test Investor",
		email,
		password: "password123",
		callbackURL: `/verify-email?complete=1&email=${encodeURIComponent(email)}`,
	});
	const body = await responseJson<{
		token: string | null;
		user: { id: string; email: string; emailVerified: boolean };
	}>(response);

	return { response, body };
};

const beginGoogleSignIn = async (auth: TestAuth) => {
	const response = await post(auth, "/sign-in/social", {
		provider: "google",
		callbackURL: "/",
		newUserCallbackURL: "/onboarding",
		errorCallbackURL: "/sign-in",
	});
	const body = await responseJson<{ url: string; redirect: boolean }>(response);
	const state = new URL(body.url).searchParams.get("state");

	assert.ok(state);
	return { response, body, state, cookie: responseCookies(response) };
};

describe("password email verification", () => {
	it("requires verification, auto-signs in after verification, and safely replays", async () => {
		const { auth, sentVerifications } = createTestAuth();
		const email = "verification@example.com";
		const { response: signUpResponse, body: signUpBody } = await signUp(
			auth,
			email,
		);

		assert.equal(signUpResponse.status, 200);
		assert.equal(signUpBody.token, null);
		assert.equal(signUpBody.user.emailVerified, false);
		assert.equal(sentVerifications.length, 1);

		const blockedSignIn = await post(auth, "/sign-in/email", {
			email,
			password: "password123",
		});
		const blockedBody = await responseJson<{ code: string }>(blockedSignIn);

		assert.equal(blockedSignIn.status, 403);
		assert.equal(blockedBody.code, "EMAIL_NOT_VERIFIED");
		assert.equal(sentVerifications.length, 2);

		// The sign-up request supplies the application's verified-state callback.
		// A later blocked sign-in triggers a second email with Better Auth's default
		// callback, so verify the original sign-up link here.
		const verificationUrl = sentVerifications[0]?.url;
		assert.ok(verificationUrl);
		const verifiedResponse = await get(auth, verificationUrl);
		const sessionCookie = responseCookies(verifiedResponse);

		assert.equal(verifiedResponse.status, 302);
		assert.equal(
			verifiedResponse.headers.get("location"),
			"/verify-email?complete=1&email=verification%40example.com",
		);
		assert.match(sessionCookie, /better-auth\.session_token=/);

		const sessionResponse = await get(
			auth,
			`${AUTH_BASE_URL}/get-session`,
			sessionCookie,
		);
		const sessionBody = await responseJson<{
			user: { id: string; emailVerified: boolean };
		}>(sessionResponse);

		assert.equal(sessionBody.user.id, signUpBody.user.id);
		assert.equal(sessionBody.user.emailVerified, true);

		const replayResponse = await get(auth, verificationUrl);
		assert.equal(replayResponse.status, 302);
		assert.doesNotMatch(
			responseCookies(replayResponse),
			/better-auth\.session_token=/,
		);
	});

	it("redirects an expired verification token to the failure state", async () => {
		const { auth, sentVerifications } = createTestAuth({
			verificationExpiresIn: -1,
		});
		await signUp(auth, "expired@example.com");

		const verificationUrl = sentVerifications[0]?.url;
		assert.ok(verificationUrl);
		const response = await get(auth, verificationUrl);
		const location = response.headers.get("location") ?? "";

		assert.equal(response.status, 302);
		assert.match(location, /error=TOKEN_EXPIRED/);
		assert.doesNotMatch(responseCookies(response), /session_token=/);
	});
});

describe("Google OAuth callback recovery", () => {
	it("returns a denied Google flow to the inline sign-in error", async () => {
		const { auth } = createTestAuth();
		const flow = await beginGoogleSignIn(auth);
		const callback = await get(
			auth,
			`${AUTH_BASE_URL}/callback/google?error=access_denied&state=${encodeURIComponent(flow.state)}`,
			flow.cookie,
		);

		assert.equal(flow.body.redirect, true);
		assert.equal(callback.status, 302);
		assert.equal(callback.headers.get("location"), "/sign-in?error=access_denied");
	});

	it("rejects a tampered OAuth state", async () => {
		const { auth } = createTestAuth();
		const flow = await beginGoogleSignIn(auth);
		const callback = await get(
			auth,
			`${AUTH_BASE_URL}/callback/google?error=access_denied&state=tampered-${flow.state}`,
			flow.cookie,
		);

		assert.equal(callback.status, 302);
		assert.equal(
			callback.headers.get("location"),
			"/sign-in?error=state_mismatch",
		);
	});

	it("rejects an OAuth state after its ten-minute lifetime", async () => {
		const { auth } = createTestAuth();
		const flow = await beginGoogleSignIn(auth);
		const originalDateNow = Date.now;

		try {
			Date.now = () => originalDateNow() + 11 * 60 * 1000;
			const callback = await get(
				auth,
				`${AUTH_BASE_URL}/callback/google?error=access_denied&state=${encodeURIComponent(flow.state)}`,
				flow.cookie,
			);

			assert.equal(callback.status, 302);
			assert.match(
				callback.headers.get("location") ?? "",
				/error=state_mismatch$/,
			);
		} finally {
			Date.now = originalDateNow;
		}
	});
});

describe("Google and password account linking", () => {
	it("blocks an unverified local account, then links Google after verification", async () => {
		const email = "shared@example.com";
		const { auth, sentVerifications } = createTestAuth({
			googleUser: {
				id: "google-shared-user",
				email,
				name: "Shared User",
				emailVerified: true,
			},
		});
		const { body: localAccount } = await signUp(auth, email);

		const blockedLink = await post(auth, "/sign-in/social", {
			provider: "google",
			idToken: { token: "mock-google-token" },
		});
		const blockedBody = await responseJson<{
			code: string;
			message: string;
		}>(blockedLink);

		assert.equal(blockedLink.status, 401);
		assert.equal(blockedBody.code, "OAUTH_LINK_ERROR");
		assert.match(blockedBody.message, /account not linked/i);

		const verificationUrl = sentVerifications[0]?.url;
		assert.ok(verificationUrl);
		await get(auth, verificationUrl);

		const linkedResponse = await post(auth, "/sign-in/social", {
			provider: "google",
			idToken: { token: "mock-google-token" },
		});
		const linkedBody = await responseJson<{
			redirect: boolean;
			token: string;
			user: { id: string; email: string; emailVerified: boolean };
		}>(linkedResponse);

		assert.equal(linkedResponse.status, 200);
		assert.equal(linkedBody.redirect, false);
		assert.ok(linkedBody.token);
		assert.equal(linkedBody.user.id, localAccount.user.id);
		assert.equal(linkedBody.user.email, email);
		assert.equal(linkedBody.user.emailVerified, true);
	});
});
