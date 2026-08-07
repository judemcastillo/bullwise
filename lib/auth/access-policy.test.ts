import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	assertCompletedUser,
	assertVerifiedUser,
	EmailVerificationRequiredError,
	OnboardingRequiredError,
} from "@/lib/auth/access-policy";

const verifiedUser = {
	id: "user-123",
	name: "Test Investor",
	email: "investor@example.com",
	emailVerified: true,
};

describe("protected product access policy", () => {
	it("rejects an unverified authenticated user", async () => {
		let completionWasChecked = false;
		const user = { ...verifiedUser, emailVerified: false };

		assert.throws(
			() => assertVerifiedUser(user),
			EmailVerificationRequiredError,
		);
		await assert.rejects(
			() =>
				assertCompletedUser(user, async () => {
					completionWasChecked = true;
					return true;
				}),
			EmailVerificationRequiredError,
		);
		assert.equal(completionWasChecked, false);
	});

	it("rejects a verified user who has not completed onboarding", async () => {
		await assert.rejects(
			() => assertCompletedUser(verifiedUser, async () => false),
			OnboardingRequiredError,
		);
	});

	it("allows a verified user with completed onboarding", async () => {
		const authorized = await assertCompletedUser(
			verifiedUser,
			async (userId) => userId === verifiedUser.id,
		);

		assert.equal(authorized, verifiedUser);
	});
});
