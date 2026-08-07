import {
	INVESTMENT_EXPERIENCE_OPTIONS,
	INVESTMENT_GOALS,
	PREFERRED_INDUSTRIES,
	PREFERRED_MARKETS,
	RISK_TOLERANCE_OPTIONS,
} from "@/lib/constants";

export const ONBOARDING_VERSION = 2;
export const ONBOARDING_TOTAL_STEPS = 3;
export const MAX_ONBOARDING_SELECTIONS = 3;

export type OnboardingInput = {
	country: string;
	investmentExperience: string;
	investmentGoals: string;
	riskTolerance: string;
	preferredMarkets: string[];
	preferredIndustries: string[];
};

export type ValidatedOnboardingData = OnboardingInput;
export type ValidatedOnboardingStepData = Partial<ValidatedOnboardingData>;

export type OnboardingUser = {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
};

export type OnboardingRepository = {
	saveCompletedProfile: (input: {
		userId: string;
		data: ValidatedOnboardingData;
		completedAt: Date;
		version: number;
	}) => Promise<void>;
	claimWelcomeEmail: (input: {
		userId: string;
		claimedAt: Date;
	}) => Promise<boolean>;
	releaseWelcomeEmailClaim: (input: {
		userId: string;
		claimedAt: Date;
	}) => Promise<void>;
};

export type WelcomeEmailQueue = {
	enqueue: (input: {
		eventId: string;
		user: Pick<OnboardingUser, "email" | "name">;
		profile: ValidatedOnboardingData;
	}) => Promise<void>;
};

export type CompleteOnboardingResult =
	| { success: true }
	| { success: false; error: string };

const optionValues = (options: readonly { value: string }[]) =>
	new Set(options.map((option) => option.value));

const allowedInvestmentExperiences = optionValues(
	INVESTMENT_EXPERIENCE_OPTIONS,
);
const allowedInvestmentGoals = optionValues(INVESTMENT_GOALS);
const allowedRiskTolerances = optionValues(RISK_TOLERANCE_OPTIONS);
const allowedPreferredMarkets = optionValues(PREFERRED_MARKETS);
const allowedPreferredIndustries = optionValues(PREFERRED_INDUSTRIES);

const getRecord = (data: unknown): Record<string, unknown> | null =>
	data !== null && typeof data === "object"
		? (data as Record<string, unknown>)
		: null;

const validateCountry = (value: unknown) => {
	if (typeof value !== "string") return null;
	const country = value.trim().toUpperCase();
	return /^[A-Z]{2}$/.test(country) ? country : null;
};

const validateOption = (value: unknown, allowed: Set<string>) =>
	typeof value === "string" && allowed.has(value) ? value : null;

const validateSelections = (value: unknown, allowed: Set<string>) => {
	if (!Array.isArray(value)) return null;

	const selections = value.map((selection) =>
		typeof selection === "string" ? selection.trim() : "",
	);
	const uniqueSelections = [...new Set(selections)];

	if (
		uniqueSelections.length !== selections.length ||
		uniqueSelections.length < 1 ||
		uniqueSelections.length > MAX_ONBOARDING_SELECTIONS ||
		uniqueSelections.some((selection) => !allowed.has(selection))
	) {
		return null;
	}

	return uniqueSelections;
};

export const validateOnboardingStep = (
	step: number,
	input: unknown,
):
	| { success: true; data: ValidatedOnboardingStepData }
	| { success: false; error: string } => {
	const data = getRecord(input);
	if (!data || !Number.isInteger(step) || step < 1 || step > 2) {
		return { success: false, error: "Unable to save this onboarding step." };
	}

	if (step === 1) {
		const country = validateCountry(data.country);
		if (!country) {
			return { success: false, error: "Please select a valid country." };
		}

		const investmentExperience = validateOption(
			data.investmentExperience,
			allowedInvestmentExperiences,
		);
		if (!investmentExperience) {
			return {
				success: false,
				error: "Please select your investment experience.",
			};
		}

		return { success: true, data: { country, investmentExperience } };
	}

	const investmentGoals = validateOption(
		data.investmentGoals,
		allowedInvestmentGoals,
	);
	if (!investmentGoals) {
		return { success: false, error: "Please select a valid investment goal." };
	}

	const riskTolerance = validateOption(
		data.riskTolerance,
		allowedRiskTolerances,
	);
	if (!riskTolerance) {
		return { success: false, error: "Please select a valid risk tolerance." };
	}

	return { success: true, data: { investmentGoals, riskTolerance } };
};

