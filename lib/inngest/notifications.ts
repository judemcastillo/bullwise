import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import {
	DAILY_MARKET_NEWS_CRON,
	WEEKLY_MARKET_NEWS_CRON,
} from "./market-news.config";
import { getMarketNewsPeriodKey } from "@/lib/email/market-news-delivery-policy";
import {
	getInAppPreference,
	notificationsEnabledAt,
} from "@/lib/notifications/store";
import { eligibleRecipientPage } from "@/lib/notifications/recipients";
import { deliverAlertNotifications } from "@/lib/notifications/alert-delivery";
import {
	deliverInboxNews,
	parseInboxNewsRequest,
} from "@/lib/notifications/news-delivery";

function newsSchedule(frequency: "daily" | "weekly", cron: string) {
	return inngest.createFunction(
		{ id: `inbox-news-${frequency}`, triggers: [{ cron }], retries: 3 },
		async ({ event, step }) => {
			const scheduledAt = new Date(event.ts ?? Date.now()).toISOString();
			const enabled = await step.run("check-inbox-enabled", async () => {
				const enabledAt = await notificationsEnabledAt();
				return enabledAt !== null && new Date(scheduledAt) >= enabledAt;
			});
			if (!enabled) return { status: "disabled" };
			await step.sendEvent("queue-first-page", {
				name: "app/inbox.news.queue",
				data: { frequency, scheduledAt, afterUserId: "" },
			});
			return { status: "queued" };
		},
	);
}
export const dailyInboxNews = newsSchedule("daily", DAILY_MARKET_NEWS_CRON);
export const weeklyInboxNews = newsSchedule("weekly", WEEKLY_MARKET_NEWS_CRON);
export const queueInboxNews = inngest.createFunction(
	{
		id: "queue-inbox-news",
		triggers: [{ event: "app/inbox.news.queue" }],
		concurrency: 2,
		retries: 3,
	},
	async ({ event, step }) => {
		const { frequency, scheduledAt, afterUserId } = event.data;
		if (
			!["daily", "weekly"].includes(frequency) ||
			typeof scheduledAt !== "string" ||
			!Number.isFinite(Date.parse(scheduledAt)) ||
			typeof afterUserId !== "string"
		)
			throw new NonRetriableError("Invalid inbox queue request");
		const page = await step.run("load-recipient-page", async () => {
			const enabledAt = await notificationsEnabledAt();
			if (!enabledAt || new Date(scheduledAt) < enabledAt)
				return { userIds: [], nextCursor: null };
			const recipients = await eligibleRecipientPage(
				new Date(scheduledAt),
				afterUserId,
			);
			const userIds: string[] = [];
			for (const recipient of recipients) {
				if (
					(await getInAppPreference(recipient.userId)).frequency === frequency
				)
					userIds.push(recipient.userId);
			}
			return {
				userIds,
				nextCursor:
					recipients.length === 100 ? recipients.at(-1)!.userId : null,
			};
		});
		const periodKey = getMarketNewsPeriodKey(frequency, new Date(scheduledAt));
		if (page.userIds.length)
			await step.sendEvent(
				"queue-digests",
				page.userIds.map((userId) => ({
					name: "app/inbox.news.deliver",
					data: { userId, frequency, periodKey, scheduledAt },
				})),
			);
		if (page.nextCursor)
			await step.sendEvent("continue-queue", {
				name: "app/inbox.news.queue",
				data: { frequency, scheduledAt, afterUserId: page.nextCursor },
			});
		return { queued: page.userIds.length };
	},
);
export const deliverInboxNewsDigest = inngest.createFunction(
	{
		id: "deliver-inbox-news",
		triggers: [{ event: "app/inbox.news.deliver" }],
		concurrency: 4,
		retries: 3,
	},
	async ({ event, step }) => {
		let request;
		try {
			request = parseInboxNewsRequest(event.data);
		} catch {
			throw new NonRetriableError("Invalid inbox news request");
		}
		return step.run("deliver-digest", () => deliverInboxNews(request));
	},
);
export const deliverInboxPriceAlerts = inngest.createFunction(
	{
		id: "deliver-inbox-price-alerts",
		triggers: [{ cron: "* * * * *" }],
		concurrency: 1,
		retries: 3,
	},
	async ({ step }) => {
		return step.run("deliver-alerts", deliverAlertNotifications);
	},
);
