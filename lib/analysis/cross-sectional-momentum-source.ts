import {
	BROAD_DEVELOPMENT_CATEGORIES,
	BROAD_DEVELOPMENT_UNIVERSE_NAME,
	evaluateBroadDevelopmentCoverage,
} from "@/lib/analysis/broad-development-universe";
import {
	BROAD_DEVELOPMENT_V2_EXPANSION_CATEGORIES,
	BROAD_DEVELOPMENT_V2_EXPANSION_NAME,
	evaluateBroadDevelopmentV2ExpansionCoverage,
} from "@/lib/analysis/broad-development-v2-universe";
import { ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_PROTOCOL } from "@/lib/analysis/cross-sectional-momentum-development";
import type {
	MomentumBar,
	MomentumBenchmarkHistory,
	MomentumInstrumentHistory,
	MomentumSleeveId,
	MomentumSourceScan,
} from "@/lib/analysis/cross-sectional-momentum-runner";
import { readFrozenSymmetricTrainHistory } from "@/lib/analysis/symmetric-regime-history-source";
import type { MarketBar, MarketBars } from "@/lib/market-data/types";

const PROTOCOL = ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_PROTOCOL;

type SourceCategory = {
	sourceScan: MomentumSourceScan;
	category: string;
	symbols: readonly string[];
};

const SOURCE_CATEGORIES: readonly SourceCategory[] = [
	...BROAD_DEVELOPMENT_CATEGORIES.map((category) => ({
		sourceScan: "base" as const,
		category: category.name,
		symbols: category.symbols,
	})),
	...BROAD_DEVELOPMENT_V2_EXPANSION_CATEGORIES.map((category) => ({
		sourceScan: "expansion" as const,
		category: category.name,
		symbols: category.candidates.map((candidate) => candidate.symbol),
	})),
];

export function momentumMembershipFor(input: {
	sourceScan: MomentumSourceScan;
	displaySymbol: string;
}): { sourceCategory: string; sleeveId: MomentumSleeveId } {
	const symbol = input.displaySymbol.trim().toUpperCase();
	const matches = SOURCE_CATEGORIES.filter(
		(category) =>
			category.sourceScan === input.sourceScan && category.symbols.includes(symbol),
	);
	if (matches.length !== 1) {
		throw new Error(`${input.sourceScan}:${symbol} must belong to exactly one frozen category`);
	}
	const sourceCategory = `${input.sourceScan}:${matches[0].category}`;
	const sleeves = PROTOCOL.universe.sleeves.filter((sleeve) =>
		(sleeve.sourceCategories as readonly string[]).includes(sourceCategory),
	);
	if (sleeves.length !== 1) {
		throw new Error(`${sourceCategory} must belong to exactly one frozen sleeve`);
	}
	return { sourceCategory, sleeveId: sleeves[0].sleeveId };
}

function finitePositive(value: string, label: string) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be positive`);
	return parsed;
}

function momentumBar(bar: MarketBar, label: string): MomentumBar {
	const volume = bar.volume === undefined ? null : Number(bar.volume);
	if (volume !== null && (!Number.isFinite(volume) || volume < 0)) {
		throw new Error(`${label}.volume must be nonnegative`);
	}
	return {
		startedAt: bar.startedAt.toISOString(),
		open: finitePositive(bar.open, `${label}.open`),
		close: finitePositive(bar.close, `${label}.close`),
		volume,
	};
}

function assertMarketProvenance(marketData: MarketBars, label: string) {
	if (
		marketData.provider !== "alpaca" ||
		marketData.interval !== "1d" ||
		marketData.adjusted !== true
	) {
		throw new Error(`${label} does not have frozen adjusted Alpaca daily provenance`);
	}
}

function comparableBars(bars: readonly MomentumBar[]) {
	return bars.map((bar) => [bar.startedAt, bar.open, bar.close]);
}

export async function readFrozenMomentumDevelopmentSources() {
	const base = await readFrozenSymmetricTrainHistory({
		path: PROTOCOL.sources.baseHistory.path,
		expectedSha256: PROTOCOL.sources.baseHistory.sha256,
		expectedUniverseName: BROAD_DEVELOPMENT_UNIVERSE_NAME,
		periodEndsBefore: PROTOCOL.dataAccess.portfolioEndsBefore,
	});
	const expansion = await readFrozenSymmetricTrainHistory({
		path: PROTOCOL.sources.expansionHistory.path,
		expectedSha256: PROTOCOL.sources.expansionHistory.sha256,
		expectedUniverseName: BROAD_DEVELOPMENT_V2_EXPANSION_NAME,
		periodEndsBefore: PROTOCOL.dataAccess.portfolioEndsBefore,
	});
	const instruments: MomentumInstrumentHistory[] = [];
	for (const [sourceScan, source] of [
		["base", base],
		["expansion", expansion],
	] as const) {
		for (const item of source.instruments) {
			const coverage = sourceScan === "base"
				? evaluateBroadDevelopmentCoverage({
					symbol: item.instrument.displaySymbol,
					marketData: item.marketData,
					coverageSnapshot: item.coverageSnapshot,
				})
				: evaluateBroadDevelopmentV2ExpansionCoverage({
					symbol: item.instrument.displaySymbol,
					marketData: item.marketData,
					coverageSnapshot: item.coverageSnapshot,
				});
			if (!coverage.eligible) continue;
			assertMarketProvenance(item.marketData, item.instrument.displaySymbol);
			const membership = momentumMembershipFor({
				sourceScan,
				displaySymbol: item.instrument.displaySymbol,
			});
			instruments.push({
				instrumentId: item.instrument.instrumentId,
				displaySymbol: item.instrument.displaySymbol.trim().toUpperCase(),
				sourceScan,
				...membership,
				bars: item.marketData.bars.map((bar, index) =>
					momentumBar(bar, `${item.instrument.displaySymbol}.bars[${index}]`),
				),
			});
		}
	}
	if (instruments.length !== PROTOCOL.universe.expectedEligibleInstruments) {
		throw new Error(
			`Frozen coverage produced ${instruments.length}, expected ${PROTOCOL.universe.expectedEligibleInstruments}`,
		);
	}
	const baseBenchmark = base.instruments[0]?.benchmarkData;
	const expansionBenchmark = expansion.instruments[0]?.benchmarkData;
	if (!baseBenchmark || !expansionBenchmark) throw new Error("Frozen source lacks SPY benchmark data");
	assertMarketProvenance(baseBenchmark, "base SPY");
	assertMarketProvenance(expansionBenchmark, "expansion SPY");
	const benchmark: MomentumBenchmarkHistory = {
		displaySymbol: "SPY",
		bars: baseBenchmark.bars.map((bar, index) => momentumBar(bar, `SPY.bars[${index}]`)),
	};
	const expansionBars = expansionBenchmark.bars.map((bar, index) =>
		momentumBar(bar, `expansion.SPY.bars[${index}]`),
	);
	if (JSON.stringify(comparableBars(benchmark.bars)) !== JSON.stringify(comparableBars(expansionBars))) {
		throw new Error("Frozen sources disagree on train-only SPY open/close bars");
	}
	return {
		instruments,
		benchmark,
		baseHistorySha256: base.sha256,
		expansionHistorySha256: expansion.sha256,
		validationOrTestDataRead: false as const,
	};
}
