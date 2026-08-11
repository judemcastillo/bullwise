export const COMMUNICATION_POLICY_VERSION = "2026-01" as const;
export const COMMUNICATION_PREFERENCE_SCHEMA_VERSION = 1 as const;

export const EMAIL_STREAMS = ["market_news", "product_updates"] as const;
export type EmailStream = (typeof EMAIL_STREAMS)[number];

export const EMAIL_CONSENT_STATUSES = [
	"unknown",
	"subscribed",
	"unsubscribed",
] as const;
export type EmailConsentStatus = (typeof EMAIL_CONSENT_STATUSES)[number];

export const EMAIL_FREQUENCIES = ["daily", "weekly", "off"] as const;
export type EmailFrequency = (typeof EMAIL_FREQUENCIES)[number];

export const MARKET_NEWS_CATEGORIES = [
	"watchlist_news",
	"general_market",
	"earnings",
	"economic_news",
] as const;
export type MarketNewsCategory = (typeof MARKET_NEWS_CATEGORIES)[number];

export const DEFAULT_MARKET_NEWS_CATEGORIES = [
	"watchlist_news",
	"general_market",
] as const satisfies readonly MarketNewsCategory[];

export const EMAIL_CONSENT_SOURCES = [
	"onboarding",
	"notification_settings",
	"preference_center",
	"imported_verified_consent",
] as const;
export type EmailConsentSource = (typeof EMAIL_CONSENT_SOURCES)[number];

export const EMAIL_SUPPRESSION_REASONS = [
	"hard_bounce",
	"complaint",
	"account_deleted",
] as const;
export type EmailSuppressionReason =
	(typeof EMAIL_SUPPRESSION_REASONS)[number];

export const EMAIL_SUPPRESSION_SOURCES = [
	"provider_webhook",
	"smtp_response",
	"account_lifecycle",
	"manual_review",
	"legacy_migration",
] as const;
export type EmailSuppressionSource =
	(typeof EMAIL_SUPPRESSION_SOURCES)[number];

export const EMAIL_MESSAGE_TYPES = [
	"email_verification",
	"account_welcome",
	"account_security",
	"price_alert",
	"market_news",
	"product_updates",
] as const;
export type EmailMessageType = (typeof EMAIL_MESSAGE_TYPES)[number];

export interface EmailSubscriptionPreferenceSnapshot {
	stream: EmailStream;
	status: EmailConsentStatus;
	frequency: EmailFrequency;
	categories: MarketNewsCategory[];
	consentSource?: EmailConsentSource;
	consentedAt?: Date;
	consentPolicyVersion?: string;
	unsubscribedAt?: Date;
}

export interface CommunicationPreferenceSnapshot {
	userId: string;
	schemaVersion: number;
	emailSuppression?: {
		reason: EmailSuppressionReason;
		source: EmailSuppressionSource;
		recordedAt: Date;
		provider?: string;
		providerEventId?: string;
	};
	subscriptions: EmailSubscriptionPreferenceSnapshot[];
}

export type EmailEligibilityRequest =
	| {
			messageType:
				| "email_verification"
				| "account_welcome"
				| "account_security"
				| "price_alert";
		}
	| {
			messageType: "market_news";
			category?: MarketNewsCategory;
		}
	| { messageType: "product_updates" };

export type EmailEligibilityReason =
	| "eligible"
	| "account_deleted"
	| "complaint"
	| "hard_bounce"
	| "missing_preference"
	| "not_subscribed"
	| "invalid_consent_record"
	| "frequency_off"
	| "category_disabled";

export interface EmailEligibilityResult {
	eligible: boolean;
	reason: EmailEligibilityReason;
	frequency?: Exclude<EmailFrequency, "off">;
}

export interface MarketNewsPreferenceInput {
	frequency: EmailFrequency;
	categories: MarketNewsCategory[];
}

export interface MarketNewsPreferenceView extends MarketNewsPreferenceInput {
	status: EmailConsentStatus;
}

const marketNewsCategorySet = new Set<string>(MARKET_NEWS_CATEGORIES);

export const validateMarketNewsPreferenceInput = (
	input: unknown,
):
	| { success: true; data: MarketNewsPreferenceInput }
	| { success: false; error: string } => {
	if (!input || typeof input !== "object") {
		return { success: false, error: "Invalid email preference." };
	}

	const record = input as Record<string, unknown>;
	if (
		typeof record.frequency !== "string" ||
		!EMAIL_FREQUENCIES.includes(record.frequency as EmailFrequency)
	) {
		return { success: false, error: "Select a valid email frequency." };
	}
	if (!Array.isArray(record.categories)) {
		return { success: false, error: "Select valid news categories." };
	}

	const categories = record.categories.filter(
		(category): category is MarketNewsCategory =>
			typeof category === "string" && marketNewsCategorySet.has(category),
	);
	if (
		categories.length !== record.categories.length ||
		new Set(categories).size !== categories.length
	) {
		return { success: false, error: "Select valid, unique news categories." };
	}
	const frequency = record.frequency as EmailFrequency;
	if (frequency !== "off" && categories.length === 0) {
		return {
			success: false,
			error: "Select at least one news category before subscribing.",
		};
	}

	return { success: true, data: { frequency, categories } };
};

const streamForMessage = (
	request: EmailEligibilityRequest,
): EmailStream | null => {
	if (request.messageType === "market_news") return "market_news";
	if (request.messageType === "product_updates") return "product_updates";
	return null;
};

const hasAuditableConsent = (
	subscription: EmailSubscriptionPreferenceSnapshot,
) =>
	Boolean(
		subscription.consentSource &&
			subscription.consentedAt &&
			subscription.consentPolicyVersion,
	);

export const evaluateEmailEligibility = ({
	preference,
	request,
}: {
	preference: CommunicationPreferenceSnapshot | null;
	request: EmailEligibilityRequest;
}): EmailEligibilityResult => {
	const suppressionReason = preference?.emailSuppression?.reason;
	if (suppressionReason) {
		if (suppressionReason === "account_deleted") {
			return { eligible: false, reason: suppressionReason };
		}
		const stream = streamForMessage(request);
		if (stream && (suppressionReason === "complaint" || suppressionReason === "hard_bounce")) {
			return { eligible: false, reason: suppressionReason };
		}
		if (!stream) {
			return { eligible: true, reason: "eligible" };
		}
	}

	const stream = streamForMessage(request);
	if (!stream) return { eligible: true, reason: "eligible" };
	if (!preference) return { eligible: false, reason: "missing_preference" };

	const subscription = preference.subscriptions.find(
		(candidate) => candidate.stream === stream,
	);
	if (!subscription) {
		return { eligible: false, reason: "missing_preference" };
	}
	if (subscription.status !== "subscribed") {
		return { eligible: false, reason: "not_subscribed" };
	}
	if (!hasAuditableConsent(subscription)) {
		return { eligible: false, reason: "invalid_consent_record" };
	}
	if (subscription.frequency === "off") {
		return { eligible: false, reason: "frequency_off" };
	}
	if (
		request.messageType === "market_news" &&
		(request.category
			? !subscription.categories.includes(request.category)
			: subscription.categories.length === 0)
	) {
		return { eligible: false, reason: "category_disabled" };
	}

	return {
		eligible: true,
		reason: "eligible",
		frequency: subscription.frequency,
	};
};
