import { buildCanonicalKey } from "@/lib/instruments/canonical-key";
import { usesUsd } from "@/lib/instruments/pair-policy";
import type { FinnhubForexSymbol } from "@/lib/market-data/providers/finnhub-forex-client";
import type { MassiveReferenceTicker } from "@/lib/market-data/providers/massive-client";
import type { InstrumentDefinition, ProviderBinding } from "@/types/instruments";

const FINNHUB_OANDA_METAL_PATTERN = /^OANDA:(XAU|XAG)_([A-Z]{3})$/;
const MASSIVE_METAL_PATTERN = /^C:(XAU|XAG)([A-Z]{3})$/;

export const PRECIOUS_METAL_CODES = ["XAU", "XAG"] as const;
export type PreciousMetalCode = (typeof PRECIOUS_METAL_CODES)[number];

export type CommoditySpotCatalogEntry = {
	baseCurrency: PreciousMetalCode;
	quoteCurrency: string;
	name: string;
	providerBinding: ProviderBinding;
};

export function commoditySpotPricePrecision(baseCurrency: PreciousMetalCode) {
	return baseCurrency === "XAU" ? 3 : 5;
}

export function normalizeFinnhubOandaCommodityEntry(
	instrument: FinnhubForexSymbol,
): CommoditySpotCatalogEntry {
	const providerSymbol = instrument.symbol.trim().toUpperCase();
	const match = FINNHUB_OANDA_METAL_PATTERN.exec(providerSymbol);
	if (!match) throw new Error("Finnhub returned a non-metal OANDA symbol");

	return {
		baseCurrency: match[1] as PreciousMetalCode,
		quoteCurrency: match[2],
		name: instrument.description.trim() || instrument.displaySymbol.trim(),
		providerBinding: {
			provider: "finnhub",
			symbol: providerSymbol,
			capabilities: ["catalog"],
			enabled: true,
			priority: 100,
			venue: "oanda",
			orientation: "direct",
		},
	};
}

export function normalizeMassiveCommodityEntry(
	ticker: MassiveReferenceTicker,
): CommoditySpotCatalogEntry {
	const providerSymbol = ticker.ticker.trim().toUpperCase();
	const match = MASSIVE_METAL_PATTERN.exec(providerSymbol);
	if (!match) throw new Error("Massive returned a non-metal forex ticker");

	return {
		baseCurrency: match[1] as PreciousMetalCode,
		quoteCurrency: match[2],
		name: ticker.name?.trim() || `${match[1]}/${match[2]}`,
		providerBinding: {
			provider: "massive",
			symbol: providerSymbol,
			capabilities: ["catalog", "bars", "indicators"],
			enabled: ticker.active !== false,
			priority: 100,
			venue: "global",
			orientation: "direct",
		},
	};
}

function pairKey(
	entry: Pick<CommoditySpotCatalogEntry, "baseCurrency" | "quoteCurrency">,
) {
	return `${entry.baseCurrency}:${entry.quoteCurrency}`;
}

export function reconcileCommoditySpotCatalogs(
	finnhubEntries: readonly CommoditySpotCatalogEntry[],
	massiveEntries: readonly CommoditySpotCatalogEntry[],
): InstrumentDefinition[] {
	const finnhubByPair = new Map(
		finnhubEntries.map((entry) => [pairKey(entry), entry]),
	);
	const massiveByPair = new Map(
		massiveEntries.map((entry) => [pairKey(entry), entry]),
	);
	const definitions: InstrumentDefinition[] = [];

	for (const [key, finnhub] of finnhubByPair) {
		const massive = massiveByPair.get(key);
		if (
			!usesUsd(finnhub) ||
			!massive ||
			!finnhub.providerBinding.enabled ||
			!massive.providerBinding.enabled
		) {
			continue;
		}
		const { baseCurrency, quoteCurrency } = finnhub;
		definitions.push({
			canonicalKey: buildCanonicalKey({
				assetClass: "commodity",
				instrumentType: "spot",
				venue: "oanda",
				baseCurrency,
				quoteCurrency,
			}),
			assetClass: "commodity",
			instrumentType: "spot",
			status: "active",
			displaySymbol: `${baseCurrency}/${quoteCurrency}`,
			name: massive.name || finnhub.name,
			venue: "OANDA Spot",
			baseCurrency,
			quoteCurrency,
			pricePrecision: commoditySpotPricePrecision(baseCurrency),
			quantityPrecision: 3,
			timezone: "Etc/UTC",
			calendarId: "commodity-spot-24x5",
			providerBindings: [
				finnhub.providerBinding,
				massive.providerBinding,
				{
					provider: "tradingview",
					symbol: `OANDA:${baseCurrency}${quoteCurrency}`,
					capabilities: ["chart"],
					enabled: true,
					priority: 100,
					venue: "oanda",
					orientation: "direct",
				},
			],
		});
	}

	return definitions.sort((first, second) =>
		first.canonicalKey.localeCompare(second.canonicalKey),
	);
}
