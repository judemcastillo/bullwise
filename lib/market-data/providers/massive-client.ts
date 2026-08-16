const MASSIVE_BASE_URL = "https://api.massive.com";
const MASSIVE_REQUEST_TIMEOUT_MS = 30000;
const MASSIVE_PAGE_LIMIT = 1000;
const MASSIVE_MAX_SYNC_PAGES = 25;
const MASSIVE_STOCK_PAGE_INTERVAL_MS = 13000;
const MASSIVE_RATE_LIMIT_RETRY_MS = 15000;
const MASSIVE_MAX_RATE_LIMIT_RETRIES = 5;

export type MassiveReferenceTicker = {
	ticker: string;
	name: string;
	market: "fx" | "crypto" | "stocks" | "indices" | "otc";
	active?: boolean;
	base_currency_symbol?: string;
	base_currency_name?: string;
	currency_symbol?: string;
	currency_name?: string;
	locale?: string;
	type?: string;
	primary_exchange?: string;
	composite_figi?: string;
	share_class_figi?: string;
};

type MassiveTickerResponse = {
	status?: string;
	results?: MassiveReferenceTicker[];
	next_url?: string;
	error?: string;
	message?: string;
};

async function fetchTickerPage(
	url: string,
	apiKey: string,
	fetchImpl: typeof fetch,
) {
	const requestUrl = new URL(url);
	if (requestUrl.origin !== MASSIVE_BASE_URL) {
		throw new Error("Massive returned an invalid pagination URL");
	}
	requestUrl.searchParams.set("apiKey", apiKey);
	for (let attempt = 0; attempt <= MASSIVE_MAX_RATE_LIMIT_RETRIES; attempt += 1) {
		const response = await fetchImpl(requestUrl, {
			cache: "no-store",
			signal: AbortSignal.timeout(MASSIVE_REQUEST_TIMEOUT_MS),
		});
		const payload = (await response.json()) as MassiveTickerResponse;
		if (response.ok) return payload;
		if (response.status === 429 && attempt < MASSIVE_MAX_RATE_LIMIT_RETRIES) {
			const retryAfterSeconds = Number(response.headers.get("retry-after"));
			const retryAfterMs = Number.isFinite(retryAfterSeconds)
				? Math.max(retryAfterSeconds * 1000, MASSIVE_RATE_LIMIT_RETRY_MS)
				: MASSIVE_RATE_LIMIT_RETRY_MS;
			await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
			continue;
		}
		throw new Error(
			payload.error ||
				payload.message ||
				`Massive request failed with ${response.status}`,
		);
	}
	throw new Error("Massive rate limit retry budget was exhausted");
}

export async function listMassiveForexTickers({
	apiKey,
	fetchImpl = fetch,
}: {
	apiKey: string;
	fetchImpl?: typeof fetch;
}) {
	return listMassiveTickers({
		apiKey,
		market: "fx",
		fetchImpl,
	});
}

async function listMassiveTickers({
	apiKey,
	market,
	fetchImpl,
}: {
	apiKey: string;
	market: MassiveReferenceTicker["market"];
	fetchImpl: typeof fetch;
}) {
	if (!apiKey.trim()) throw new Error("MASSIVE_API_KEY is not configured");
	const params = new URLSearchParams({
		market,
		active: "true",
		limit: String(MASSIVE_PAGE_LIMIT),
		sort: "ticker",
		order: "asc",
	});
	let nextUrl: string | undefined =
		`${MASSIVE_BASE_URL}/v3/reference/tickers?${params.toString()}`;
	const tickers = new Map<string, MassiveReferenceTicker>();
	let pages = 0;

	while (nextUrl && pages < MASSIVE_MAX_SYNC_PAGES) {
		if (market === "stocks" && pages > 0) {
			await new Promise((resolve) =>
				setTimeout(resolve, MASSIVE_STOCK_PAGE_INTERVAL_MS),
			);
		}
		const payload = await fetchTickerPage(nextUrl, apiKey, fetchImpl);
		for (const ticker of payload.results ?? []) {
			if (ticker.market === market && typeof ticker.ticker === "string") {
				tickers.set(ticker.ticker, ticker);
			}
		}
		nextUrl = payload.next_url;
		pages += 1;
	}

	if (nextUrl) {
		throw new Error(
			`Massive ${market} catalog exceeded the ${MASSIVE_MAX_SYNC_PAGES}-page safety limit`,
		);
	}

	return [...tickers.values()];
}

export async function listMassiveStockTickers({
	apiKey,
	fetchImpl = fetch,
}: {
	apiKey: string;
	fetchImpl?: typeof fetch;
}) {
	return listMassiveTickers({ apiKey, market: "stocks", fetchImpl });
}

export async function listMassiveCryptoTickers({
	apiKey,
	fetchImpl = fetch,
}: {
	apiKey: string;
	fetchImpl?: typeof fetch;
}) {
	return listMassiveTickers({ apiKey, market: "crypto", fetchImpl });
}
