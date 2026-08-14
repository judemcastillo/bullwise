import { normalizeMarketNumber } from "@/lib/market-data/normalization";
import type {
	BarsProvider,
	BarsRequest,
	MarketBar,
	MarketDataInterval,
	MarketBars,
} from "@/lib/market-data/types";

const DEFAULT_BASE_URL = "https://api.massive.com";
const MAX_LIMIT = 50_000;

type MassiveAggregate = {
	o?: unknown;
	h?: unknown;
	l?: unknown;
	c?: unknown;
	v?: unknown;
	vw?: unknown;
	n?: unknown;
	t?: unknown;
};

type MassiveAggregatesPayload = {
	adjusted?: unknown;
	results?: unknown;
	next_url?: unknown;
	error?: unknown;
	message?: unknown;
};

type MassiveBarsProviderOptions = {
	apiKey: string;
	baseUrl?: string;
	fetchImpl?: typeof fetch;
	timeoutMs?: number;
};

const INTERVALS: Record<
	MarketDataInterval,
	{ multiplier: number; timespan: string }
> = {
	"1m": { multiplier: 1, timespan: "minute" },
	"5m": { multiplier: 5, timespan: "minute" },
	"15m": { multiplier: 15, timespan: "minute" },
	"30m": { multiplier: 30, timespan: "minute" },
	"1h": { multiplier: 1, timespan: "hour" },
	"4h": { multiplier: 4, timespan: "hour" },
	"1d": { multiplier: 1, timespan: "day" },
	"1w": { multiplier: 1, timespan: "week" },
	"1mo": { multiplier: 1, timespan: "month" },
};

function validateRequest(request: BarsRequest) {
	if (request.provider.toLowerCase() !== "massive") {
		throw new Error("Massive cannot serve a binding for another provider");
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

function parseAggregate(
	result: MassiveAggregate,
	pricePrecision: number | undefined,
): MarketBar | null {
	const open = normalizeMarketNumber(result.o, pricePrecision);
	const high = normalizeMarketNumber(result.h, pricePrecision);
	const low = normalizeMarketNumber(result.l, pricePrecision);
	const close = normalizeMarketNumber(result.c, pricePrecision);
	const timestamp = typeof result.t === "number" ? result.t : Number.NaN;

	if (!open || !high || !low || !close || !Number.isFinite(timestamp)) return null;
	const prices = [open, high, low, close].map(Number);
	if (
		Number(high) < Math.max(prices[0], prices[2], prices[3]) ||
		Number(low) > Math.min(prices[0], prices[1], prices[3])
	) {
		return null;
	}

	const volume = normalizeMarketNumber(result.v, undefined, { allowZero: true });
	const vwap = normalizeMarketNumber(result.vw, pricePrecision);
	const transactionCount =
		typeof result.n === "number" &&
		Number.isSafeInteger(result.n) &&
		result.n >= 0
			? result.n
			: undefined;

	return {
		startedAt: new Date(timestamp),
		open,
		high,
		low,
		close,
		...(volume !== null ? { volume } : {}),
		...(vwap !== null ? { vwap } : {}),
		...(transactionCount !== undefined ? { transactionCount } : {}),
	};
}

export class MassiveBarsProvider implements BarsProvider {
	readonly provider = "massive";
	private readonly apiKey: string;
	private readonly baseUrl: string;
	private readonly fetchImpl: typeof fetch;
	private readonly timeoutMs: number;

	constructor(options: MassiveBarsProviderOptions) {
		this.apiKey = options.apiKey.trim();
		this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
		this.fetchImpl = options.fetchImpl ?? fetch;
		this.timeoutMs = options.timeoutMs ?? 15_000;
	}

	async getBars(request: BarsRequest): Promise<MarketBars> {
		if (!this.apiKey) throw new Error("MASSIVE_API_KEY is not configured");
		validateRequest(request);

		const interval = INTERVALS[request.interval];
		const limit = Math.max(1, Math.min(Math.trunc(request.limit ?? 5_000), MAX_LIMIT));
		const from = request.from.getTime();
		const to = request.to.getTime();
		const symbol = encodeURIComponent(request.providerSymbol.trim().toUpperCase());
		const url = new URL(
			`${this.baseUrl}/v2/aggs/ticker/${symbol}/range/${interval.multiplier}/${interval.timespan}/${from}/${to}`,
		);
		url.search = new URLSearchParams({
			adjusted: "true",
			sort: "asc",
			limit: String(limit),
			apiKey: this.apiKey,
		}).toString();

		const response = await this.fetchImpl(url, {
			cache: "no-store",
			signal: AbortSignal.timeout(this.timeoutMs),
		});
		const payload = (await response.json()) as MassiveAggregatesPayload;
		if (!response.ok) {
			throw new Error(
				(typeof payload.error === "string" && payload.error) ||
					(typeof payload.message === "string" && payload.message) ||
					`Massive request failed with ${response.status}`,
			);
		}
		if (typeof payload.next_url === "string" && payload.next_url) {
			throw new Error("Massive historical range exceeded the requested limit");
		}

		const rawResults = Array.isArray(payload.results)
			? (payload.results as MassiveAggregate[])
			: [];
		const barsByTimestamp = new Map<number, MarketBar>();
		for (const rawResult of rawResults) {
			const bar = parseAggregate(rawResult, request.pricePrecision);
			if (bar && !Number.isNaN(bar.startedAt.getTime())) {
				barsByTimestamp.set(bar.startedAt.getTime(), bar);
			}
		}
		const bars = [...barsByTimestamp.values()].sort(
			(left, right) => left.startedAt.getTime() - right.startedAt.getTime(),
		);

		return {
			instrumentId: request.instrumentId,
			provider: this.provider,
			providerSymbol: request.providerSymbol.trim().toUpperCase(),
			currency: request.expectedCurrency.toUpperCase(),
			interval: request.interval,
			from: request.from,
			to: request.to,
			adjusted: payload.adjusted === true,
			timeliness: "historical",
			bars,
		};
	}
}
