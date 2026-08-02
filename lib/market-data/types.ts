import type { AssetClass } from "@/types/alerts";

export type QuoteRequest = {
	instrumentId: string;
	assetClass: AssetClass;
	provider: string;
	providerSymbol: string;
	expectedCurrency: string;
};

export type MarketQuote = {
	instrumentId: string;
	provider: string;
	providerSymbol: string;
	price: string;
	currency: string;
	observedAt: Date;
};

export interface QuoteProvider {
	readonly provider: string;
	getQuotes(requests: QuoteRequest[]): Promise<Map<string, MarketQuote>>;
}
