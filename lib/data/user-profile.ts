import "server-only";

import { connectToDatabase } from "@/database/mongoose";
import UserProfile from "@/database/models/user-profile.model";
import { createOnboardingDefaults } from "@/lib/onboarding/service";
import { cache } from "react";

export const hasCompletedOnboarding = cache(async (userId: string) => {
	await connectToDatabase();

	const profile = await UserProfile.exists({
		userId,
		onboardingCompletedAt: { $ne: null },
	});

	return Boolean(profile);
});

export const getOnboardingProfile = async (userId: string) => {
	await connectToDatabase();

	const profile = await UserProfile.findOne({ userId }).lean();
	return createOnboardingDefaults(
		profile
			? {
					country: profile.country,
					investmentExperience: profile.investmentExperience,
					investmentGoals: profile.investmentGoals,
					riskTolerance: profile.riskTolerance,
					preferredMarkets: profile.preferredMarkets,
					preferredIndustries: profile.preferredIndustries,
					preferredIndustry: profile.preferredIndustry,
					onboardingStep: profile.onboardingStep,
					onboardingCompletedAt: profile.onboardingCompletedAt,
				}
			: undefined,
	);
};
