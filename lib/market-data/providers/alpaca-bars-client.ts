import { normalizeMarketNumber } from "@/lib/market-data/normalization";
import type {
	BarsProvider,
	BarsRequest,
	MarketBar,
	MarketBars,
} from "@/lib/market-data/types";

const DEFAULT_BASE_URL = "https://data.alpaca.markets";
const MAX_PAGE_LIMIT = 10_000;
const MAX_PAGES = 20;

type AlpacaBar = {
	t?: unknown;
	o?: unknown;
	h?: unknown;
	l?: unknown;
	c?: unknown;
	v?: unknown;
	vw?: unknown;
	n?: unknown;
};

type AlpacaBarsPayload = {
	bars?: unknown;
	next_page_token?: unknown;
	message?: unknown;
};

type AlpacaBarsProviderOptions = {
	apiKeyId: string;
	apiSecretKey: string;
	baseUrl?: string;
	fetchImpl?: typeof fetch;
	timeoutMs?: number;
};

function validateRequest(request: BarsRequest) {
	if (request.provider.toLowerCase() !== "alpaca") {
		throw new Error("Alpaca cannot serve a binding for another provider");
	}
	if (request.assetClass !== "equity") {
		throw new Error("Alpaca research bars currently support equities only");
	}
	if (request.interval !== "1d") {
		throw new Error("Alpaca research bars currently support daily intervals only");
	}
	if (!request.providerSymbol.trim()) throw new Error("Provider symbol is required");
	if (
		Number.isNaN(request.from.getTime()) ||
		Number.isNaN(request.to.getTime()) ||
		request.from >= request.to
	) {
		throw new Error("A valid ascending historical range is required");
	}
}

function parseBar(
	value: AlpacaBar,
	pricePrecision: number | undefined,
): MarketBar | null {
	const startedAt = typeof value.t === "string" ? new Date(value.t) : null;
	const open = normalizeMarketNumber(value.o, pricePrecision);
	const high = normalizeMarketNumber(value.h, pricePrecision);
	const low = normalizeMarketNumber(value.l, pricePrecision);
	const close = normalizeMarketNumber(value.c, pricePrecision);
	if (!startedAt || Number.isNaN(startedAt.getTime()) || !open || !high || !low || !close) {
		return null;
	}
	const prices = [open, high, low, close].map(Number);
	if (
		Number(high) < Math.max(prices[0], prices[2], prices[3]) ||
		Number(low) > Math.min(prices[0], prices[1], prices[3])
	) {
		return null;
	}
	const volume = normalizeMarketNumber(value.v, undefined, { allowZero: true });
	const vwap = normalizeMarketNumber(value.vw, pricePrecision);
	const transactionCount =
		typeof value.n === "number" &&
		Number.isSafeInteger(value.n) &&
		value.n >= 0
			? value.n
			: undefined;
	return {
		startedAt,
		open,
		high,
		low,
		close,
		...(volume !== null ? { volume } : {}),
		...(vwap !== null ? { vwap } : {}),
		...(transactionCount !== undefined ? { transactionCount } : {}),
	};
}

export class AlpacaBarsProvider implements BarsProvider {
	readonly provider = "alpaca";
	private readonly apiKeyId: string;
	private readonly apiSecretKey: string;
	private readonly baseUrl: string;
	private readonly fetchImpl: typeof fetch;
	private readonly timeoutMs: number;

	constructor(options: AlpacaBarsProviderOptions) {
		this.apiKeyId = options.apiKeyId.trim();
		this.apiSecretKey = options.apiSecretKey.trim();
		this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
		this.fetchImpl = options.fetchImpl ?? fetch;
		this.timeoutMs = options.timeoutMs ?? 30_000;
	}

	async getBars(request: BarsRequest): Promise<MarketBars> {
		if (!this.apiKeyId || !this.apiSecretKey) {
			throw new Error("Alpaca API credentials are not configured");
		}
		validateRequest(request);
		const symbol = encodeURIComponent(request.providerSymbol.trim().toUpperCase());
		const url = new URL(`${this.baseUrl}/v2/stocks/${symbol}/bars`);
		url.search = new URLSearchParams({
			timeframe: "1Day",
			start: request.from.toISOString(),
			end: request.to.toISOString(),
			limit: String(
				Math.max(1, Math.min(Math.trunc(request.limit ?? MAX_PAGE_LIMIT), MAX_PAGE_LIMIT)),
			),
			adjustment: "all",
			feed: "sip",
			sort: "asc",
		}).toString();
		const barsByTimestamp = new Map<number, MarketBar>();
		let pageToken: string | null = null;
		let pages = 0;
		do {
			if (pageToken) url.searchParams.set("page_token", pageToken);
			const response = await this.fetchImpl(url, {
				cache: "no-store",
				headers: {
					"APCA-API-KEY-ID": this.apiKeyId,
					"APCA-API-SECRET-KEY": this.apiSecretKey,
				},
				signal: AbortSignal.timeout(this.timeoutMs),
			});
			const payload = (await response.json()) as AlpacaBarsPayload;
			if (!response.ok) {
				const message =
					typeof payload.message === "string"
						? payload.message
						: `Alpaca request failed with ${response.status}`;
				if (response.status === 403 && /subscription|feed|sip/i.test(message)) {
					throw new Error(
						`Alpaca historical SIP access was denied: ${message}. IEX fallback is intentionally disabled.`,
					);
				}
				throw new Error(message);
			}
			const rawBars = Array.isArray(payload.bars)
				? (payload.bars as AlpacaBar[])
				: [];
			for (const rawBar of rawBars) {
				const bar = parseBar(rawBar, request.pricePrecision);
				if (bar) barsByTimestamp.set(bar.startedAt.getTime(), bar);
			}
			pageToken =
				typeof payload.next_page_token === "string" &&
				payload.next_page_token.trim()
					? payload.next_page_token
					: null;
			pages += 1;
			if (pageToken && pages >= MAX_PAGES) {
				throw new Error(`Alpaca historical range exceeded ${MAX_PAGES} pages`);
			}
		} while (pageToken);
		const bars = [...barsByTimestamp.values()].sort(
			(left, right) => left.startedAt.getTime() - right.startedAt.getTime(),
		);
		return {
			instrumentId: request.instrumentId,
			provider: this.provider,
			providerSymbol: request.providerSymbol.trim().toUpperCase(),
			currency: request.expectedCurrency.toUpperCase(),
			interval: "1d",
			from: request.from,
			to: request.to,
			adjusted: true,
			timeliness: "historical",
			bars,
		};
	}
}
