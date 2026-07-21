import { inngest } from "@/lib/inngest/client";
import {
	NEWS_SUMMARY_EMAIL_PROMPT,
	PERSONALIZED_WELCOME_EMAIL_PROMPT,
} from "@/lib/inngest/prompts";
import { getNews } from "../actions/finnhub.actions";
import { getWatchlistSymbolsByUserId } from "../actions/watchlist.actions";
import { sendNewsSummaryEmail, sendWelcomeEmail } from "../nodemailer";
import { getAllUsersForNewsEmail } from "../actions/user.actions";
import { getFormattedTodayDate } from "../utils";

export const sendSignUpEmail = inngest.createFunction(
	{
		id: "sign-up-email",
		triggers: [{ event: "app/user.created" }],
	},
	async ({ event, step }) => {
		const userProfile = `
            - Country: ${event.data.country}
            - Investment goals: ${event.data.investmentGoals}
            - Risk tolerance: ${event.data.riskTolerance}
            - Preferred industry: ${event.data.preferredIndustry}
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
	{
		id: "daily-news-summary",
		triggers: [{ event: "app/send.daily.news" }, { cron: "0 12 * * *" }],
	},
	async ({ step }) => {
		// 1. Get all users eligible for news delivery.
		const users = await step.run("get-all-users", getAllUsersForNewsEmail);

		// 2. Fetch up to six personalized articles per user.
		const newsByUser = await step.run("fetch-news-for-users", async () =>
			Promise.all(
				users.map(async (user) => {
					const symbols = await getWatchlistSymbolsByUserId(user.id);
					let news: MarketNewsArticle[] = [];

					try {
						news = await getNews(symbols);
					} catch (error: unknown) {
						console.error(`Error fetching news for ${user.id}:`, error);
					}

					return { user, news: news.slice(0, 6) };
				}),
			),
		);

		// 3. TODO: Summarize newsByUser via AI.

		const userNewsSummaries: { user: User; newsContent: string | null }[] = [];

		for (const { user, news } of newsByUser) {
			try {
				const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace(
					"{{newsData}}",
					JSON.stringify(news, null, 2),
				);

				const response = await step.ai.infer(`summarize-news-${user.email}`, {
					model: step.ai.models.gemini({ model: "gemini-3.1-flash-lite" }),
					body: {
						contents: [{ role: "user", parts: [{ text: prompt }] }],
					},
				});

				const part = response.candidates?.[0]?.content?.parts?.[0];
				const newsContent =
					(part && "text" in part ? part.text : null) || "No market news.";

				userNewsSummaries.push({ user, newsContent });
			} catch {
				console.error("Failed to summarize news for:", user.id);
				userNewsSummaries.push({ user, newsContent: null });
			}
		}
		// 4. TODO: Send each user's summary email.
		await step.run("send-news-emails", async () => {
			const results = await Promise.allSettled(
				userNewsSummaries.map(async ({ user, newsContent }) => {
					if (!newsContent) return false;
					return await sendNewsSummaryEmail({
						email: user.email,
						date: getFormattedTodayDate(),
						newsContent,
					});
				}),
			);

			results.forEach((result, index) => {
				if (result.status === "rejected") {
					console.error(
						`Failed to send news email for ${userNewsSummaries[index].user.id}:`,
						result.reason,
					);
				}
			});
		});

		return {
			success: true,
			message: "Daily news summary emails sent successfully",
		};
	},
);
