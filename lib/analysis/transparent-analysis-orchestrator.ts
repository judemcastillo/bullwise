import { analyzeDailySwing } from "@/lib/analysis/technical-analysis";
import {
	buildAnalysisPanelResponse,
	buildUnavailableAnalysisPanelResponse,
} from "@/lib/analysis/transparent-analysis-panel";
import type { AnalysisPanelResponse } from "@/lib/analysis/transparent-analysis-panel.types";
import type { MarketBars, MarketDataInstrument } from "@/lib/market-data/types";
import { resolveLatestCompletedUsEquitySession } from "@/lib/market-data/us-equity-session";
import type {
	EquitySecurityType,
	InstrumentStatus,
} from "@/types/instruments";

const HISTORY_LOOKBACK_DAYS = 730;
const HISTORY_LIMIT = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

export type AnalysisCatalogInstrument = MarketDataInstrument & {
	name: string;
	securityType?: EquitySecurityType;
	status: InstrumentStatus;
};

export type TransparentAnalysisDependencies = {
	resolveInstrument(
		canonicalKey: string,
	): Promise<AnalysisCatalogInstrument | null>;
	resolveBenchmark(): Promise<AnalysisCatalogInstrument | null>;
	getBars(
		instrument: MarketDataInstrument,
		query: {
			interval: "1d";
			from: Date;
			to: Date;
			limit: typeof HISTORY_LIMIT;
		},
	): Promise<MarketBars>;
	now(): Date;
};

export type TransparentAnalysisOrchestrationResult =
	| {
			kind: "not_found";
	  }
	| {
			kind: "response";
			transportStatus: 200 | 503;
			response: AnalysisPanelResponse;
	  };

function response(
	panelResponse: AnalysisPanelResponse,
	transportStatus: 200 | 503 = 200,
): TransparentAnalysisOrchestrationResult {
	return {
		kind: "response",
		transportStatus,
		response: panelResponse,
	};
}

function hasEnabledBarsBinding(instrument: AnalysisCatalogInstrument) {
	return instrument.providerBindings.some(
		(binding) => binding.enabled && binding.capabilities.includes("bars"),
	);
}

function isEligibleTarget(instrument: AnalysisCatalogInstrument) {
	return (
		instrument.status === "active" &&
		instrument.assetClass === "equity" &&
		instrument.securityType === "common_stock" &&
		instrument.calendarId === "us-equities" &&
		hasEnabledBarsBinding(instrument)
	);
}

function isEligibleBenchmark(instrument: AnalysisCatalogInstrument | null) {
	return Boolean(
		instrument &&
			instrument.status === "active" &&
			instrument.assetClass === "equity" &&
			instrument.displaySymbol.trim().toUpperCase() === "SPY" &&
			instrument.calendarId === "us-equities" &&
			hasEnabledBarsBinding(instrument),
	);
}

function historyQuery(completedThrough: Date) {
	return {
		interval: "1d" as const,
		from: new Date(completedThrough.getTime() - HISTORY_LOOKBACK_DAYS * DAY_MS),
		to: new Date(completedThrough),
		limit: HISTORY_LIMIT as typeof HISTORY_LIMIT,
	};
}

async function loadBenchmarkBars(
	dependencies: TransparentAnalysisDependencies,
	query: ReturnType<typeof historyQuery>,
) {
	const benchmark = await dependencies.resolveBenchmark();
	if (!isEligibleBenchmark(benchmark)) return undefined;
	return dependencies.getBars(benchmark!, query);
}

export async function orchestrateTransparentAnalysis(
	canonicalKey: string,
	dependencies: TransparentAnalysisDependencies,
): Promise<TransparentAnalysisOrchestrationResult> {
	let instrument: AnalysisCatalogInstrument | null;
	try {
		instrument = await dependencies.resolveInstrument(canonicalKey);
	} catch {
		return response(buildUnavailableAnalysisPanelResponse("analysis_failed"), 503);
	}
	if (!instrument) return { kind: "not_found" };
	if (!isEligibleTarget(instrument)) {
		return response(
			buildUnavailableAnalysisPanelResponse("unsupported_instrument"),
		);
	}

	const analyzedAt = dependencies.now();
	const completedSession = resolveLatestCompletedUsEquitySession(analyzedAt);
	if (completedSession.status === "unavailable") {
		return response(
			buildUnavailableAnalysisPanelResponse("completed_session_unavailable"),
		);
	}
	const query = historyQuery(completedSession.completedThrough);
	const [instrumentBars, benchmarkBars] = await Promise.allSettled([
		dependencies.getBars(instrument, query),
		loadBenchmarkBars(dependencies, query),
	]);
	if (instrumentBars.status === "rejected") {
		return response(
			buildUnavailableAnalysisPanelResponse("bars_provider_unavailable"),
			503,
		);
	}

	try {
		const analysis = analyzeDailySwing({
			instrument: {
				instrumentId: instrument.instrumentId,
				displaySymbol: instrument.displaySymbol,
				assetClass: instrument.assetClass,
				securityType: instrument.securityType,
				currency: instrument.quoteCurrency,
				pricePrecision: instrument.pricePrecision,
			},
			marketData: instrumentBars.value,
			...(benchmarkBars.status === "fulfilled" && benchmarkBars.value
				? { benchmarkData: benchmarkBars.value }
				: {}),
			completedThrough: completedSession.completedThrough,
			analyzedAt,
		});
		return response(
			buildAnalysisPanelResponse({
				canonicalKey: instrument.canonicalKey,
				name: instrument.name,
				result: analysis,
			}),
		);
	} catch {
		return response(buildUnavailableAnalysisPanelResponse("analysis_failed"));
	}
}
