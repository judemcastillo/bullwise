import { inngest } from "@/lib/inngest/client";
import {
	getVerifiedMarketNewsRecipient,
	listMarketNewsRecipientIdsPage,
} from "@/lib/data/market-news-recipients";
import { getEmailEligibility } from "@/lib/email/communication-eligibility";
import {
	createMarketNewsDeliveryEvents,
	getMarketNewsPeriodKey,
	isEligibleForScheduledMarketNews,
	parseMarketNewsDeliveryRequest,
	type MarketNewsDeliveryFrequency,
} from "@/lib/email/market-news-delivery-policy";
import {
	claimMarketNewsDelivery,
	completeMarketNewsDelivery,
	failMarketNewsDelivery,
} from "@/lib/email/market-news-delivery-log";
import { getMarketNewsPreference } from "@/lib/email/market-news-preference";
import { createDailyNewsUnsubscribeUrls } from "@/lib/email/unsubscribe-token";
import { ALERT_EMAIL_DELIVERY_FUNCTION_CONFIG } from "@/lib/inngest/alert-email-delivery.config";
import { ALERT_MONITORING_FUNCTION_CONFIG } from "@/lib/inngest/alert-monitoring.config";
import {
	DAILY_MARKET_NEWS_FUNCTION_CONFIG,
	MARKET_NEWS_DELIVERY_FUNCTION_CONFIG,
	MARKET_NEWS_QUEUE_CONTINUATION_EVENT,
	MARKET_NEWS_QUEUE_CONTINUATION_FUNCTION_CONFIG,
	MARKET_NEWS_RECIPIENT_MAX_PAGES_PER_RUN,
	WEEKLY_MARKET_NEWS_FUNCTION_CONFIG,
} from "@/lib/inngest/market-news.config";
import {
	NEWS_SUMMARY_EMAIL_PROMPT,
	PERSONALIZED_WELCOME_EMAIL_PROMPT,
} from "@/lib/inngest/prompts";
import { deliverAlertEmailOutbox } from "@/lib/alerts/email-delivery-worker";
import { monitorDuePriceAlerts } from "@/lib/alerts/monitoring";
import { type GetStepTools, NonRetriableError } from "inngest";
import { getNews } from "../market-data/finnhub";
import { getWatchlistSymbolsForUser } from "../data/watchlist";
import { sendNewsSummaryEmail, sendWelcomeEmail } from "../nodemailer";
import { getFormattedTodayDate } from "../utils";

type BullwiseStepTools = GetStepTools<typeof inngest>;

async function queueMarketNewsDeliveries({
	step,
	frequency,
	initialAfterUserId,
	initialPeriodKey,
}: {
	step: BullwiseStepTools;
	frequency: MarketNewsDeliveryFrequency;
	initialAfterUserId?: string;
	initialPeriodKey?: string;
}) {
	const periodKey =
		initialPeriodKey ??
		(await step.run("resolve-market-news-period", () =>
			getMarketNewsPeriodKey(frequency, new Date()),
		));
	let afterUserId = initialAfterUserId;
	let queued = 0;
	let pages = 0;

	do {
		const page = await step.run(
			`load-market-news-recipient-page-${pages}`,
			() => listMarketNewsRecipientIdsPage({ frequency, afterUserId }),
		);

		if (page.userIds.length > 0) {
			await step.sendEvent(
				`enqueue-market-news-recipient-batch-${pages}`,
				createMarketNewsDeliveryEvents({
					userIds: page.userIds,
					frequency,
					periodKey,
				}),
			);
		}

		queued += page.userIds.length;
		pages += 1;
		afterUserId = page.nextCursor ?? undefined;
	} while (afterUserId && pages < MARKET_NEWS_RECIPIENT_MAX_PAGES_PER_RUN);

	if (afterUserId) {
		await step.sendEvent(`continue-market-news-recipient-pages-${pages}`, {
			name: MARKET_NEWS_QUEUE_CONTINUATION_EVENT,
			data: { frequency, periodKey, afterUserId },
		});
	}

	return { frequency, periodKey, queued, pages, afterUserId };
}

export const deliverAlertEmails = inngest.createFunction(
	ALERT_EMAIL_DELIVERY_FUNCTION_CONFIG,
	async ({ step }) => {
		const summary = await step.run("deliver-alert-email-outbox", () =>
			deliverAlertEmailOutbox(),
		);

		return {
			success: true,
			message: "Alert email delivery completed",
			summary,
		};
	},
);

export const monitorPriceAlerts = inngest.createFunction(
	ALERT_MONITORING_FUNCTION_CONFIG,
	async ({ step }) => {
		const summary = await step.run("monitor-due-price-alerts", () =>
			monitorDuePriceAlerts(),
		);

		return {
			success: true,
			message: "Price alert monitoring completed",
			summary,
		};
	},
);

