import {
	EMAIL_FREQUENCIES,
	type EmailEligibilityResult,
	type EmailFrequency,
} from "@/lib/email/communication-policy";

export const MARKET_NEWS_RECIPIENT_PAGE_SIZE = 50;
export const MARKET_NEWS_DELIVERY_EVENT =
	"app/market.news.delivery.requested";

export type MarketNewsDeliveryFrequency = Exclude<EmailFrequency, "off">;

export interface MarketNewsDeliveryRequest {
	userId: string;
	frequency: MarketNewsDeliveryFrequency;
	periodKey: string;
	deliveryKey: string;
}

const deliveryFrequencies = new Set<string>(
	EMAIL_FREQUENCIES.filter((frequency) => frequency !== "off"),
);
const periodKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

export function getMarketNewsPeriodKey(
	frequency: MarketNewsDeliveryFrequency,
	now: Date,
) {
	const periodDate = new Date(now);
	if (frequency === "weekly") {
		const daysSinceMonday = (periodDate.getUTCDay() + 6) % 7;
		periodDate.setUTCDate(periodDate.getUTCDate() - daysSinceMonday);
	}

	return periodDate.toISOString().slice(0, 10);
}

export function createMarketNewsDeliveryEvents({
	userIds,
	frequency,
	periodKey,
}: {
	userIds: readonly string[];
	frequency: MarketNewsDeliveryFrequency;
	periodKey: string;
}) {
	return userIds.map((userId) => ({
		name: MARKET_NEWS_DELIVERY_EVENT,
		data: {
			userId,
			frequency,
			periodKey,
			deliveryKey: `market-news:${frequency}:${periodKey}:${userId}`,
		},
	}));
}

export function parseMarketNewsDeliveryRequest(
	value: unknown,
): MarketNewsDeliveryRequest | null {
	if (!value || typeof value !== "object") return null;

	const request = value as Record<string, unknown>;
	if (
		typeof request.userId !== "string" ||
		request.userId.length === 0 ||
		request.userId.length > 200 ||
		typeof request.frequency !== "string" ||
		!deliveryFrequencies.has(request.frequency) ||
		typeof request.periodKey !== "string" ||
		!periodKeyPattern.test(request.periodKey) ||
		typeof request.deliveryKey !== "string"
	) {
		return null;
	}

	const frequency = request.frequency as MarketNewsDeliveryFrequency;
	const expectedDeliveryKey = `market-news:${frequency}:${request.periodKey}:${request.userId}`;
	if (request.deliveryKey !== expectedDeliveryKey) return null;

	return {
		userId: request.userId,
		frequency,
		periodKey: request.periodKey,
		deliveryKey: request.deliveryKey,
	};
}

export function isEligibleForScheduledMarketNews(
	eligibility: EmailEligibilityResult,
	frequency: MarketNewsDeliveryFrequency,
) {
	return eligibility.eligible && eligibility.frequency === frequency;
}
