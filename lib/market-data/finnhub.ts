import "server-only";

import {
	formatArticle,
	getDateRange,
	type ValidNewsArticle,
	validateArticle,
} from "@/lib/utils";
import { getFinnhubApiKey } from "@/lib/market-data/finnhub-config";
import { normalizeFinnhubSearchResults } from "@/lib/market-data/stock-search";
import { POPULAR_STOCK_SYMBOLS } from "../constants";
import { unstable_rethrow } from "next/navigation";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const MAX_NEWS_ARTICLES = 6;
const NEWS_REQUEST_CONCURRENCY = 3;
const FINNHUB_REQUEST_TIMEOUT_MS = 6000;

type FinnhubCompanyProfile = {
	name?: string;
	ticker?: string;
};

function isRawNewsArticle(value: unknown): value is RawNewsArticle {
	if (typeof value !== "object" || value === null) return false;

	const article = value as Record<string, unknown>;
	return typeof article.id === "number";
}

async function fetchJSON<T>(
	url: string,
	revalidateSeconds?: number,
): Promise<T> {
	const response = await fetch(
		url,
		revalidateSeconds !== undefined
			? {
					cache: "force-cache",
					next: { revalidate: revalidateSeconds },
					signal: AbortSignal.timeout(FINNHUB_REQUEST_TIMEOUT_MS),
				}
			: {
					cache: "no-store",
					signal: AbortSignal.timeout(FINNHUB_REQUEST_TIMEOUT_MS),
				},
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
		token: getFinnhubApiKey(),
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
		.map((article) => formatArticle(article, false));
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
		const symbolsToFetch = cleanedSymbols.slice(0, MAX_NEWS_ARTICLES);
		const articlesBySymbol = new Map<string, ValidNewsArticle[]>();
		const usedArticles = new Set<string>();
		const companyNews: MarketNewsArticle[] = [];

		for (
			let offset = 0;
			offset < symbolsToFetch.length;
			offset += NEWS_REQUEST_CONCURRENCY
		) {
			const batch = symbolsToFetch.slice(
				offset,
				offset + NEWS_REQUEST_CONCURRENCY,
			);
			const results = await Promise.all(
				batch.map(async (symbol) => {
					try {
						const articles = await fetchArticleList(
							buildFinnhubUrl("company-news", { symbol, from, to }),
						);
						return [symbol, articles.filter(validateArticle)] as const;
					} catch (error: unknown) {
						const reason =
							error instanceof Error ? error.message : "unknown error";
						console.warn(`Unable to load news for ${symbol} (${reason})`);
						return [symbol, [] as ValidNewsArticle[]] as const;
					}
				}),
			);

			for (const [symbol, articles] of results) {
				articlesBySymbol.set(symbol, articles);
			}
		}

		const nextArticleIndex = new Map(
			symbolsToFetch.map((symbol) => [symbol, 0]),
		);
		while (companyNews.length < MAX_NEWS_ARTICLES) {
			let addedArticle = false;

			for (const symbol of symbolsToFetch) {
				const articles = articlesBySymbol.get(symbol) ?? [];
				let index = nextArticleIndex.get(symbol) ?? 0;

				while (
					index < articles.length &&
					usedArticles.has(articleKey(articles[index]))
				) {
					index += 1;
				}

				const article = articles[index];
				nextArticleIndex.set(symbol, index + 1);
				if (!article) continue;

				usedArticles.add(articleKey(article));
				companyNews.push(formatArticle(article, true, symbol));
				addedArticle = true;
				if (companyNews.length === MAX_NEWS_ARTICLES) break;
			}

			if (!addedArticle) break;
		}

		if (companyNews.length === 0) return await getGeneralNews();

		return companyNews
			.sort((first, second) => second.datetime - first.datetime)
			.slice(0, MAX_NEWS_ARTICLES);
	} catch (error: unknown) {
		unstable_rethrow(error);
		const reason = error instanceof Error ? error.message : "unknown error";
		console.warn(`Finnhub news unavailable (${reason})`);
		return [];
	}
}

export async function searchFinnhubStocks(
	query: string | undefined,
	userWatchlistSymbols: string[],
): Promise<StockWithWatchlistStatus[]> {
	try {
		const token = getFinnhubApiKey();
		const trimmed = typeof query === "string" ? query.trim() : "";
		let results: unknown[] = [];

		if (!trimmed) {
			const top = POPULAR_STOCK_SYMBOLS.slice(0, 10);
			const profiles = await Promise.all(
				top.map(async (symbol) => {
					try {
						const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${token}`;
						const profile = await fetchJSON<FinnhubCompanyProfile>(
							url,
							3600,
						);
						return { profile, symbol };
					} catch (error) {
						console.error("Error fetching profile2 for", symbol, error);
						return { profile: null, symbol };
					}
				}),
			);

			results = profiles.map(({ profile, symbol }) => ({
				symbol,
				description: profile?.name || profile?.ticker,
				displaySymbol: symbol,
				type: "Common Stock",
			}));
		} else {
			const url = `${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(
				trimmed,
			)}&token=${token}`;
			const data = await fetchJSON<FinnhubSearchResponse>(url, 1800);
			results = Array.isArray(data?.result) ? data.result : [];
		}

		return normalizeFinnhubSearchResults(results, userWatchlistSymbols);
	} catch (err) {
		unstable_rethrow(err);
		console.error("Error in stock search:", err);
		return [];
	}
}
