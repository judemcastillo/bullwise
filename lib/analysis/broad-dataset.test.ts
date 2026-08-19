import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDailySwingBroadDataset } from "@/lib/analysis/broad-dataset";
import {
	DAILY_SWING_BROAD_SETUP_SCAN_SHA256,
} from "@/lib/analysis/broad-dataset.types";
import { BROAD_DEVELOPMENT_SYMBOLS } from "@/lib/analysis/broad-development-universe";
import type { BacktestSignalFeatures } from "@/lib/analysis/backtest.types";
import type { DailySwingObjectiveFeatureValues } from "@/lib/analysis/objective-features.types";
import type {
	DailySwingInstrumentSetupScan,
	DailySwingSetupScanReport,
} from "@/lib/analysis/setup-scan.types";

const SIGNAL_FEATURES: BacktestSignalFeatures = {
	momentumRegime: "bullish",
	participationRegime: "normal",
	sma20DistancePercent: 1,
	sma50DistancePercent: 2,
	sma200DistancePercent: 3,
	sma20SlopePercent: 0.2,
	sma50SlopePercent: 0.1,
	rsi14: 55,
	macdHistogramPercent: 0.1,
	atrPercent: 2,
	return5Percent: 1,
	return20Percent: 2,
	return60Percent: 3,
	realizedVolatility20Percent: 15,
	realizedVolatility60Percent: 14,
	volatilityPercentile: 50,
	relativeStrength60Percent: 1,
};

const OBJECTIVE_FEATURES: DailySwingObjectiveFeatureValues = {
	medianDollarVolume20: 100_000_000,
	medianDollarVolume60: 90_000_000,
	missingOrZeroVolumeRate20: 0,
	dollarVolumePercentile252: 0.7,
	amihudIlliquidity20PerBillion: 0.01,
	bodyToRange: 0.5,
	upperWickToRange: 0.25,
	lowerWickToRange: 0.25,
	closeLocationInRange: 0.6,
	overnightGapAtr: 0.1,
	rangeAtr: 1,
	rangeCompression20: 0.8,
	directionalFollowThrough3Atr: 0.5,
	breakoutDisplacementAtr: 0.2,
	entryToNearestSupportAtr: 1,
	entryToNearestResistanceAtr: 2,
	nearestSupportPivotTouches: 3,
	nearestResistancePivotTouches: 2,
	supportZoneTouches120: 4,
	supportZoneRejections120: 2,
	resistanceZoneTouches120: 3,
	resistanceZoneRejections120: 1,
	volumePercentile252: 0.6,
	relativeVolume20: 1.2,
	volumeToPriceMove20: 1.5,
};

const WINDOWS = [
	["2019-06-03T04:00:00.000Z", "2019-06-06T04:00:00.000Z"],
	["2019-12-30T05:00:00.000Z", "2020-01-02T05:00:00.000Z"],
	["2020-06-01T04:00:00.000Z", "2020-06-04T04:00:00.000Z"],
	["2020-12-30T05:00:00.000Z", "2021-01-04T05:00:00.000Z"],
	["2021-06-01T04:00:00.000Z", "2021-06-04T04:00:00.000Z"],
	["2022-06-01T04:00:00.000Z", "2022-06-06T04:00:00.000Z"],
	["2022-12-30T05:00:00.000Z", "2023-01-03T05:00:00.000Z"],
	["2023-06-01T04:00:00.000Z", "2023-06-06T04:00:00.000Z"],
	["2024-12-30T05:00:00.000Z", "2025-01-02T05:00:00.000Z"],
	["2025-06-02T04:00:00.000Z", "2025-06-05T04:00:00.000Z"],
] as const;

function instrumentReport(
	symbol: string,
	windows: readonly (readonly [string, string])[],
): DailySwingInstrumentSetupScan {
	const instrumentId = `backtest:etf:${symbol.toLowerCase()}`;
	const untriggeredSetups = windows.map(([signalAt, resolvedAt]) => ({
		instrumentId,
		direction: "long" as const,
		setupType: "breakout" as const,
		signalAt,
		resolvedAt,
		reason: "expired" as const,
		barsObserved: 3,
		trendRegime: "bullish" as const,
		volatilityRegime: "normal" as const,
		signalQuality: {
			evidenceStrength: "moderate" as const,
			relativeStrength20Percent: 1,
			volumeZScore20: 0.5,
			planRiskReward: 2,
		},
		signalFeatures: SIGNAL_FEATURES,
	}));
	return {
		instrument: {
			instrumentId,
			displaySymbol: symbol,
			assetClass: "equity",
			securityType: "etf",
			etfProfile: "standard",
			currency: "USD",
			pricePrecision: 2,
		},
		backtestVersion: "1.3.0",
		engineVersion: "1.0.0",
		strategyVersion: "daily-swing-v1-draft",
		configuration: {
			initialEquity: 100_000,
			riskPerTradePercent: 1,
			transactionCostBpsPerSide: 2,
			slippageBpsPerFill: 3,
			maximumHoldingBars: 20,
			sameBarPolicy: "stop_first",
			allowShortSetups: false,
		},
		window: {
			requestedStartAt: "2016-01-01T00:00:00.000Z",
			requestedEndAt: "2026-08-18T23:59:59.999Z",
			firstEvaluatedAt: windows[0]?.[0] ?? null,
			lastEvaluatedAt: windows.at(-1)?.[0] ?? null,
			barsAvailable: 2_671,
		},
		signalCounts: {
			analyses: windows.length,
			unavailable: 0,
			noTrade: 0,
			longSetups: windows.length,
			shortSetups: 0,
			triggered: 0,
			expiredUntriggered: windows.length,
			endOfDataUntriggered: 0,
		},
		eligibility: {
			researchPolicy: "broad_development_v1",
			setupsEvaluated: windows.length,
			liquidityRejected: 0,
		},
		objectiveFeatures: windows.map(([signalAt]) => ({
			instrumentId,
			signalAt,
			snapshot: {
				featureVersion: "1.0.0",
				signalAt,
				features: OBJECTIVE_FEATURES,
				liquidity: {
					eligible: true,
					reasons: [],
					observedSessions20: 20,
					medianDollarVolume20: 100_000_000,
					plannedPositionNotional: 20_000,
					positionFractionOfMedianDollarVolume: 0.0002,
					thresholds: {
						windowSessions: 20,
						minimumObservedSessions: 19,
						minimumMedianDollarVolume: 10_000_000,
						maximumPositionFractionOfMedianDollarVolume: 0.01,
					},
				},
			},
		})),
		trades: [],
		untriggeredSetups,
	};
}

