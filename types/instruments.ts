export const ASSET_CLASSES = [
	"equity",
	"forex",
	"crypto",
	"index",
	"commodity",
] as const;

export type AssetClass = (typeof ASSET_CLASSES)[number];

export const EQUITY_SECURITY_TYPES = [
	"common_stock",
	"etf",
	"etn",
	"exchange_traded_product",
	"adr",
	"preferred_stock",
	"reit",
	"closed_end_fund",
	"fund",
	"unit",
	"warrant",
	"right",
	"partnership",
	"trust",
	"structured_product",
	"other",
] as const;

export type EquitySecurityType = (typeof EQUITY_SECURITY_TYPES)[number];

export const INSTRUMENT_TYPES = [
	"asset",
	"listing",
	"spot_pair",
	"spot",
	"future",
	"continuous_future",
	"index",
] as const;

export type InstrumentType = (typeof INSTRUMENT_TYPES)[number];

export const INSTRUMENT_STATUSES = ["active", "inactive", "expired"] as const;

export type InstrumentStatus = (typeof INSTRUMENT_STATUSES)[number];

export const PROVIDER_CAPABILITIES = [
	"catalog",
	"quote",
	"alert_quote",
	"bars",
	"indicators",
	"news",
	"chart",
] as const;

export type ProviderCapability = (typeof PROVIDER_CAPABILITIES)[number];

export type ProviderBinding = {
	provider: string;
	symbol: string;
	capabilities: ProviderCapability[];
	enabled: boolean;
	priority: number;
	venue?: string;
	orientation: "direct" | "inverse";
};

export type InstrumentDefinition = {
	canonicalKey: string;
	assetClass: AssetClass;
	instrumentType: InstrumentType;
	securityType?: EquitySecurityType;
	status: InstrumentStatus;
	displaySymbol: string;
	name: string;
	venue?: string;
	venueMic?: string;
	baseCurrency?: string;
	quoteCurrency: string;
	pricePrecision: number;
	quantityPrecision: number;
	timezone: string;
	calendarId?: string;
	providerBindings: ProviderBinding[];
};

export type InstrumentSearchResult = {
	instrumentId: string;
	canonicalKey: string;
	assetClass: AssetClass;
	instrumentType: InstrumentType;
	securityType?: EquitySecurityType;
	displaySymbol: string;
	name: string;
	venue?: string;
	provider?: string;
	providerSymbol?: string;
	isInWatchlist: boolean;
	href: string;
};

export type InstrumentSearchResponse = {
	results: InstrumentSearchResult[];
	error?: string;
};
