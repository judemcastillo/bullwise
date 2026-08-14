import type {
	AssetClass,
	EquitySecurityType,
	InstrumentType,
	ProviderBinding,
	ProviderCapability,
} from "@/types/instruments";

type WatchlistInstrumentForClient = {
	_id: string | { toString(): string };
	canonicalKey: string;
	assetClass: AssetClass;
	instrumentType: InstrumentType;
	securityType?: EquitySecurityType;
	displaySymbol: string;
	name: string;
	venue?: string;
	baseCurrency?: string;
	quoteCurrency: string;
	calendarId?: string;
	providerBindings: ProviderBinding[];
};

type WatchlistRecordForClient = {
	instrument: WatchlistInstrumentForClient;
};

function supportsCapability(
	instrument: WatchlistInstrumentForClient,
	binding: ProviderBinding,
	capability: ProviderCapability,
) {
	if (binding.capabilities.includes(capability)) return true;

	return (
		instrument.assetClass === "equity" &&
		binding.provider === "finnhub" &&
		binding.capabilities.length === 0 &&
		["quote", "alert_quote", "news"].includes(capability)
	);
}

function selectCapabilityBinding(
	instrument: WatchlistInstrumentForClient,
	capability: ProviderCapability,
) {
	return instrument.providerBindings
		.filter(
			(binding) =>
				binding.enabled !== false &&
				supportsCapability(instrument, binding, capability),
		)
		.sort((first, second) => first.priority - second.priority)[0];
}

export function toWatchlistClientItem(
	item: WatchlistRecordForClient,
): Pick<
	StockWithData,
	| "instrumentId"
	| "canonicalKey"
	| "assetClass"
	| "instrumentType"
	| "securityType"
	| "symbol"
	| "company"
	| "venue"
	| "baseCurrency"
	| "quoteCurrency"
	| "calendarId"
	| "provider"
	| "providerSymbol"
	| "quoteProvider"
	| "quoteProviderSymbol"
	| "newsProvider"
	| "newsProviderSymbol"
	| "supportsAlerts"
> {
	const quoteBinding = selectCapabilityBinding(item.instrument, "quote");
	const alertBinding = selectCapabilityBinding(item.instrument, "alert_quote");
	const newsBinding = selectCapabilityBinding(item.instrument, "news");

	return {
		instrumentId: item.instrument._id.toString(),
		canonicalKey: item.instrument.canonicalKey,
		assetClass: item.instrument.assetClass,
		instrumentType: item.instrument.instrumentType,
		securityType: item.instrument.securityType,
		symbol: item.instrument.displaySymbol,
		company: item.instrument.name,
		venue: item.instrument.venue,
		baseCurrency: item.instrument.baseCurrency,
		quoteCurrency: item.instrument.quoteCurrency,
		calendarId: item.instrument.calendarId,
		provider: alertBinding?.provider,
		providerSymbol: alertBinding?.symbol,
		quoteProvider: quoteBinding?.provider,
		quoteProviderSymbol: quoteBinding?.symbol,
		newsProvider: newsBinding?.provider,
		newsProviderSymbol: newsBinding?.symbol,
		supportsAlerts: Boolean(alertBinding),
	};
}

export function getFinnhubWatchlistQuoteSymbol(
	item: Pick<
		StockWithData,
		"assetClass" | "quoteProvider" | "quoteProviderSymbol"
	>,
) {
	return item.assetClass === "equity" &&
		item.quoteProvider === "finnhub" &&
		item.quoteProviderSymbol
		? item.quoteProviderSymbol
		: null;
}

export function getFinnhubWatchlistNewsSymbol(
	item: Pick<
		StockWithData,
		"assetClass" | "newsProvider" | "newsProviderSymbol"
	>,
) {
	return item.assetClass === "equity" &&
		item.newsProvider === "finnhub" &&
		item.newsProviderSymbol
		? item.newsProviderSymbol
		: null;
}
