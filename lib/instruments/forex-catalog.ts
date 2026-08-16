import { buildCanonicalKey } from "@/lib/instruments/canonical-key";
import { usesUsd } from "@/lib/instruments/pair-policy";
import type { InstrumentDefinition, ProviderBinding } from "@/types/instruments";

export type ForexCatalogEntry = {
	baseCurrency: string;
	quoteCurrency: string;
	name: string;
	providerBinding: ProviderBinding;
};

function pairKey(entry: Pick<ForexCatalogEntry, "baseCurrency" | "quoteCurrency">) {
	return `${entry.baseCurrency.trim().toUpperCase()}:${entry.quoteCurrency.trim().toUpperCase()}`;
}

function tradingViewBinding(baseCurrency: string, quoteCurrency: string): ProviderBinding {
	return {
		provider: "tradingview",
		symbol: `OANDA:${baseCurrency}${quoteCurrency}`,
		capabilities: ["chart"],
		enabled: true,
		priority: 100,
		venue: "oanda",
		orientation: "direct",
	};
}

export function reconcileForexCatalogs(
	finnhubEntries: readonly ForexCatalogEntry[],
	massiveEntries: readonly ForexCatalogEntry[],
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

		const baseCurrency = finnhub.baseCurrency.trim().toUpperCase();
		const quoteCurrency = finnhub.quoteCurrency.trim().toUpperCase();
		definitions.push({
			canonicalKey: buildCanonicalKey({
				assetClass: "forex",
				baseCurrency,
				quoteCurrency,
			}),
			assetClass: "forex",
			instrumentType: "spot_pair",
			status: "active",
			displaySymbol: `${baseCurrency}/${quoteCurrency}`,
			name: massive.name || finnhub.name,
			venue: "Global Forex",
			baseCurrency,
			quoteCurrency,
			pricePrecision: quoteCurrency === "JPY" ? 3 : 5,
			quantityPrecision: 0,
			timezone: "Etc/UTC",
			calendarId: "forex-24x5",
			providerBindings: [
				finnhub.providerBinding,
				massive.providerBinding,
				tradingViewBinding(baseCurrency, quoteCurrency),
			],
		});
	}

	return definitions.sort((first, second) =>
		first.canonicalKey.localeCompare(second.canonicalKey),
	);
}
