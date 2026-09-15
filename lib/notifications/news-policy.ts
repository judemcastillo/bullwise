import type { MarketNewsCategory } from "@/lib/email/communication-policy";
import { safeArticles } from "./policy";
export function selectDigestArticles(
	general: MarketNewsArticle[],
	watchlist: MarketNewsArticle[],
	categories: MarketNewsCategory[],
) {
	const selected = general.filter(
		(a) =>
			categories.includes("general_market") ||
			(categories.includes("earnings") &&
				/earning|quarterly results|eps|revenue/i.test(
					`${a.category} ${a.headline}`,
				)) ||
			(categories.includes("economic_news") &&
				/econom|inflation|interest rate|federal reserve|central bank|employment|gdp/i.test(
					`${a.category} ${a.headline}`,
				)),
	);
	if (categories.includes("watchlist_news"))
		selected.push(...watchlist.filter((a) => a.related));
	return safeArticles(
		selected
			.sort((a, b) => b.datetime - a.datetime)
			.map((a) => ({ headline: a.headline, url: a.url, source: a.source })),
	);
}
