import type { MarketNewsCategory } from "@/lib/email/communication-policy";

export type NotificationType = "price_alert" | "market_news" | "announcement";
export interface NotificationArticle {
	headline: string;
	url: string;
	source: string;
}
export interface NotificationDto {
	id: string;
	type: NotificationType;
	title: string;
	body: string;
	articles: NotificationArticle[];
	destination: string | null;
	createdAt: string;
	readAt: string | null;
}
export interface NotificationPage {
	items: NotificationDto[];
	nextCursor: string | null;
}
export interface InAppNewsPreference {
	frequency: "off" | "daily" | "weekly";
	categories: MarketNewsCategory[];
}
