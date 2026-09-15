import "server-only";
import Notification from "@/database/models/notification.model";
import { getNews } from "@/lib/market-data/finnhub";
import { getWatchlistSymbolsForUser } from "@/lib/data/watchlist";
import {
	createNotification,
	getInAppPreference,
	notificationsEnabledAt,
} from "./store";
import { isEligibleRecipient } from "./recipients";
import { selectDigestArticles } from "./news-policy";
import {
	deliverInboxNewsWorkflow,
	type InboxNewsRequest,
} from "./news-workflow";
export { parseInboxNewsRequest } from "./news-workflow";
export async function deliverInboxNews(request: InboxNewsRequest) {
	return deliverInboxNewsWorkflow(request, {
		enabledAt: notificationsEnabledAt,
		eligible: isEligibleRecipient,
		preference: getInAppPreference,
		exists: async (userId, sourceKey) =>
			Boolean(await Notification.exists({ userId, sourceKey })),
		articles: async (userId, preference) => {
			const symbols = preference.categories.includes("watchlist_news")
				? await getWatchlistSymbolsForUser(userId)
				: [];
			const [general, watchlist] = await Promise.all([
				preference.categories.some((c) => c !== "watchlist_news")
					? getNews()
					: Promise.resolve([]),
				symbols.length ? getNews(symbols) : Promise.resolve([]),
			]);
			return selectDigestArticles(general, watchlist, preference.categories);
		},
		save: async (request, sourceKey, articles) => {
			await createNotification({
				userId: request.userId,
				type: "market_news",
				sourceKey,
				title: `${request.frequency === "daily" ? "Daily" : "Weekly"} market news · ${request.periodKey}`,
				body: "Your market-news digest",
				articles,
				destination: null,
			});
		},
	});
}