export const validateOnboardingData = (
	input: unknown,
):
	| { success: true; data: ValidatedOnboardingData }
	| { success: false; error: string } => {
	const data = getRecord(input);
	if (!data) {
		return { success: false, error: "Please complete every onboarding field." };
	}

	const firstStep = validateOnboardingStep(1, data);
	if (!firstStep.success) return firstStep;

	const secondStep = validateOnboardingStep(2, data);
	if (!secondStep.success) return secondStep;

	const markets = validateSelections(
		data.preferredMarkets,
		allowedPreferredMarkets,
	);
	if (!markets) {
		return {
			success: false,
			error: `Select between 1 and ${MAX_ONBOARDING_SELECTIONS} valid markets.`,
		};
	}

	const industries = validateSelections(
		data.preferredIndustries,
		allowedPreferredIndustries,
	);
	if (!industries) {
		return {
			success: false,
			error: `Select between 1 and ${MAX_ONBOARDING_SELECTIONS} valid industries.`,
		};
	}

	return {
		success: true,
		data: {
			country: firstStep.data.country!,
			investmentExperience: firstStep.data.investmentExperience!,
			investmentGoals: secondStep.data.investmentGoals!,
			riskTolerance: secondStep.data.riskTolerance!,
			preferredMarkets: markets,
			preferredIndustries: industries,
		},
	};
};

export const createOnboardingDefaults = (
	profile?: Partial<OnboardingInput> & {
		preferredIndustry?: string;
		onboardingStep?: number;
		onboardingCompletedAt?: Date | null;
	},
) => {
	const preferredIndustriesValue =
		profile?.preferredIndustries?.filter((value) =>
			allowedPreferredIndustries.has(value),
		) ?? [];
	const preferredMarketsValue =
		profile?.preferredMarkets?.filter((value) =>
			allowedPreferredMarkets.has(value),
		) ?? [];
	const legacyIndustry = validateOption(
		profile?.preferredIndustry,
		allowedPreferredIndustries,
	);
	const onboardingStep = profile?.onboardingStep;

	return {
		data: {
			country: validateCountry(profile?.country) ?? "US",
			investmentExperience:
				validateOption(
					profile?.investmentExperience,
					allowedInvestmentExperiences,
				) ?? "Beginner",
			investmentGoals:
				validateOption(profile?.investmentGoals, allowedInvestmentGoals) ??
				"Growth",
			riskTolerance:
				validateOption(profile?.riskTolerance, allowedRiskTolerances) ??
				"Medium",
			preferredMarkets:
				preferredMarketsValue.length > 0
					? [...new Set(preferredMarketsValue)].slice(
							0,
							MAX_ONBOARDING_SELECTIONS,
						)
					: ["US Stocks"],
			preferredIndustries:
				preferredIndustriesValue.length > 0
					? [...new Set(preferredIndustriesValue)].slice(
							0,
							MAX_ONBOARDING_SELECTIONS,
						)
					: [legacyIndustry ?? "Technology"],
		} satisfies OnboardingInput,
		step:
			typeof onboardingStep === "number" &&
			onboardingStep >= 1 &&
			onboardingStep <= ONBOARDING_TOTAL_STEPS
				? onboardingStep
				: 1,
		completed: Boolean(profile?.onboardingCompletedAt),
	};
};

export const completeOnboardingWorkflow = async ({
	user,
	formData,
	repository,
	welcomeEmailQueue,
	completedAt = new Date(),
	queueWelcomeEmail = true,
	onQueueError,
}: {
	user: OnboardingUser;
	formData: unknown;
	repository: OnboardingRepository;
	welcomeEmailQueue: WelcomeEmailQueue;
	completedAt?: Date;
	queueWelcomeEmail?: boolean;
	onQueueError?: (error: unknown) => void;
}): Promise<CompleteOnboardingResult> => {
	if (!user.emailVerified) {
		return { success: false, error: "Verify your email before continuing." };
	}

	const validated = validateOnboardingData(formData);
	if (!validated.success) return validated;

	await repository.saveCompletedProfile({
		userId: user.id,
		data: validated.data,
		completedAt,
		version: ONBOARDING_VERSION,
	});

	const claimed = queueWelcomeEmail
		? await repository.claimWelcomeEmail({
				userId: user.id,
				claimedAt: completedAt,
			})
		: false;

	if (claimed) {
		try {
			await welcomeEmailQueue.enqueue({
				eventId: `onboarding-completed-${user.id}`,
				user: { email: user.email, name: user.name },
				profile: validated.data,
			});
		} catch (error) {
			await repository.releaseWelcomeEmailClaim({
				userId: user.id,
				claimedAt: completedAt,
			});
			onQueueError?.(error);
		}
	}

	return { success: true };
};
