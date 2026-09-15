import type {
	InAppNewsPreference,
	NotificationArticle,
} from "@/types/notifications";
import { NotificationInputError } from "./policy";
import { getMarketNewsPeriodKey } from "@/lib/email/market-news-delivery-policy";
export interface InboxNewsRequest {
	userId: string;
	frequency: "daily" | "weekly";
	periodKey: string;
	scheduledAt: string;
}
export function parseInboxNewsRequest(value: unknown): InboxNewsRequest {
	const v = value as InboxNewsRequest;
	if (
		!v ||
		typeof v.userId !== "string" ||
		!v.userId ||
		v.userId.length > 200 ||
		!["daily", "weekly"].includes(v.frequency) ||
		typeof v.periodKey !== "string" ||
		typeof v.scheduledAt !== "string" ||
		!Number.isFinite(Date.parse(v.scheduledAt)) ||
		getMarketNewsPeriodKey(v.frequency, new Date(v.scheduledAt)) !== v.periodKey
	)
		throw new NotificationInputError("Invalid inbox news request");
	return v;
}
export interface NewsDeliveryDependencies {
	enabledAt(): Promise<Date | null>;
	eligible(userId: string): Promise<boolean>;
	preference(userId: string): Promise<InAppNewsPreference>;
	exists(userId: string, sourceKey: string): Promise<boolean>;
	articles(
		userId: string,
		preference: InAppNewsPreference,
	): Promise<NotificationArticle[]>;
	save(
		request: InboxNewsRequest,
		sourceKey: string,
		articles: NotificationArticle[],
	): Promise<void>;
}
export async function deliverInboxNewsWorkflow(
	request: InboxNewsRequest,
	deps: NewsDeliveryDependencies,
) {
	const enabledAt = await deps.enabledAt();
	if (!enabledAt || new Date(request.scheduledAt) < enabledAt)
		return { status: "disabled" };
	if (!(await deps.eligible(request.userId))) return { status: "ineligible" };
	const preference = await deps.preference(request.userId);
	if (preference.frequency !== request.frequency)
		return { status: "preference_changed" };
	const sourceKey = `news:${request.frequency}:${request.periodKey}`;
	if (await deps.exists(request.userId, sourceKey))
		return { status: "duplicate" };
	const articles = await deps.articles(request.userId, preference);
	if (!articles.length) return { status: "no_news" };
	const latest = await deps.preference(request.userId);
	if (JSON.stringify(latest) !== JSON.stringify(preference))
		return { status: "preference_changed" };
	await deps.save(request, sourceKey, articles);
	return { status: "delivered" };
}
