import "server-only";

import { connectToDatabase } from "@/database/mongoose";
import VerificationEmailRateLimit from "@/database/models/verification-email-rate-limit.model";
import {
	createVerificationEmailIdentifier,
	evaluateVerificationEmailLimit,
	VERIFICATION_EMAIL_WINDOW_SECONDS,
} from "@/lib/auth/verification-email-policy";

const MAX_WRITE_ATTEMPTS = 5;

const isDuplicateKeyError = (error: unknown) =>
	Boolean(
		error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === 11000,
	);

export const consumeVerificationEmailQuota = async ({
	email,
	secret,
	now = new Date(),
}: {
	email: string;
	secret: string;
	now?: Date;
}) => {
	await connectToDatabase();

	const identifier = createVerificationEmailIdentifier(email, secret);
	const expiresAt = new Date(
		now.getTime() + VERIFICATION_EMAIL_WINDOW_SECONDS * 1000,
	);

	for (let writeAttempt = 0; writeAttempt < MAX_WRITE_ATTEMPTS; writeAttempt++) {
		let state = await VerificationEmailRateLimit.findOne({ identifier }).lean();

		if (!state) {
			try {
				state = await VerificationEmailRateLimit.create({
					identifier,
					attempts: [],
					revision: 0,
					expiresAt,
				});
			} catch (error) {
				if (isDuplicateKeyError(error)) continue;
				throw error;
			}
		}

		const decision = evaluateVerificationEmailLimit(state.attempts, now);
		if (!decision.allowed) return false;

		const update = await VerificationEmailRateLimit.updateOne(
			{ identifier, revision: state.revision },
			{
				$set: { attempts: decision.attempts, expiresAt },
				$inc: { revision: 1 },
			},
		);

		if (update.modifiedCount === 1) return true;
	}

	// Fail closed if unusually high contention prevents a quota claim.
	return false;
};
