import "server-only";

import {
	orchestrateTransparentAnalysis,
	type AnalysisCatalogInstrument,
} from "@/lib/analysis/transparent-analysis-orchestrator";
import {
	getInstrumentByCanonicalKey,
	getSpyAnalysisBenchmark,
} from "@/lib/data/instruments";
import { createInstrumentMarketDataService } from "@/lib/market-data/service-factory";

let marketDataService: ReturnType<typeof createInstrumentMarketDataService> | null = null;

function getMarketDataService() {
	if (!marketDataService) marketDataService = createInstrumentMarketDataService();
	return marketDataService;
}

function toAnalysisInstrument(
	instrument: NonNullable<Awaited<ReturnType<typeof getInstrumentByCanonicalKey>>>,
): AnalysisCatalogInstrument {
	return {
		instrumentId: String(instrument._id),
		canonicalKey: instrument.canonicalKey,
		assetClass: instrument.assetClass,
		displaySymbol: instrument.displaySymbol,
		quoteCurrency: instrument.quoteCurrency,
		pricePrecision: instrument.pricePrecision,
		calendarId: instrument.calendarId,
		providerBindings: instrument.providerBindings.map((binding) => ({
			provider: binding.provider,
			symbol: binding.symbol,
			capabilities: [...binding.capabilities],
			enabled: binding.enabled,
			priority: binding.priority,
			venue: binding.venue,
			orientation: binding.orientation,
		})),
		name: instrument.name,
		securityType: instrument.securityType,
		status: instrument.status,
	};
}

export async function getTransparentAnalysisPanel(canonicalKey: string) {
	return orchestrateTransparentAnalysis(canonicalKey, {
		resolveInstrument: async (key) => {
			const instrument = await getInstrumentByCanonicalKey(key);
			return instrument ? toAnalysisInstrument(instrument) : null;
		},
		resolveBenchmark: async () => {
			const benchmark = await getSpyAnalysisBenchmark();
			return benchmark ? toAnalysisInstrument(benchmark) : null;
		},
		getBars: (instrument, query) =>
			getMarketDataService().getBars(instrument, query),
		now: () => new Date(),
	});
}
