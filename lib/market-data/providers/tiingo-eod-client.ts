import { normalizeMarketNumber } from "@/lib/market-data/normalization";
import type {
	BarsProvider,
	BarsRequest,
	MarketBar,
	MarketBars,
} from "@/lib/market-data/types";

const DEFAULT_BASE_URL = "https://api.tiingo.com";

type TiingoEodBar = {
	date?: unknown;
	adjOpen?: unknown;
	adjHigh?: unknown;
	adjLow?: unknown;
	adjClose?: unknown;
	adjVolume?: unknown;
};

type TiingoError = {
	detail?: unknown;
	message?: unknown;
};

type TiingoEodProviderOptions = {
	apiToken: string;
	baseUrl?: string;
	fetchImpl?: typeof fetch;
	timeoutMs?: number;
};

function validateRequest(request: BarsRequest) {
	if (request.provider.toLowerCase() !== "tiingo") {
		throw new Error("Tiingo cannot serve a binding for another provider");
	}
	if (request.assetClass !== "equity") {
		throw new Error("Tiingo EOD research bars currently support equities only");
	}
	if (request.interval !== "1d") {
		throw new Error("Tiingo EOD research bars currently support daily intervals only");
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

function parseBar(value: TiingoEodBar, pricePrecision: number | undefined): MarketBar | null {
	const startedAt = typeof value.date === "string" ? new Date(value.date) : null;
	const open = normalizeMarketNumber(value.adjOpen, pricePrecision);
	const high = normalizeMarketNumber(value.adjHigh, pricePrecision);
	const low = normalizeMarketNumber(value.adjLow, pricePrecision);
	const close = normalizeMarketNumber(value.adjClose, pricePrecision);
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
	const volume = normalizeMarketNumber(value.adjVolume, undefined, { allowZero: true });
	return {
		startedAt,
		open,
		high,
		low,
		close,
		...(volume !== null ? { volume } : {}),
	};
}

function errorMessage(payload: unknown, status: number) {
	if (payload && typeof payload === "object") {
		const error = payload as TiingoError;
		if (typeof error.detail === "string" && error.detail.trim()) return error.detail;
		if (typeof error.message === "string" && error.message.trim()) return error.message;
	}
	return `Tiingo request failed with ${status}`;
}

export class TiingoEodProvider implements BarsProvider {
	readonly provider = "tiingo";
	private readonly apiToken: string;
	private readonly baseUrl: string;
	private readonly fetchImpl: typeof fetch;
	private readonly timeoutMs: number;

	constructor(options: TiingoEodProviderOptions) {
		this.apiToken = options.apiToken.trim();
		this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
		this.fetchImpl = options.fetchImpl ?? fetch;
		this.timeoutMs = options.timeoutMs ?? 30_000;
	}

	async getBars(request: BarsRequest): Promise<MarketBars> {
		if (!this.apiToken) throw new Error("Tiingo API token is not configured");
		validateRequest(request);
		const symbol = encodeURIComponent(request.providerSymbol.trim().toLowerCase());
		const url = new URL(`${this.baseUrl}/tiingo/daily/${symbol}/prices`);
		url.search = new URLSearchParams({
			startDate: request.from.toISOString().slice(0, 10),
			endDate: request.to.toISOString().slice(0, 10),
			resampleFreq: "daily",
		}).toString();
		const response = await this.fetchImpl(url, {
			cache: "no-store",
			headers: { Authorization: `Token ${this.apiToken}` },
			signal: AbortSignal.timeout(this.timeoutMs),
		});
		const payload = (await response.json()) as unknown;
		if (!response.ok) throw new Error(errorMessage(payload, response.status));
		if (!Array.isArray(payload)) throw new Error("Tiingo returned an invalid EOD payload");
		const barsByTimestamp = new Map<number, MarketBar>();
		for (const value of payload as TiingoEodBar[]) {
			const bar = parseBar(value, request.pricePrecision);
			if (bar) barsByTimestamp.set(bar.startedAt.getTime(), bar);
		}
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
