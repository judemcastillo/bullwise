import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildDailySwingAnalysisDataset,
	FROZEN_CONFIRMATION_SYMBOLS,
} from "@/lib/analysis/analysis-dataset";
import type {
	BacktestSignalFeatures,
	BacktestTrade,
	DailySwingBacktestReport,
	UntriggeredSetup,
} from "@/lib/analysis/backtest.types";
import type { DailySwingBatchBacktestReport } from "@/lib/analysis/batch-backtest.types";
import type { DailySwingSetupScanReport } from "@/lib/analysis/setup-scan.types";

const DAY_MS = 86_400_000;
const FIRST_SIGNAL = new Date("2020-01-01T00:00:00.000Z").getTime();

const SIGNAL_FEATURES: BacktestSignalFeatures = {
	momentumRegime: "bullish",
	participationRegime: "strong",
	sma20DistancePercent: 1,
	sma50DistancePercent: 2,
	sma200DistancePercent: 10,
	sma20SlopePercent: 0.5,
	sma50SlopePercent: 0.3,
	rsi14: 58,
	macdHistogramPercent: 0.2,
	atrPercent: 2,
	return5Percent: 1,
	return20Percent: 4,
	return60Percent: 8,
	realizedVolatility20Percent: 18,
	realizedVolatility60Percent: 16,
	volatilityPercentile: 55,
	relativeStrength60Percent: 3,
};

const SIGNAL_QUALITY = {
	evidenceStrength: "strong" as const,
	relativeStrength20Percent: 2,
	volumeZScore20: 1.5,
	planRiskReward: 2,
};

function at(day: number) {
	return new Date(FIRST_SIGNAL + day * DAY_MS).toISOString();
}

function trade(symbol: string, signalDay: number, resolvedDay = signalDay + 1) {
	return {
		instrumentId: `backtest:etf:${symbol.toLowerCase()}`,
		direction: "long",
		setupType: "breakout",
		signalAt: at(signalDay),
		entryAt: at(signalDay + 1),
		entryPrice: 100,
		stopPrice: 95,
		targetPrices: [105, 110],
		exitAt: at(resolvedDay),
		exitReason: "target_2",
		exitFills: [
			{
				reason: "target_1",
				filledAt: at(resolvedDay),
				price: 105,
				positionFraction: 0.5,
			},
			{
				reason: "target_2",
				filledAt: at(resolvedDay),
				price: 110,
				positionFraction: 0.5,
			},
		],
		barsHeld: 1,
		trendRegime: "bullish",
		volatilityRegime: "normal",
		signalQuality: SIGNAL_QUALITY,
		signalFeatures: SIGNAL_FEATURES,
		positionUnits: 200,
		riskCapital: 1_000,
		grossPnl: 1_500,
		transactionCosts: 0,
		netPnl: 1_500,
		netReturnOnEquityPercent: 1.5,
		rMultiple: 1.5,
		maximumFavorableExcursionPercent: 10,
		maximumAdverseExcursionPercent: -1,
		markToMarket: [],
	} satisfies BacktestTrade;
}

function untriggered(symbol: string, signalDay: number, resolvedDay = signalDay + 1) {
	return {
		instrumentId: `backtest:etf:${symbol.toLowerCase()}`,
		direction: "long",
		setupType: "pullback",
		signalAt: at(signalDay),
		resolvedAt: at(resolvedDay),
		reason: "expired",
		barsObserved: 3,
		trendRegime: "mixed",
		volatilityRegime: "high",
		signalQuality: SIGNAL_QUALITY,
		signalFeatures: SIGNAL_FEATURES,
	} satisfies UntriggeredSetup;
}

function instrumentReport(
	symbol: string,
	trades: BacktestTrade[],
	untriggeredSetups: UntriggeredSetup[],
) {
	return {
		backtestVersion: "1.3.0",
		engineVersion: "1.0.0",
		strategyVersion: "daily-swing-v1-draft",
		instrument: {
			instrumentId: `backtest:etf:${symbol.toLowerCase()}`,
			displaySymbol: symbol,
		},
		signalCounts: {
			longSetups: trades.length + untriggeredSetups.length,
			shortSetups: 0,
		},
		trades,
		untriggeredSetups,
	} as unknown as DailySwingBacktestReport;
}

function batch(reports: DailySwingBacktestReport[]) {
	return {
		batchVersion: "1.3.0",
		universeName: "development-etfs",
		reports,
	} as unknown as DailySwingBatchBacktestReport;
}

function setupScan(reports: DailySwingBacktestReport[]) {
	return {
		scanVersion: "2.0.0",
		universeName: "development-etfs",
		methodology: {
			evaluationPolicy: "every_eligible_completed_bar",
			labelPolicy: "independent_fixed_equity_simulation",
		},
		reports,
	} as unknown as DailySwingSetupScanReport;
}

