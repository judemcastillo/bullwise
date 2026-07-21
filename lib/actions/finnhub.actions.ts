"use server";

import {
	formatArticle,
	getDateRange,
	validateArticle,
} from "@/lib/utils";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const NEXT_PUBLIC_FINNHUB_API_KEY =
	process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? "";
const MAX_NEWS_ARTICLES = 6;

function isRawNewsArticle(value: unknown): value is RawNewsArticle {
	if (typeof value !== "object" || value === null) return false;

	const article = value as Record<string, unknown>;
	return typeof article.id === "number";
}

export async function fetchJSON<T>(
	url: string,
	revalidateSeconds?: number,
): Promise<T> {
	const response = await fetch(
		url,
		revalidateSeconds !== undefined
			? {
					cache: "force-cache",
					next: { revalidate: revalidateSeconds },
				}
			: { cache: "no-store" },
	);

	if (!response.ok) {
		throw new Error(
			`Finnhub request failed with ${response.status} ${response.statusText}`,
		);
	}

	return (await response.json()) as T;
}

function buildFinnhubUrl(
	path: string,
	params: Record<string, string> = {},
): string {
	const searchParams = new URLSearchParams({
		...params,
		token: NEXT_PUBLIC_FINNHUB_API_KEY,
	});

	return `${FINNHUB_BASE_URL}/${path}?${searchParams.toString()}`;
}

async function fetchArticleList(url: string): Promise<RawNewsArticle[]> {
	const payload = await fetchJSON<unknown>(url);
	return Array.isArray(payload) ? payload.filter(isRawNewsArticle) : [];
}

function articleKey(article: RawNewsArticle): string {
	return `${article.id}|${article.url ?? ""}|${article.headline ?? ""}`;
}

async function getGeneralNews(): Promise<MarketNewsArticle[]> {
	const articles = await fetchArticleList(
		buildFinnhubUrl("news", { category: "general" }),
	);
	const seenIds = new Set<number>();
	const seenUrls = new Set<string>();
	const seenHeadlines = new Set<string>();

	return articles
		.filter(validateArticle)
		.filter((article) => {
			const headline = article.headline.trim().toLowerCase();
			const url = article.url.trim();
			if (
				seenIds.has(article.id) ||
				seenUrls.has(url) ||
				seenHeadlines.has(headline)
			) {
				return false;
			}

			seenIds.add(article.id);
			seenUrls.add(url);
			seenHeadlines.add(headline);
			return true;
		})
		.sort((first, second) => second.datetime - first.datetime)
		.slice(0, MAX_NEWS_ARTICLES)
		.map((article, index) => formatArticle(article, false, undefined, index));
}

export async function getNews(
	symbols?: string[],
): Promise<MarketNewsArticle[]> {
	try {
		const cleanedSymbols = Array.from(
			new Set(
				(symbols ?? [])
					.map((symbol) => symbol.trim().toUpperCase())
					.filter((symbol) => symbol.length > 0),
			),
		);

		if (cleanedSymbols.length === 0) return await getGeneralNews();

		const { from, to } = getDateRange(5);
		const articlesBySymbol = new Map<string, RawNewsArticle[]>();
		const usedArticles = new Set<string>();
		const companyNews: MarketNewsArticle[] = [];

		const maxRounds = Math.max(MAX_NEWS_ARTICLES, cleanedSymbols.length);
		for (let round = 0; round < maxRounds && companyNews.length < MAX_NEWS_ARTICLES; round += 1) {
			const symbol = cleanedSymbols[round % cleanedSymbols.length];
			let articles = articlesBySymbol.get(symbol);

			if (!articles) {
				try {
					articles = await fetchArticleList(
						buildFinnhubUrl("company-news", { symbol, from, to }),
					);
				} catch (error: unknown) {
					console.error(`Error fetching news for ${symbol}:`, error);
					articles = [];
				}
				articlesBySymbol.set(symbol, articles);
			}

			const article = articles
				.filter(validateArticle)
				.find((candidate) => !usedArticles.has(articleKey(candidate)));

			if (!article) continue;

			usedArticles.add(articleKey(article));
			companyNews.push(formatArticle(article, true, symbol, round));
		}

		if (companyNews.length === 0) return await getGeneralNews();

		return companyNews
			.sort((first, second) => second.datetime - first.datetime)
			.slice(0, MAX_NEWS_ARTICLES);
	} catch (error: unknown) {
		console.error("Error fetching Finnhub news:", error);
		throw new Error("Failed to fetch news");
	}
}