export const sendSignUpEmail = inngest.createFunction(
	{
		id: "sign-up-email",
		triggers: [{ event: "app/user.created" }],
	},
	async ({ event, step }) => {
		const experience = event.data.investmentExperience ?? "Beginner";
		const preferredMarkets = Array.isArray(event.data.preferredMarkets)
			? event.data.preferredMarkets.join(", ")
			: "US Stocks";
		const preferredIndustries = Array.isArray(event.data.preferredIndustries)
			? event.data.preferredIndustries.join(", ")
			: (event.data.preferredIndustry ?? "Technology");
		const userProfile = `
            - Country: ${event.data.country}
            - Investment experience: ${experience}
            - Investment goals: ${event.data.investmentGoals}
            - Risk tolerance: ${event.data.riskTolerance}
            - Preferred markets: ${preferredMarkets}
            - Preferred industries: ${preferredIndustries}
        `;

		const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace(
			"{{userProfile}}",
			userProfile,
		);

		const response = await step.ai.infer("generate-welcome-intro", {
			model: step.ai.models.gemini({ model: "gemini-3.1-flash-lite" }),
			body: {
				contents: [
					{
						role: "user",
						parts: [{ text: prompt }],
					},
				],
			},
		});

		await step.run("send-welcome-email", async () => {
			const part = response.candidates?.[0]?.content?.parts?.[0];
			const introText =
				(part && "text" in part ? part.text : null) ||
				"Thanks for joining Bull Wise. You now have the tools to track markets and make smarter moves.";

			const {
				data: { email, name },
			} = event;
			return await sendWelcomeEmail({
				email,
				name,
				intro: introText,
			});
		});

		return {
			success: true,
			message: "Welcome email sent successfully",
		};
	},
);

export const sendDailyNewsSummary = inngest.createFunction(
	DAILY_MARKET_NEWS_FUNCTION_CONFIG,
	async ({ step }) => {
		return queueMarketNewsDeliveries({ step, frequency: "daily" });
	},
);

export const sendWeeklyNewsSummary = inngest.createFunction(
	WEEKLY_MARKET_NEWS_FUNCTION_CONFIG,
	async ({ step }) => {
		return queueMarketNewsDeliveries({ step, frequency: "weekly" });
	},
);

export const continueMarketNewsSummaryQueue = inngest.createFunction(
	MARKET_NEWS_QUEUE_CONTINUATION_FUNCTION_CONFIG,
	async ({ event, step }) => {
		const { frequency, periodKey, afterUserId } = event.data as Record<
			string,
			unknown
		>;
		if (
			(frequency !== "daily" && frequency !== "weekly") ||
			typeof periodKey !== "string" ||
			!/^\d{4}-\d{2}-\d{2}$/.test(periodKey) ||
			typeof afterUserId !== "string" ||
			!afterUserId
		) {
			throw new NonRetriableError("Invalid market-news queue continuation");
		}

		return queueMarketNewsDeliveries({
			step,
			frequency,
			initialAfterUserId: afterUserId,
			initialPeriodKey: periodKey,
		});
	},
);

export const deliverMarketNewsSummary = inngest.createFunction(
	MARKET_NEWS_DELIVERY_FUNCTION_CONFIG,
	async ({ event, step }) => {
		const request = parseMarketNewsDeliveryRequest(event.data);
		if (!request) {
			throw new NonRetriableError("Invalid market-news delivery request");
		}

		const prepared = await step.run("prepare-market-news-delivery", async () => {
			const eligibility = await getEmailEligibility({
				userId: request.userId,
				request: { messageType: "market_news" },
			});
			if (!isEligibleForScheduledMarketNews(eligibility, request.frequency)) {
				return { ready: false as const, reason: eligibility.reason };
			}

			const preference = await getMarketNewsPreference(request.userId);
			const symbols = preference.categories.includes("watchlist_news")
				? await getWatchlistSymbolsForUser(request.userId)
				: [];
			const news = await getNews(symbols);

			if (news.length === 0) {
				return { ready: false as const, reason: "no_news" as const };
			}

			return { ready: true as const, news: news.slice(0, 6) };
		});

		if (!prepared.ready) {
			return { status: "skipped", reason: prepared.reason };
		}

		const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace(
			"{{newsData}}",
			JSON.stringify(prepared.news, null, 2),
		);
		const response = await step.ai.infer("summarize-market-news", {
			model: step.ai.models.gemini({ model: "gemini-3.1-flash-lite" }),
			body: {
				contents: [{ role: "user", parts: [{ text: prompt }] }],
			},
		});
		const part = response.candidates?.[0]?.content?.parts?.[0];
		const newsContent =
			(part && "text" in part ? part.text : null) || "No market news.";

		if (newsContent === "No market news.") {
			return { status: "skipped", reason: "no_news_content" };
		}

		return step.run("send-market-news-email", async () => {
			const eligibility = await getEmailEligibility({
				userId: request.userId,
				request: { messageType: "market_news" },
			});
			if (!isEligibleForScheduledMarketNews(eligibility, request.frequency)) {
				return { status: "skipped", reason: eligibility.reason };
			}

			const recipient = await getVerifiedMarketNewsRecipient(request.userId);
			if (!recipient) {
				return { status: "skipped", reason: "recipient_unavailable" };
			}

			const { confirmationUrl, oneClickUrl } =
				createDailyNewsUnsubscribeUrls(request.userId);
			const claim = await claimMarketNewsDelivery(request.deliveryKey);
			if (!claim) {
				return { status: "skipped", reason: "duplicate_delivery" };
			}

			let accepted: boolean;
			try {
				accepted = await sendNewsSummaryEmail({
					email: recipient.email,
					frequency: request.frequency,
					date: getFormattedTodayDate(),
					newsContent,
					unsubscribeUrl: confirmationUrl,
					oneClickUnsubscribeUrl: oneClickUrl,
				});
			} catch (error) {
				await failMarketNewsDelivery(claim);
				throw error;
			}

			if (!accepted) {
				await failMarketNewsDelivery(claim);
				return { status: "skipped", reason: "suppressed_before_send" };
			}
			if (!(await completeMarketNewsDelivery(claim))) {
				throw new Error("Market-news delivery lease was lost after sending");
			}

			return { status: "sent" };
		});
	},
);
