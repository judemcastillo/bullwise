import mongoose, { Model, Schema, model, models } from "mongoose";
import {
	INVESTMENT_EXPERIENCE_OPTIONS,
	INVESTMENT_GOALS,
	PREFERRED_INDUSTRIES,
	PREFERRED_MARKETS,
	RISK_TOLERANCE_OPTIONS,
} from "@/lib/constants";

export interface UserProfileDocument {
	userId: string;
	country?: string;
	investmentExperience?: string;
	investmentGoals?: string;
	riskTolerance?: string;
	preferredMarkets: string[];
	preferredIndustries: string[];
	/** Kept temporarily so version-1 profiles remain readable. */
	preferredIndustry?: string;
	onboardingStep: number;
	onboardingCompletedAt?: Date;
	onboardingVersion: number;
	welcomeEmailQueuedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}

const isCompletedVersionTwoProfile = function (
	this: UserProfileDocument,
) {
	return Boolean(this.onboardingCompletedAt) && this.onboardingVersion >= 2;
};

const validCompletedSelections = function (
	this: unknown,
	selections: unknown,
) {
	if (!Array.isArray(selections)) return false;

	const uniqueSelections = new Set(selections);
	if (uniqueSelections.size !== selections.length || selections.length > 3) {
		return false;
	}

	return (
		!isCompletedVersionTwoProfile.call(this as UserProfileDocument) ||
		selections.length >= 1
	);
};

const userProfileSchema = new Schema<UserProfileDocument>(
	{
		userId: { type: String, required: true, unique: true, index: true },
		country: {
			type: String,
			required: isCompletedVersionTwoProfile,
			uppercase: true,
			trim: true,
			match: /^[A-Z]{2}$/,
		},
		investmentExperience: {
			type: String,
			required: isCompletedVersionTwoProfile,
			enum: INVESTMENT_EXPERIENCE_OPTIONS.map((option) => option.value),
		},
		investmentGoals: {
			type: String,
			required: isCompletedVersionTwoProfile,
			enum: INVESTMENT_GOALS.map((option) => option.value),
		},
		riskTolerance: {
			type: String,
			required: isCompletedVersionTwoProfile,
			enum: RISK_TOLERANCE_OPTIONS.map((option) => option.value),
		},
		preferredMarkets: {
			type: [{ type: String, enum: PREFERRED_MARKETS.map((option) => option.value) }],
			default: [],
			validate: {
				validator: validCompletedSelections,
				message: "Select between 1 and 3 unique preferred markets.",
			},
		},
		preferredIndustries: {
			type: [
				{ type: String, enum: PREFERRED_INDUSTRIES.map((option) => option.value) },
			],
			default: [],
			validate: {
				validator: validCompletedSelections,
				message: "Select between 1 and 3 unique preferred industries.",
			},
		},
		preferredIndustry: {
			type: String,
			enum: PREFERRED_INDUSTRIES.map((option) => option.value),
		},
		onboardingStep: { type: Number, required: true, default: 1, min: 1, max: 3 },
		onboardingCompletedAt: { type: Date },
		onboardingVersion: { type: Number, required: true, default: 1 },
		welcomeEmailQueuedAt: { type: Date },
	},
	{ timestamps: true },
);

const cachedUserProfile = models?.UserProfile as
	| Model<UserProfileDocument>
	| undefined;
const cachedSchemaIsCurrent = Boolean(
	cachedUserProfile?.schema.path("preferredIndustries") &&
		cachedUserProfile.schema.path("investmentExperience"),
);

if (
	process.env.NODE_ENV !== "production" &&
	cachedUserProfile &&
	!cachedSchemaIsCurrent
) {
	mongoose.deleteModel("UserProfile");
}

const UserProfile =
	(models?.UserProfile as Model<UserProfileDocument> | undefined) ||
	model<UserProfileDocument>("UserProfile", userProfileSchema);

export default UserProfile;
