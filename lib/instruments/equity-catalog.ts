import { buildCanonicalKey } from "@/lib/instruments/canonical-key";
import {
	normalizeFinnhubEquitySecurityType,
	normalizeMassiveEquitySecurityType,
	reconcileEquitySecurityType,
} from "@/lib/instruments/equity-security-type";
import type { FinnhubEquitySymbol } from "@/lib/market-data/providers/finnhub-forex-client";
import type { MassiveReferenceTicker } from "@/lib/market-data/providers/massive-client";
import type {
	EquitySecurityType,
	InstrumentDefinition,
	ProviderBinding,
} from "@/types/instruments";

const EQUITY_SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,39}$/;

const US_VENUES: Record<
	string,
	{ code: string; name: string; tradingView: string }
> = {
	ARCX: { code: "arcx", name: "NYSE Arca", tradingView: "AMEX" },
	XASE: { code: "xase", name: "NYSE American", tradingView: "AMEX" },
	XNAS: { code: "xnas", name: "Nasdaq", tradingView: "NASDAQ" },
	XNYS: { code: "xnys", name: "New York Stock Exchange", tradingView: "NYSE" },
};

export type EquityCatalogEntry = {
	symbol: string;
	name: string;
	mic: string;
	quoteCurrency: string;
	securityType: EquitySecurityType;
	providerBinding: ProviderBinding;
};

function normalizeSymbol(value: string) {
	const symbol = value.trim().toUpperCase();
	if (!EQUITY_SYMBOL_PATTERN.test(symbol)) {
		throw new Error("Provider returned an invalid US equity symbol");
	}
	return symbol;
}

function normalizeMic(value?: string) {
	const mic = value?.trim().toUpperCase() ?? "";
	if (!US_VENUES[mic]) {
		throw new Error("Provider returned an unsupported US equity venue");
	}
	return mic;
}

export function normalizeFinnhubEquityCatalogEntry(
	entry: FinnhubEquitySymbol,
): EquityCatalogEntry {
	const symbol = normalizeSymbol(entry.symbol);
	const mic = normalizeMic(entry.mic);
	const name = entry.description.trim();
	if (!name) throw new Error("Finnhub returned an unnamed US equity");

	return {
		symbol,
		name,
		mic,
		quoteCurrency: entry.currency?.trim().toUpperCase() || "USD",
		securityType: normalizeFinnhubEquitySecurityType(entry.type),
		providerBinding: {
			provider: "finnhub",
			symbol,
			capabilities: ["catalog", "quote", "alert_quote", "news"],
			enabled: true,
			priority: 100,
			venue: US_VENUES[mic].code,
			orientation: "direct",
		},
	};
}

export function normalizeMassiveEquityCatalogEntry(
	entry: MassiveReferenceTicker,
): EquityCatalogEntry {
	const symbol = normalizeSymbol(entry.ticker);
	const mic = normalizeMic(entry.primary_exchange);
	const name = entry.name?.trim();
	if (!name) throw new Error("Massive returned an unnamed US equity");

	return {
		symbol,
		name,
		mic,
		quoteCurrency: entry.currency_name?.trim().toUpperCase() || "USD",
		securityType: normalizeMassiveEquitySecurityType(entry.type),
		providerBinding: {
			provider: "massive",
			symbol,
			capabilities: ["catalog", "bars", "indicators"],
			enabled: entry.active !== false,
			priority: 100,
			venue: US_VENUES[mic].code,
			orientation: "direct",
		},
	};
}

function entryKey(entry: Pick<EquityCatalogEntry, "symbol" | "mic">) {
	return `${entry.mic}:${entry.symbol}`;
}

export function reconcileEquityCatalogs(
	finnhubEntries: readonly EquityCatalogEntry[],
	massiveEntries: readonly EquityCatalogEntry[],
): InstrumentDefinition[] {
	const finnhubByListing = new Map(
		finnhubEntries.map((entry) => [entryKey(entry), entry]),
	);
	const massiveByListing = new Map(
		massiveEntries.map((entry) => [entryKey(entry), entry]),
	);
	const definitions: InstrumentDefinition[] = [];

	for (const [key, finnhub] of finnhubByListing) {
		const massive = massiveByListing.get(key);
		if (!massive || !finnhub.providerBinding.enabled || !massive.providerBinding.enabled) {
			continue;
		}

		const venue = US_VENUES[finnhub.mic];
		definitions.push({
			canonicalKey: buildCanonicalKey({
				assetClass: "equity",
				venue: venue.code,
				symbol: finnhub.symbol,
			}),
			assetClass: "equity",
			instrumentType: "listing",
			securityType: reconcileEquitySecurityType(
				finnhub.securityType,
				massive.securityType,
			),
			status: "active",
			displaySymbol: finnhub.symbol,
			name: finnhub.name,
			venue: venue.name,
			venueMic: finnhub.mic,
			quoteCurrency: massive.quoteCurrency || finnhub.quoteCurrency,
			pricePrecision: 4,
			quantityPrecision: 0,
			timezone: "America/New_York",
			calendarId: "us-equities",
			providerBindings: [
				finnhub.providerBinding,
				massive.providerBinding,
				{
					provider: "tradingview",
					symbol: `${venue.tradingView}:${finnhub.symbol}`,
					capabilities: ["chart"],
					enabled: true,
					priority: 100,
					venue: venue.code,
					orientation: "direct",
				},
			],
		});
	}

	return definitions.sort((first, second) =>
		first.canonicalKey.localeCompare(second.canonicalKey),
	);
}
