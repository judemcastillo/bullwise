import type {
	AssetClass,
	ProviderBinding,
} from "@/types/instruments";

export const MARKET_DATA_INTERVALS = [
	"1m",
	"5m",
	"15m",
	"30m",
	"1h",
	"4h",
	"1d",
	"1w",
	"1mo",
] as const;

export type MarketDataInterval = (typeof MARKET_DATA_INTERVALS)[number];
export type MarketState = "open" | "closed" | "unknown";
export type DataTimeliness =
	| "real_time"
	| "delayed"
	| "end_of_day"
	| "historical"
	| "unknown";

export type MarketDataInstrument = {
	instrumentId: string;
	canonicalKey: string;
	assetClass: AssetClass;
	displaySymbol: string;
	quoteCurrency: string;
	pricePrecision: number;
	calendarId?: string;
	providerBindings: ProviderBinding[];
};

export type QuoteRequest = {
	instrumentId: string;
	assetClass: AssetClass;
	provider: string;
	providerSymbol: string;
	expectedCurrency: string;
	pricePrecision?: number;
	calendarId?: string;
};

export type MarketQuote = {
	instrumentId: string;
	provider: string;
	providerSymbol: string;
	price: string;
	currency: string;
	observedAt: Date;
	marketState: MarketState;
	timeliness: DataTimeliness;
};

export type BarsRequest = QuoteRequest & {
	interval: MarketDataInterval;
	from: Date;
	to: Date;
	limit?: number;
};

export type MarketBar = {
	startedAt: Date;
	open: string;
	high: string;
	low: string;
	close: string;
	volume?: string;
	vwap?: string;
	transactionCount?: number;
};

export type MarketBars = {
	instrumentId: string;
	provider: string;
	providerSymbol: string;
	currency: string;
	interval: MarketDataInterval;
	from: Date;
	to: Date;
	adjusted: boolean;
	timeliness: DataTimeliness;
	bars: MarketBar[];
};

export interface QuoteProvider {
	readonly provider: string;
	getQuotes(requests: QuoteRequest[]): Promise<Map<string, MarketQuote>>;
}

export interface BarsProvider {
	readonly provider: string;
	getBars(request: BarsRequest): Promise<MarketBars>;
}
