import type { ForexCatalogEntry } from "@/lib/instruments/forex-catalog";
import type { FinnhubForexSymbol } from "@/lib/market-data/providers/finnhub-forex-client";

const FINNHUB_OANDA_SYMBOL_PATTERN = /^OANDA:([A-Z]{3})_([A-Z]{3})$/;

export function normalizeFinnhubOandaCatalogEntry(
	instrument: FinnhubForexSymbol,
): ForexCatalogEntry {
	const providerSymbol = instrument.symbol.trim().toUpperCase();
	const match = FINNHUB_OANDA_SYMBOL_PATTERN.exec(providerSymbol);
	if (!match) throw new Error("Finnhub returned an invalid OANDA forex symbol");
	if (match[1] === "XAU" || match[1] === "XAG") {
		throw new Error("Precious metals belong to the commodity catalog");
	}

	const baseCurrency = match[1];
	const quoteCurrency = match[2];
	return {
		baseCurrency,
		quoteCurrency,
		name: instrument.description.trim() || `${baseCurrency}/${quoteCurrency}`,
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
