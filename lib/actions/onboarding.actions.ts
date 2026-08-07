"use server";

import { connectToDatabase } from "@/database/mongoose";
import UserProfile from "@/database/models/user-profile.model";
import { EmailVerificationRequiredError } from "@/lib/auth/access-policy";
import { requireVerifiedUser } from "@/lib/auth/require-user";
import { inngest } from "@/lib/inngest/client";
import {
	completeOnboardingWorkflow,
	ONBOARDING_TOTAL_STEPS,
	validateOnboardingStep,
} from "@/lib/onboarding/service";

export const saveOnboardingProgress = async ({
	step,
	formData,
}: {
	step: number;
	formData: unknown;
}) => {
	try {
		const user = await requireVerifiedUser();

		const validated = validateOnboardingStep(step, formData);
		if (!validated.success) return validated;

		await connectToDatabase();
		const profile = await UserProfile.findOneAndUpdate(
			{ userId: user.id },
			{ $setOnInsert: { userId: user.id } },
			{ upsert: true, returnDocument: "after" },
		);
		if (profile.onboardingCompletedAt) {
			return { success: false, error: "Onboarding is already complete." };
		}

		profile.set({
			...validated.data,
			onboardingStep: Math.max(
				profile.onboardingStep,
				Math.min(step + 1, ONBOARDING_TOTAL_STEPS),
			),
		});
		await profile.save();

		return { success: true };
	} catch (error) {
		if (error instanceof EmailVerificationRequiredError) {
			return { success: false, error: error.message };
		}
		console.error("Failed to save onboarding progress", error);
		return {
			success: false,
			error: "Unable to save your progress. Please try again.",
		};
	}
};

export const completeOnboarding = async (formData: unknown) => {
	try {
		const user = await requireVerifiedUser();
		await connectToDatabase();
		const completedAt = new Date();
		const wasCompleted = Boolean(
			await UserProfile.exists({
				userId: user.id,
				onboardingCompletedAt: { $ne: null },
			}),
		);
		const welcomeEmailQueued = Boolean(
			await UserProfile.exists({
				userId: user.id,
				welcomeEmailQueuedAt: { $exists: true },
			}),
		);

		return await completeOnboardingWorkflow({
			user,
			formData,
			completedAt,
			queueWelcomeEmail: !welcomeEmailQueued,
			repository: {
				saveCompletedProfile: async ({
					userId,
					data,
					completedAt: profileCompletedAt,
					version,
				}) => {
					const profile = await UserProfile.findOneAndUpdate(
						{ userId },
						{ $setOnInsert: { userId } },
						{ upsert: true, returnDocument: "after" },
					);
					profile.set({
						...data,
						// Keep a compatibility mirror while older app instances or
						// development hot reloads may still use the version-1 schema.
						preferredIndustry: data.preferredIndustries[0],
						...(wasCompleted
							? {}
							: { onboardingCompletedAt: profileCompletedAt }),
						onboardingStep: ONBOARDING_TOTAL_STEPS,
						onboardingVersion: version,
					});
					await profile.save();
				},
				claimWelcomeEmail: async ({ userId, claimedAt }) => {
					const claimedProfile = await UserProfile.findOneAndUpdate(
						{ userId, welcomeEmailQueuedAt: { $exists: false } },
						{ $set: { welcomeEmailQueuedAt: claimedAt } },
						{ returnDocument: "after" },
					);
					return Boolean(claimedProfile);
				},
				releaseWelcomeEmailClaim: async ({ userId, claimedAt }) => {
					await UserProfile.updateOne(
						{ userId, welcomeEmailQueuedAt: claimedAt },
						{ $unset: { welcomeEmailQueuedAt: 1 } },
					);
				},
			},
			welcomeEmailQueue: {
				enqueue: async ({ eventId, user: eventUser, profile }) => {
					await inngest.send({
						id: eventId,
						name: "app/user.created",
						data: { ...eventUser, ...profile },
					});
				},
			},
			onQueueError: (error) => {
				console.error("Failed to queue onboarding welcome email", error);
			},
		});
	} catch (error) {
		if (error instanceof EmailVerificationRequiredError) {
			return { success: false, error: error.message };
		}
		console.error("Failed to complete onboarding", error);
		return {
			success: false,
			error: "Unable to save your preferences. Please try again.",
		};
	}
};
