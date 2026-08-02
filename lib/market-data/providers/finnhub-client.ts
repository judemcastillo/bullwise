import type {
	MarketQuote,
	QuoteProvider,
	QuoteRequest,
} from "@/lib/market-data/types";

type FinnhubQuotePayload = {
	c?: unknown;
	t?: unknown;
};

type FinnhubQuoteProviderOptions = {
	apiKey: string;
	baseUrl?: string;
	fetchImpl?: typeof fetch;
	maxConcurrency?: number;
};

export class FinnhubQuoteProvider implements QuoteProvider {
	readonly provider = "finnhub";
	private readonly apiKey: string;
	private readonly baseUrl: string;
	private readonly fetchImpl: typeof fetch;
	private readonly maxConcurrency: number;

	constructor(options: FinnhubQuoteProviderOptions) {
		this.apiKey = options.apiKey;
		this.baseUrl = options.baseUrl ?? "https://finnhub.io/api/v1";
		this.fetchImpl = options.fetchImpl ?? fetch;
		this.maxConcurrency = Math.max(
			1,
			Math.min(options.maxConcurrency ?? 5, 20),
		);
	}

	async getQuotes(
		requests: QuoteRequest[],
	): Promise<Map<string, MarketQuote>> {
		if (!this.apiKey) throw new Error("FINNHUB_API_KEY is not configured");

		const supportedRequests = requests.filter(
			(request) =>
				request.provider.toLowerCase() === this.provider &&
				request.assetClass === "equity",
		);
		const requestsBySymbol = new Map<string, QuoteRequest[]>();

		for (const request of supportedRequests) {
			const symbol = request.providerSymbol.trim().toUpperCase();
			if (!symbol) continue;
			const matching = requestsBySymbol.get(symbol) ?? [];
			matching.push(request);
			requestsBySymbol.set(symbol, matching);
		}

		const results = new Map<string, MarketQuote>();
		const symbolEntries = Array.from(requestsBySymbol.entries());
		let failures = 0;

		for (
			let offset = 0;
			offset < symbolEntries.length;
			offset += this.maxConcurrency
		) {
			const batch = symbolEntries.slice(offset, offset + this.maxConcurrency);
			await Promise.all(
				batch.map(async ([symbol, matching]) => {
				try {
					const params = new URLSearchParams({ symbol, token: this.apiKey });
					const response = await this.fetchImpl(
						`${this.baseUrl}/quote?${params.toString()}`,
						{ cache: "no-store", signal: AbortSignal.timeout(8000) },
					);

					if (!response.ok) {
						failures += 1;
						return;
					}
					const payload = (await response.json()) as FinnhubQuotePayload;
					const price = typeof payload.c === "number" ? payload.c : Number.NaN;
					const timestamp =
						typeof payload.t === "number" ? payload.t : Number.NaN;

					if (
						!Number.isFinite(price) ||
						price <= 0 ||
						!Number.isFinite(timestamp) ||
						timestamp <= 0
					) {
						failures += 1;
						return;
					}

					for (const request of matching) {
						results.set(request.instrumentId, {
							instrumentId: request.instrumentId,
							provider: this.provider,
							providerSymbol: symbol,
							price: String(price),
							currency: request.expectedCurrency.toUpperCase(),
							observedAt: new Date(timestamp * 1000),
						});
					}
				} catch (error) {
					failures += 1;
					console.error(`Unable to fetch Finnhub quote for ${symbol}:`, error);
				}
				}),
			);
		}

		if (symbolEntries.length > 0 && failures === symbolEntries.length) {
			throw new Error("Finnhub did not return any valid quotes");
		}

		return results;
	}
}
