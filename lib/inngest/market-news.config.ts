import { MARKET_NEWS_DELIVERY_EVENT } from "@/lib/email/market-news-delivery-policy";

export const DAILY_MARKET_NEWS_CRON = "0 12 * * *";
export const DAILY_MARKET_NEWS_EVENT = "app/send.daily.news";
export const WEEKLY_MARKET_NEWS_CRON = "0 12 * * 1";
export const WEEKLY_MARKET_NEWS_EVENT = "app/send.weekly.news";

export const DAILY_MARKET_NEWS_FUNCTION_CONFIG = {
	id: "daily-news-summary",
	name: "Queue daily market news",
	description: "Queue daily market-news deliveries in recipient pages",
	triggers: [
		{ cron: DAILY_MARKET_NEWS_CRON },
		{ event: DAILY_MARKET_NEWS_EVENT },
	],
	concurrency: 1,
	singleton: { mode: "skip" as const },
	retries: 3 as const,
};

export const WEEKLY_MARKET_NEWS_FUNCTION_CONFIG = {
	id: "weekly-news-summary",
	name: "Queue weekly market news",
	description: "Queue weekly market-news deliveries in recipient pages",
	triggers: [
		{ cron: WEEKLY_MARKET_NEWS_CRON },
		{ event: WEEKLY_MARKET_NEWS_EVENT },
	],
	concurrency: 1,
	singleton: { mode: "skip" as const },
	retries: 3 as const,
};

export const MARKET_NEWS_DELIVERY_FUNCTION_CONFIG = {
	id: "deliver-market-news-summary",
	name: "Deliver market news summary",
	description:
		"Generate and deliver one preference-eligible market-news summary",
	triggers: [{ event: MARKET_NEWS_DELIVERY_EVENT }],
	concurrency: 4,
	// Event-level idempotency prevents duplicate function runs within the Inngest
	// event window, but does not guarantee once-only delivery across the seven-day
	// weekly period. The delivery-log unique index provides database-level deduplication.
	idempotency: "event.data.deliveryKey",
	retries: 3 as const,
};
