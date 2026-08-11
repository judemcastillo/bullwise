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
import { getMarketNewsPreference } from "@/lib/email/market-news-preference";
import { createDailyNewsUnsubscribeUrls } from "@/lib/email/unsubscribe-token";
import { ALERT_EMAIL_DELIVERY_FUNCTION_CONFIG } from "@/lib/inngest/alert-email-delivery.config";
import { ALERT_MONITORING_FUNCTION_CONFIG } from "@/lib/inngest/alert-monitoring.config";
import {
	DAILY_MARKET_NEWS_FUNCTION_CONFIG,
	MARKET_NEWS_DELIVERY_FUNCTION_CONFIG,
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
}: {
	step: BullwiseStepTools;
	frequency: MarketNewsDeliveryFrequency;
}) {
	const MAX_PAGES = 1000;
	const periodKey = await step.run("resolve-market-news-period", () =>
		getMarketNewsPeriodKey(frequency, new Date()),
	);
	let afterUserId: string | undefined;
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

		if (pages >= MAX_PAGES && afterUserId) {
			console.warn(
				`Reached maximum page limit (${MAX_PAGES}). Remaining recipients after userId: ${afterUserId}`,
			);
			break;
		}
	} while (afterUserId);

	return { frequency, periodKey, queued, pages, remainingAfterUserId: afterUserId };
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
			const { connectToDatabase } = await import("@/database/mongoose");
			const { default: EmailDeliveryLog } = await import(
				"@/database/models/email-delivery-log.model"
			);
			await connectToDatabase();

			try {
				await EmailDeliveryLog.create({
					deliveryKey: request.deliveryKey,
					userId: request.userId,
					messageType: "market_news",
					frequency: request.frequency,
					periodKey: request.periodKey,
					deliveredAt: new Date(),
				});
			} catch (error: unknown) {
				if (
					error &&
					typeof error === "object" &&
					"code" in error &&
					error.code === 11000
				) {
					return { status: "skipped", reason: "already_delivered" };
				}
				throw error;
			}

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
			await sendNewsSummaryEmail({
				email: recipient.email,
				frequency: request.frequency,
				date: getFormattedTodayDate(),
				newsContent,
				unsubscribeUrl: confirmationUrl,
				oneClickUnsubscribeUrl: oneClickUrl,
			});

			return { status: "sent" };
		});
	},
);
