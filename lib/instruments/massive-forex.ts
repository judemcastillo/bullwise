import type { MassiveReferenceTicker } from "@/lib/market-data/providers/massive-client";
import type { ForexCatalogEntry } from "@/lib/instruments/forex-catalog";

const MASSIVE_FOREX_TICKER_PATTERN = /^C:([A-Z]{3})([A-Z]{3})$/;

export function parseMassiveForexTicker(ticker: string) {
	const normalizedTicker = ticker.trim().toUpperCase();
	const match = MASSIVE_FOREX_TICKER_PATTERN.exec(normalizedTicker);
	if (!match) throw new Error("Massive returned an invalid forex ticker");
	if (match[1] === "XAU" || match[1] === "XAG") {
		throw new Error("Precious metals belong to the commodity catalog");
	}

	return {
		ticker: normalizedTicker,
		baseCurrency: match[1],
		quoteCurrency: match[2],
	};
}

export function normalizeMassiveForexCatalogEntry(
	ticker: MassiveReferenceTicker,
): ForexCatalogEntry {
	const { ticker: providerSymbol, baseCurrency, quoteCurrency } =
		parseMassiveForexTicker(ticker.ticker);
	const displaySymbol = `${baseCurrency}/${quoteCurrency}`;

	return {
		baseCurrency,
		quoteCurrency,
		name: ticker.name?.trim() || displaySymbol,
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
