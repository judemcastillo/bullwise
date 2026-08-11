import {
	COMMUNICATION_PREFERENCE_SCHEMA_VERSION,
	EMAIL_CONSENT_SOURCES,
	EMAIL_CONSENT_STATUSES,
	EMAIL_FREQUENCIES,
	EMAIL_STREAMS,
	EMAIL_SUPPRESSION_REASONS,
	EMAIL_SUPPRESSION_SOURCES,
	MARKET_NEWS_CATEGORIES,
	type EmailConsentSource,
	type EmailConsentStatus,
	type EmailFrequency,
	type EmailStream,
	type EmailSuppressionReason,
	type EmailSuppressionSource,
	type MarketNewsCategory,
} from "@/lib/email/communication-policy";
import { Model, Schema, model, models } from "mongoose";

export interface CommunicationPreferenceDocument {
	userId: string;
	schemaVersion: number;
	emailSuppression?: {
		reason: EmailSuppressionReason;
		source: EmailSuppressionSource;
		recordedAt: Date;
		provider?: string;
		providerEventId?: string;
	};
	subscriptions: Array<{
		stream: EmailStream;
		status: EmailConsentStatus;
		frequency: EmailFrequency;
		categories: MarketNewsCategory[];
		consentSource?: EmailConsentSource;
		consentedAt?: Date;
		consentPolicyVersion?: string;
		unsubscribedAt?: Date;
	}>;
	legacyMigration?: {
		source: "user_profile_v1";
		migratedAt: Date;
	};
	createdAt: Date;
	updatedAt: Date;
}

const emailSuppressionSchema = new Schema(
	{
		reason: {
			type: String,
			required: true,
			enum: EMAIL_SUPPRESSION_REASONS,
		},
		source: {
			type: String,
			required: true,
			enum: EMAIL_SUPPRESSION_SOURCES,
		},
		recordedAt: { type: Date, required: true },
		provider: { type: String, trim: true, maxlength: 100 },
		providerEventId: { type: String, trim: true, maxlength: 200 },
	},
	{ _id: false },
);

const emailSubscriptionSchema = new Schema(
	{
		stream: { type: String, required: true, enum: EMAIL_STREAMS },
		status: {
			type: String,
			required: true,
			enum: EMAIL_CONSENT_STATUSES,
			default: "unknown",
		},
		frequency: {
			type: String,
			required: true,
			enum: EMAIL_FREQUENCIES,
			default: "off",
		},
		categories: {
			type: [{ type: String, enum: MARKET_NEWS_CATEGORIES }],
			required: true,
			default: [],
		},
		consentSource: { type: String, enum: EMAIL_CONSENT_SOURCES },
		consentedAt: { type: Date },
		consentPolicyVersion: { type: String, trim: true, maxlength: 40 },
		unsubscribedAt: { type: Date },
	},
	{ _id: false },
);

const subscriptionsValidationError = (
	subscriptions: CommunicationPreferenceDocument["subscriptions"],
): string | null => {
	if (!Array.isArray(subscriptions)) return "Subscriptions must be an array.";
	if (new Set(subscriptions.map(({ stream }) => stream)).size !== subscriptions.length) {
		return "Communication subscriptions must contain unique streams.";
	}

	for (const subscription of subscriptions) {
		if (new Set(subscription.categories).size !== subscription.categories.length) {
			return "Communication subscriptions must not contain duplicate categories.";
		}
		if (
			subscription.stream === "product_updates" &&
			subscription.categories.length > 0
		) {
			return "Product updates subscriptions must not have categories.";
		}

		if (subscription.status === "subscribed") {
			if (
				!subscription.frequency ||
				subscription.frequency === "off" ||
				!subscription.consentSource ||
				!subscription.consentedAt ||
				!subscription.consentPolicyVersion ||
				(subscription.stream === "market_news" && subscription.categories.length === 0)
			) {
				return "Subscribed records must have complete consent state.";
			}
		}

		if (subscription.status === "unsubscribed") {
			if (subscription.frequency !== "off" || !subscription.unsubscribedAt) {
				return "Unsubscribed records must have frequency off and unsubscribedAt timestamp.";
			}
		}

		if (subscription.status === "unknown" && subscription.frequency !== "off") {
			return "Unknown status records must have frequency off.";
		}
	}

	return null;
};

const validSubscriptions = (
	subscriptions: CommunicationPreferenceDocument["subscriptions"],
) => {
	return subscriptionsValidationError(subscriptions) === null;
};

const communicationPreferenceSchema =
	new Schema<CommunicationPreferenceDocument>(
		{
			userId: {
				type: String,
				required: true,
				unique: true,
				index: true,
				trim: true,
				immutable: true,
			},
			schemaVersion: {
				type: Number,
				required: true,
				default: COMMUNICATION_PREFERENCE_SCHEMA_VERSION,
				min: 1,
			},
			emailSuppression: { type: emailSuppressionSchema },
			subscriptions: {
				type: [emailSubscriptionSchema],
				required: true,
				default: [],
				validate: {
					validator: validSubscriptions,
					message: (props: { value: CommunicationPreferenceDocument["subscriptions"] }) =>
						subscriptionsValidationError(props.value) ||
						"Communication subscriptions must contain unique streams and complete consent state.",
				},
			},
			legacyMigration: {
				type: new Schema(
					{
						source: {
							type: String,
							required: true,
							enum: ["user_profile_v1"],
						},
						migratedAt: { type: Date, required: true },
					},
					{ _id: false },
				),
			},
		},
		{ timestamps: true },
	);

communicationPreferenceSchema.index({
	"subscriptions.stream": 1,
	"subscriptions.status": 1,
	"subscriptions.frequency": 1,
	userId: 1,
});
communicationPreferenceSchema.index({ "emailSuppression.reason": 1 });

const CommunicationPreference =
	(models?.CommunicationPreference as
		| Model<CommunicationPreferenceDocument>
		| undefined) ||
	model<CommunicationPreferenceDocument>(
		"CommunicationPreference",
		communicationPreferenceSchema,
	);

export default CommunicationPreference;