function developmentReport(overrides: {
	trainBoundaryResolution?: number;
	validationBoundaryResolution?: number;
} = {}) {
	const trades: BacktestTrade[] = [];
	const setups: UntriggeredSetup[] = [];
	for (let index = 0; index < 10; index += 1) {
		const signalDay = index * 4;
		const resolvedDay =
			index === 5 && overrides.trainBoundaryResolution !== undefined
				? overrides.trainBoundaryResolution
				: index === 7 && overrides.validationBoundaryResolution !== undefined
					? overrides.validationBoundaryResolution
					: signalDay + 1;
		if (index % 2 === 0) trades.push(trade("DEV", signalDay, resolvedDay));
		else setups.push(untriggered("DEV", signalDay, resolvedDay));
	}
	return instrumentReport("DEV", trades, setups);
}

describe("daily swing analysis dataset", () => {
	it("exports signal-time features and both triggered and untriggered labels", () => {
		const dataset = buildDailySwingAnalysisDataset({
			report: batch([developmentReport()]),
			generatedAt: new Date("2026-08-19T00:00:00.000Z"),
		});

		assert.equal(dataset.datasetVersion, "1.1.0");
		assert.equal(dataset.rows.length, 10);
		assert.equal(dataset.rows.filter((row) => row.labels.triggered).length, 5);
		assert.equal(dataset.rows.filter((row) => !row.labels.triggered).length, 5);
		assert.equal(dataset.rows[0].features.rsi14, 58);
		assert.equal(dataset.rows[0].features.planRiskReward, 2);
		assert.equal(dataset.rows[0].labels.netRMultiple, 1.5);
		assert.equal(dataset.rows[1].labels.netRMultiple, null);
		assert.equal("entryPrice" in dataset.rows[0].features, false);
		assert.equal(dataset.featureAvailability.asOf, "signalAt");
	});

	it("preserves exhaustive setup-scan provenance", () => {
		const dataset = buildDailySwingAnalysisDataset({
			report: setupScan([developmentReport()]),
		});

		assert.equal(dataset.source.kind, "exhaustive_setup_scan");
		assert.equal(dataset.source.batchVersion, null);
		assert.equal(dataset.source.setupScanVersion, "2.0.0");
	});

	it("keeps the frozen version-1 setup scan readable", () => {
		const legacy = setupScan([developmentReport()]) as unknown as {
			scanVersion: string;
		};
		legacy.scanVersion = "1.0.0";
		const dataset = buildDailySwingAnalysisDataset({
			report: legacy as unknown as DailySwingSetupScanReport,
		});
		assert.equal(dataset.source.setupScanVersion, "1.0.0");
	});

	it("always excludes previously examined v2 and v3 confirmation symbols", () => {
		const vti = instrumentReport("VTI", [trade("VTI", 0)], []);
		const dataset = buildDailySwingAnalysisDataset({
			report: batch([developmentReport(), vti]),
		});

		assert.ok(FROZEN_CONFIRMATION_SYMBOLS.includes("VTI"));
		assert.deepEqual(dataset.exclusions.excludedInstruments, ["VTI"]);
		assert.equal(dataset.exclusions.excludedSetupRows, 1);
		assert.ok(dataset.rows.every((row) => row.displaySymbol === "DEV"));
	});

	it("uses whole signal sessions and purges outcomes crossing split boundaries", () => {
		const dataset = buildDailySwingAnalysisDataset({
			report: batch([
				developmentReport({
					trainBoundaryResolution: 24,
					validationBoundaryResolution: 32,
				}),
			]),
		});

		assert.equal(dataset.splitPolicy.validationStartsAt, at(24));
		assert.equal(dataset.splitPolicy.testStartsAt, at(32));
		assert.equal(dataset.exclusions.purgedBoundaryRows, 2);
		assert.equal(dataset.splits.train.rows, 5);
		assert.equal(dataset.splits.validation.rows, 1);
		assert.equal(dataset.splits.test.rows, 2);
		assert.ok(
			dataset.rows
				.filter((row) => row.split === "train")
				.every((row) => row.resolvedAt < dataset.splitPolicy.validationStartsAt),
		);
		assert.ok(
			dataset.rows
				.filter((row) => row.split === "validation")
				.every((row) => row.resolvedAt < dataset.splitPolicy.testStartsAt),
		);
	});

	it("rejects stale reports and missing signal snapshots", () => {
		const stale = batch([developmentReport()]) as unknown as {
			batchVersion: string;
		};
		stale.batchVersion = "1.2.0";
		assert.throws(
			() =>
				buildDailySwingAnalysisDataset({
					report: stale as unknown as DailySwingBatchBacktestReport,
				}),
			/expected 1\.3\.0/,
		);

		const current = developmentReport();
		current.trades[0].signalFeatures = null;
		assert.throws(
			() => buildDailySwingAnalysisDataset({ report: batch([current]) }),
			/lacks signal-time features/,
		);
	});
});
