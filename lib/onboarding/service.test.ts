import assert from "node:assert/strict";
import { describe, it } from "node:test";
import UserProfile from "@/database/models/user-profile.model";
import {
	completeOnboardingWorkflow,
	createOnboardingDefaults,
	ONBOARDING_VERSION,
	type OnboardingInput,
	type OnboardingRepository,
	type ValidatedOnboardingData,
	validateOnboardingStep,
	type WelcomeEmailQueue,
} from "@/lib/onboarding/service";

const validInput = (): OnboardingInput => ({
	country: "us",
	investmentExperience: "Intermediate",
	investmentGoals: "Growth",
	riskTolerance: "Medium",
	preferredMarkets: ["US Stocks", "ETFs"],
	preferredIndustries: ["Technology", "Healthcare"],
});

const verifiedUser = {
	id: "user-123",
	name: "Test Investor",
	email: "investor@example.com",
	emailVerified: true,
};

type SavedProfile = {
	data: ValidatedOnboardingData;
	completedAt: Date;
	version: number;
};

const createDependencies = () => {
	const profiles = new Map<string, SavedProfile>();
	const welcomeClaims = new Map<string, Date>();
	const queuedEvents: Array<{
		eventId: string;
		profile: ValidatedOnboardingData;
	}> = [];
	let failQueue = false;

	const repository: OnboardingRepository = {
		saveCompletedProfile: async ({ userId, data, completedAt, version }) => {
			profiles.set(userId, { data, completedAt, version });
		},
		claimWelcomeEmail: async ({ userId, claimedAt }) => {
			if (welcomeClaims.has(userId)) return false;
			welcomeClaims.set(userId, claimedAt);
			return true;
		},
		releaseWelcomeEmailClaim: async ({ userId, claimedAt }) => {
			if (welcomeClaims.get(userId)?.getTime() === claimedAt.getTime()) {
				welcomeClaims.delete(userId);
			}
		},
	};

	const welcomeEmailQueue: WelcomeEmailQueue = {
		enqueue: async ({ eventId, profile }) => {
			if (failQueue) throw new Error("queue unavailable");
			queuedEvents.push({ eventId, profile });
		},
	};

	return {
		profiles,
		welcomeClaims,
		queuedEvents,
		repository,
		welcomeEmailQueue,
		setQueueFailure(value: boolean) {
			failQueue = value;
		},
	};
};

describe("onboarding workflow", () => {
	it("rejects unverified users without writing profile data", async () => {
		const dependencies = createDependencies();
		const result = await completeOnboardingWorkflow({
			user: { ...verifiedUser, emailVerified: false },
			formData: validInput(),
			repository: dependencies.repository,
			welcomeEmailQueue: dependencies.welcomeEmailQueue,
		});

		assert.deepEqual(result, {
			success: false,
			error: "Verify your email before continuing.",
		});
		assert.equal(dependencies.profiles.size, 0);
		assert.equal(dependencies.queuedEvents.length, 0);
	});

	it("validates every submitted field before persistence", async () => {
		const invalidInputs: OnboardingInput[] = [
			{ ...validInput(), country: "USA" },
			{ ...validInput(), investmentExperience: "Expert" },
			{ ...validInput(), investmentGoals: "Gambling" },
			{ ...validInput(), riskTolerance: "Extreme" },
			{ ...validInput(), preferredMarkets: [] },
			{ ...validInput(), preferredMarkets: ["Unknown"] },
			{ ...validInput(), preferredIndustries: [] },
			{ ...validInput(), preferredIndustries: ["Unknown"] },
			{
				...validInput(),
				preferredIndustries: [
					"Technology",
					"Healthcare",
					"Finance",
					"Energy",
				],
			},
		];

		for (const formData of invalidInputs) {
			const dependencies = createDependencies();
			const result = await completeOnboardingWorkflow({
				user: verifiedUser,
				formData,
				repository: dependencies.repository,
				welcomeEmailQueue: dependencies.welcomeEmailQueue,
			});

			assert.equal(result.success, false);
			assert.equal(dependencies.profiles.size, 0);
			assert.equal(dependencies.queuedEvents.length, 0);
		}
	});

	it("persists a normalized completed profile and queues welcome email once", async () => {
		const dependencies = createDependencies();
		const completedAt = new Date("2026-08-07T08:00:00.000Z");
		const firstResult = await completeOnboardingWorkflow({
			user: verifiedUser,
			formData: validInput(),
			completedAt,
			repository: dependencies.repository,
			welcomeEmailQueue: dependencies.welcomeEmailQueue,
		});
		const secondResult = await completeOnboardingWorkflow({
			user: verifiedUser,
			formData: { ...validInput(), riskTolerance: "High" },
			completedAt: new Date("2026-08-07T09:00:00.000Z"),
			repository: dependencies.repository,
			welcomeEmailQueue: dependencies.welcomeEmailQueue,
		});

		assert.deepEqual(firstResult, { success: true });
		assert.deepEqual(secondResult, { success: true });
		assert.deepEqual(dependencies.profiles.get(verifiedUser.id), {
			data: {
				country: "US",
				investmentExperience: "Intermediate",
				investmentGoals: "Growth",
				riskTolerance: "High",
				preferredMarkets: ["US Stocks", "ETFs"],
				preferredIndustries: ["Technology", "Healthcare"],
			},
			completedAt: new Date("2026-08-07T09:00:00.000Z"),
			version: ONBOARDING_VERSION,
		});
		assert.equal(dependencies.queuedEvents.length, 1);
		assert.equal(
			dependencies.queuedEvents[0]?.eventId,
			"onboarding-completed-user-123",
		);
	});

	it("releases a failed welcome-email claim so a retry can enqueue it", async () => {
		const dependencies = createDependencies();
		const queueErrors: unknown[] = [];
		dependencies.setQueueFailure(true);

		const firstResult = await completeOnboardingWorkflow({
			user: verifiedUser,
			formData: validInput(),
			repository: dependencies.repository,
			welcomeEmailQueue: dependencies.welcomeEmailQueue,
			onQueueError: (error) => queueErrors.push(error),
		});

		assert.deepEqual(firstResult, { success: true });
		assert.equal(queueErrors.length, 1);
		assert.equal(dependencies.welcomeClaims.has(verifiedUser.id), false);

		dependencies.setQueueFailure(false);
		await completeOnboardingWorkflow({
			user: verifiedUser,
			formData: validInput(),
			repository: dependencies.repository,
			welcomeEmailQueue: dependencies.welcomeEmailQueue,
		});

		assert.equal(dependencies.queuedEvents.length, 1);
	});

	it("does not queue another welcome email when editing preferences", async () => {
		const dependencies = createDependencies();
		const result = await completeOnboardingWorkflow({
			user: verifiedUser,
			formData: validInput(),
			repository: dependencies.repository,
			welcomeEmailQueue: dependencies.welcomeEmailQueue,
			queueWelcomeEmail: false,
		});

		assert.deepEqual(result, { success: true });
		assert.equal(dependencies.queuedEvents.length, 0);
		assert.equal(dependencies.welcomeClaims.size, 0);
	});
});

