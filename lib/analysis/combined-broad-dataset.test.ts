import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BacktestSignalFeatures } from "@/lib/analysis/backtest.types";
import { DAILY_SWING_BROAD_SETUP_SCAN_SHA256 } from "@/lib/analysis/broad-dataset.types";
import {
	BROAD_DEVELOPMENT_SYMBOLS,
	BROAD_DEVELOPMENT_UNIVERSE_NAME,
} from "@/lib/analysis/broad-development-universe";
import {
	BROAD_DEVELOPMENT_V2_EXPANSION_NAME,
	BROAD_DEVELOPMENT_V2_EXPANSION_SOURCE_SHA256,
	BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS,
} from "@/lib/analysis/broad-development-v2-universe";
import { buildDailySwingCombinedBroadDataset } from "@/lib/analysis/combined-broad-dataset";
import {
	DAILY_SWING_BROAD_EXPANSION_SETUP_SCAN_SHA256,
} from "@/lib/analysis/combined-broad-dataset.types";
import type { DailySwingObjectiveFeatureValues } from "@/lib/analysis/objective-features.types";
import type {
	DailySwingInstrumentSetupScan,
	DailySwingSetupResearchPolicy,
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

const BASE_WINDOWS = [
	["2019-06-03T04:00:00.000Z", "2019-06-06T04:00:00.000Z"],
	["2020-06-01T04:00:00.000Z", "2020-06-04T04:00:00.000Z"],
	["2021-06-01T04:00:00.000Z", "2021-06-04T04:00:00.000Z"],
	["2022-06-01T04:00:00.000Z", "2022-06-06T04:00:00.000Z"],
	["2023-06-01T04:00:00.000Z", "2023-06-06T04:00:00.000Z"],
	["2025-06-02T04:00:00.000Z", "2025-06-05T04:00:00.000Z"],
] as const;

const EXPANSION_WINDOWS = [
	["2022-07-01T04:00:00.000Z", "2022-07-06T04:00:00.000Z"],
	["2023-07-03T04:00:00.000Z", "2023-07-06T04:00:00.000Z"],
	["2025-07-01T04:00:00.000Z", "2025-07-07T04:00:00.000Z"],
] as const;

function instrumentReport(
	symbol: string,
	windows: readonly (readonly [string, string])[],
	researchPolicy: Exclude<DailySwingSetupResearchPolicy, "none">,
): DailySwingInstrumentSetupScan {
	const instrumentId = `backtest:us-etf:${symbol.toLowerCase()}`;
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
			researchPolicy,
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

function sourceReport(source: "base" | "expansion"): DailySwingSetupScanReport {
	const base = source === "base";
	const candidates = base
		? BROAD_DEVELOPMENT_SYMBOLS
		: BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS;
	const excluded = new Set(base ? ["JNK"] : ["GDXJ", "OIH"]);
	const eligible = candidates.filter((symbol) => !excluded.has(symbol));
	const researchPolicy = base
		? "broad_development_v1"
		: "broad_development_v2_expansion";
	const reports = eligible.map((symbol, index) =>
		instrumentReport(
			symbol,
			index === 0 ? (base ? BASE_WINDOWS : EXPANSION_WINDOWS) : [],
			researchPolicy,
		),
	);
	const setups = base ? BASE_WINDOWS.length : EXPANSION_WINDOWS.length;
	return {
		scanVersion: "2.0.0",
		generatedAt: "2026-08-19T00:00:00.000Z",
		universeName: base
			? BROAD_DEVELOPMENT_UNIVERSE_NAME
			: BROAD_DEVELOPMENT_V2_EXPANSION_NAME,
		...(!base
			? { sourceSha256: BROAD_DEVELOPMENT_V2_EXPANSION_SOURCE_SHA256 }
			: {}),
		methodology: {
			evaluationPolicy: "every_eligible_completed_bar",
			labelPolicy: "independent_fixed_equity_simulation",
			researchPolicy,
			description: "fixture",
		},
		aggregate: {
			candidatesReceived: candidates.length,
			instrumentsScanned: eligible.length,
			coverageExcluded: excluded.size,
			analyses: setups,
			setups,
			liquidityRejected: 0,
			triggered: 0,
			untriggered: setups,
		},
		reports,
		warnings: [],
	};
}

function build(baseReport = sourceReport("base"), expansionReport = sourceReport("expansion")) {
	return buildDailySwingCombinedBroadDataset({
		baseReport,
		baseSetupScanSha256: DAILY_SWING_BROAD_SETUP_SCAN_SHA256,
		expansionReport,
		expansionSetupScanSha256: DAILY_SWING_BROAD_EXPANSION_SETUP_SCAN_SHA256,
		generatedAt: new Date("2026-08-19T10:00:00.000Z"),
	});
}

describe("daily swing combined broad dataset v3", () => {
	it("joins both frozen sources with row provenance and unchanged splits", () => {
		const dataset = build();
		assert.equal(dataset.datasetVersion, "3.0.0");
		assert.deepEqual(
			dataset.source.scans.map((source) => source.setupScanSha256),
			[
				DAILY_SWING_BROAD_SETUP_SCAN_SHA256,
				DAILY_SWING_BROAD_EXPANSION_SETUP_SCAN_SHA256,
			],
		);
		assert.equal(dataset.rows.length, 9);
		assert.equal(dataset.splits.train.rows, 5);
		assert.equal(dataset.splits.validation.rows, 2);
		assert.equal(dataset.splits.test.rows, 2);
		assert.deepEqual(new Set(dataset.rows.map((row) => row.sourceScan)), new Set(["base", "expansion"]));
		assert.ok(dataset.rows.every((row) => !("sourceScan" in row.features)));
	});

	it("rejects source checksum and expansion-history drift", () => {
		assert.throws(
			() =>
				buildDailySwingCombinedBroadDataset({
					baseReport: sourceReport("base"),
					baseSetupScanSha256: DAILY_SWING_BROAD_SETUP_SCAN_SHA256,
					expansionReport: sourceReport("expansion"),
					expansionSetupScanSha256: "0".repeat(64),
				}),
			/checksum/,
		);
		const expansion = sourceReport("expansion");
		expansion.sourceSha256 = "0".repeat(64);
		assert.throws(() => build(sourceReport("base"), expansion), /history checksum/);
	});

	it("is deterministic and keeps inventories independent of sealed labels", () => {
		assert.deepEqual(build(), build());
		const changed = sourceReport("expansion");
		changed.reports[0].untriggeredSetups.at(-1)!.reason = "end_of_data";
		const original = build();
		const modified = build(sourceReport("base"), changed);
		assert.deepEqual(original.source, modified.source);
		assert.deepEqual(original.eligibility, modified.eligibility);
		assert.deepEqual(original.splitPolicy, modified.splitPolicy);
		assert.deepEqual(original.walkForwardFolds, modified.walkForwardFolds);
		assert.deepEqual(original.splits, modified.splits);
		assert.notDeepEqual(original.rows.at(-1)!.labels, modified.rows.at(-1)!.labels);
	});
});
