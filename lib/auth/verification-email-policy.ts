import { createHmac } from "node:crypto";

export const VERIFICATION_EMAIL_COOLDOWN_SECONDS = 60;
export const VERIFICATION_EMAIL_WINDOW_SECONDS = 60 * 60;
export const MAX_VERIFICATION_EMAILS_PER_WINDOW = 5;

type VerificationEmailLimitDecision =
	| { allowed: true; attempts: Date[] }
	| { allowed: false; attempts: Date[]; retryAfterSeconds: number };

const secondsUntil = (future: Date, now: Date) =>
	Math.max(1, Math.ceil((future.getTime() - now.getTime()) / 1000));

export const evaluateVerificationEmailLimit = (
	attempts: Date[],
	now: Date,
): VerificationEmailLimitDecision => {
	const windowStart = now.getTime() - VERIFICATION_EMAIL_WINDOW_SECONDS * 1000;
	const activeAttempts = attempts
		.filter((attempt) => attempt.getTime() > windowStart)
		.sort((left, right) => left.getTime() - right.getTime());

	if (activeAttempts.length >= MAX_VERIFICATION_EMAILS_PER_WINDOW) {
		const oldestAttempt = activeAttempts[0];
		return {
			allowed: false,
			attempts: activeAttempts,
			retryAfterSeconds: secondsUntil(
				new Date(
					oldestAttempt.getTime() +
						VERIFICATION_EMAIL_WINDOW_SECONDS * 1000,
				),
				now,
			),
		};
	}

	const latestAttempt = activeAttempts.at(-1);
	if (
		latestAttempt &&
		now.getTime() - latestAttempt.getTime() <
			VERIFICATION_EMAIL_COOLDOWN_SECONDS * 1000
	) {
		return {
			allowed: false,
			attempts: activeAttempts,
			retryAfterSeconds: secondsUntil(
				new Date(
					latestAttempt.getTime() +
						VERIFICATION_EMAIL_COOLDOWN_SECONDS * 1000,
				),
				now,
			),
		};
	}

	return { allowed: true, attempts: [...activeAttempts, now] };
};

export const normalizeVerificationEmail = (email: string) =>
	email.trim().toLowerCase();

export const createVerificationEmailIdentifier = (
	email: string,
	secret: string,
) =>
	createHmac("sha256", secret)
		.update(normalizeVerificationEmail(email))
		.digest("hex");

export const createRateLimitedVerificationEmailSender = ({
	consumeQuota,
	deliver,
}: {
	consumeQuota: (email: string) => Promise<boolean>;
	deliver: (input: { email: string; name: string; url: string }) => Promise<void>;
}) =>
	async ({ email, name, url }: { email: string; name: string; url: string }) => {
		const allowed = await consumeQuota(email);
		if (!allowed) return { sent: false } as const;

		await deliver({ email, name, url });
		return { sent: true } as const;
	};
