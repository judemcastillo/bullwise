import "server-only";

import { InstrumentMarketDataService } from "@/lib/market-data/service";
import { getFinnhubApiKey } from "@/lib/market-data/finnhub-config";
import { FinnhubQuoteProvider } from "@/lib/market-data/providers/finnhub-client";
import { MassiveBarsProvider } from "@/lib/market-data/providers/massive-bars-client";

export function createInstrumentMarketDataService() {
	const massiveApiKey = process.env.MASSIVE_API_KEY?.trim();
	if (!massiveApiKey) throw new Error("MASSIVE_API_KEY is not configured");

	return new InstrumentMarketDataService({
		quoteProviders: [
			new FinnhubQuoteProvider({ apiKey: getFinnhubApiKey() }),
		],
		barsProviders: [new MassiveBarsProvider({ apiKey: massiveApiKey })],
	});
}