function sourceReport(): DailySwingSetupScanReport {
	const reports = BROAD_DEVELOPMENT_SYMBOLS.filter((symbol) => symbol !== "JNK").map(
		(symbol) => instrumentReport(symbol, symbol === "IVV" ? WINDOWS : []),
	);
	return {
		scanVersion: "2.0.0",
		generatedAt: "2026-08-19T07:56:40.626Z",
		universeName: "daily-swing-broad-development-v1",
		methodology: {
			evaluationPolicy: "every_eligible_completed_bar",
			labelPolicy: "independent_fixed_equity_simulation",
			researchPolicy: "broad_development_v1",
			description: "fixture",
		},
		aggregate: {
			candidatesReceived: 100,
			instrumentsScanned: 99,
			coverageExcluded: 1,
			analyses: WINDOWS.length,
			setups: WINDOWS.length,
			liquidityRejected: 0,
			triggered: 0,
			untriggered: WINDOWS.length,
		},
		reports,
		warnings: [],
	};
}

describe("daily swing broad dataset v2", () => {
	it("joins objective features and applies frozen final and walk-forward purges", () => {
		const dataset = buildDailySwingBroadDataset({
			report: sourceReport(),
			setupScanSha256: DAILY_SWING_BROAD_SETUP_SCAN_SHA256,
			generatedAt: new Date("2026-08-19T08:00:00.000Z"),
		});

		assert.equal(dataset.datasetVersion, "2.0.0");
		assert.equal(dataset.splitPolicy.validationStartsAt, "2023-01-01T00:00:00.000Z");
		assert.equal(dataset.splitPolicy.testStartsAt, "2025-01-01T00:00:00.000Z");
		assert.equal(dataset.splitPolicy.purgedFinalBoundaryRows, 2);
		assert.equal(dataset.splits.train.rows, 6);
		assert.equal(dataset.splits.validation.rows, 1);
		assert.equal(dataset.splits.test.rows, 1);
		assert.equal(dataset.rows.length, 8);
		assert.equal(dataset.walkForwardFolds[0].purgedFitBoundaryRows, 1);
		assert.equal(dataset.walkForwardFolds[0].purgedEvaluationBoundaryRows, 1);
		assert.equal(dataset.walkForwardFolds[1].purgedFitBoundaryRows, 1);
		assert.equal(dataset.walkForwardFolds[2].purgedEvaluationBoundaryRows, 1);
		assert.equal(dataset.rows[0].features.medianDollarVolume20, 100_000_000);
		assert.equal("instrumentId" in dataset.rows[0].features, false);
		assert.equal("displaySymbol" in dataset.rows[0].features, false);
	});

	it("rejects source checksum drift and an ineligible outcome join", () => {
		assert.throws(
			() =>
				buildDailySwingBroadDataset({
					report: sourceReport(),
					setupScanSha256: "0".repeat(64),
				}),
			/checksum/,
		);
		const report = sourceReport();
		report.reports[0].objectiveFeatures[0].snapshot.liquidity.eligible = false;
		report.reports[0].eligibility.liquidityRejected = 1;
		assert.throws(
			() =>
				buildDailySwingBroadDataset({
					report,
					setupScanSha256: DAILY_SWING_BROAD_SETUP_SCAN_SHA256,
				}),
			/lacks one eligible feature snapshot/,
		);
	});

	it("is deterministic for a frozen source and generation timestamp", () => {
		const input = {
			report: sourceReport(),
			setupScanSha256: DAILY_SWING_BROAD_SETUP_SCAN_SHA256,
			generatedAt: new Date("2026-08-19T08:00:00.000Z"),
		};
		assert.deepEqual(
			buildDailySwingBroadDataset(input),
			buildDailySwingBroadDataset({ ...input, report: sourceReport() }),
		);
	});

	it("keeps all split and fold inventory independent of sealed-test labels", () => {
		const originalReport = sourceReport();
		const changedTestLabels = sourceReport();
		changedTestLabels.reports[0].untriggeredSetups.at(-1)!.reason = "end_of_data";
		const build = (report: DailySwingSetupScanReport) =>
			buildDailySwingBroadDataset({
				report,
				setupScanSha256: DAILY_SWING_BROAD_SETUP_SCAN_SHA256,
				generatedAt: new Date("2026-08-19T08:00:00.000Z"),
			});
		const original = build(originalReport);
		const changed = build(changedTestLabels);
		assert.deepEqual(original.source, changed.source);
		assert.deepEqual(original.eligibility, changed.eligibility);
		assert.deepEqual(original.splitPolicy, changed.splitPolicy);
		assert.deepEqual(original.walkForwardFolds, changed.walkForwardFolds);
		assert.deepEqual(original.splits, changed.splits);
		assert.notDeepEqual(original.rows.at(-1)!.labels, changed.rows.at(-1)!.labels);
	});
});