describe("resumable onboarding", () => {
	it("validates only the fields belonging to the saved step", () => {
		assert.deepEqual(
			validateOnboardingStep(1, {
				country: "ph",
				investmentExperience: "Beginner",
			}),
			{
				success: true,
				data: { country: "PH", investmentExperience: "Beginner" },
			},
		);
		assert.deepEqual(
			validateOnboardingStep(2, {
				investmentGoals: "Income",
				riskTolerance: "Low",
			}),
			{
				success: true,
				data: { investmentGoals: "Income", riskTolerance: "Low" },
			},
		);
	});

	it("rejects malformed runtime payloads", () => {
		assert.equal(validateOnboardingStep(1, null).success, false);
		assert.equal(validateOnboardingStep(3, validInput()).success, false);
		assert.equal(
			validateOnboardingStep(1, {
				country: [],
				investmentExperience: "Beginner",
			}).success,
			false,
		);
	});

	it("maps legacy profiles to editable version-two defaults", () => {
		const profile = createOnboardingDefaults({
			country: "CA",
			investmentGoals: "Income",
			riskTolerance: "Low",
			preferredIndustry: "Energy",
			onboardingCompletedAt: new Date("2025-01-01T00:00:00.000Z"),
		});

		assert.deepEqual(profile, {
			data: {
				country: "CA",
				investmentExperience: "Beginner",
				investmentGoals: "Income",
				riskTolerance: "Low",
				preferredMarkets: ["US Stocks"],
				preferredIndustries: ["Energy"],
			},
			step: 1,
			completed: true,
		});
	});
});

describe("UserProfile model", () => {
	it("accepts the completed onboarding snapshot", async () => {
		const profile = new UserProfile({
			userId: "model-user",
			...validInput(),
			country: "US",
			onboardingCompletedAt: new Date(),
			onboardingStep: 3,
			onboardingVersion: ONBOARDING_VERSION,
		});

		await assert.doesNotReject(profile.validate());
	});

	it("rejects unsupported persisted preferences", async () => {
		const profile = new UserProfile({
			userId: "model-user",
			...validInput(),
			riskTolerance: "Extreme",
			onboardingCompletedAt: new Date(),
			onboardingStep: 3,
			onboardingVersion: ONBOARDING_VERSION,
		});

		await assert.rejects(profile.validate(), /not a valid enum value/i);
	});

	it("keeps legacy version-one profiles valid while they await editing", async () => {
		const profile = new UserProfile({
			userId: "legacy-user",
			country: "US",
			investmentGoals: "Growth",
			riskTolerance: "Medium",
			preferredIndustry: "Technology",
			onboardingCompletedAt: new Date(),
			onboardingVersion: 1,
		});

		await assert.doesNotReject(profile.validate());
		assert.notEqual(
			UserProfile.schema.path("preferredIndustry").isRequired,
			true,
		);
	});

	it("rejects an incomplete completed version-two profile", async () => {
		const profile = new UserProfile({
			userId: "incomplete-v2-user",
			country: "US",
			onboardingStep: 3,
			onboardingCompletedAt: new Date(),
			onboardingVersion: ONBOARDING_VERSION,
		});

		await assert.rejects(profile.validate(), /required|select between/i);
	});

	it("defines one unique profile per Better Auth user", () => {
		const indexes = UserProfile.schema.indexes() as Array<
			[Record<string, number>, { unique?: boolean }]
		>;
		const userIndex = indexes.find(([fields]) => fields.userId === 1);

		assert.ok(userIndex);
		assert.equal(userIndex[1].unique, true);
	});
});
