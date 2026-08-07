import type { BetterAuthOptions } from "better-auth";

type VerificationEmailSender = NonNullable<
	NonNullable<BetterAuthOptions["emailVerification"]>["sendVerificationEmail"]
>;

type CreateAuthOptionsInput = {
	database?: BetterAuthOptions["database"];
	secret: string;
	baseURL: string;
	googleClientId: string;
	googleClientSecret: string;
	sendVerificationEmail: VerificationEmailSender;
	verificationExpiresIn?: number;
};

export const createAuthOptions = ({
	database,
	secret,
	baseURL,
	googleClientId,
	googleClientSecret,
	sendVerificationEmail,
	verificationExpiresIn = 60 * 60,
}: CreateAuthOptionsInput) =>
	({
		database,
		secret,
		baseURL,
		socialProviders: {
			google: {
				clientId: googleClientId,
				clientSecret: googleClientSecret,
			},
		},
		account: {
			accountLinking: {
				enabled: true,
				disableImplicitLinking: false,
				// Require the OAuth provider to prove it verified the email instead
				// of bypassing that check through the trusted-provider allowlist.
				trustedProviders: [],
				// Better Auth currently defaults this to true and plans to make the
				// protection unconditional. Keep it explicit for this installed version.
				requireLocalEmailVerified: true,
				allowDifferentEmails: false,
				allowUnlinkingAll: false,
				updateUserInfoOnLink: false,
			},
		},
		emailVerification: {
			sendOnSignUp: true,
			sendOnSignIn: true,
			autoSignInAfterVerification: true,
			expiresIn: verificationExpiresIn,
			sendVerificationEmail,
		},
		emailAndPassword: {
			enabled: true,
			disableSignUp: false,
			requireEmailVerification: true,
			minPasswordLength: 8,
			maxPasswordLength: 128,
			autoSignIn: true,
		},
	}) satisfies BetterAuthOptions;
