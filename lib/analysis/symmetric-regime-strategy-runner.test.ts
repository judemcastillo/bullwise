import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildDailySwingSymmetricCandidateRows,
	calculateShortBorrowStress,
	runDailySwingSymmetricRegimeDevelopment,
	type DailySwingSymmetricCandidateRow,
} from "@/lib/analysis/symmetric-regime-strategy-runner";
import { DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_PROTOCOL } from "@/lib/analysis/symmetric-regime-strategy-development";
import type { DailySwingInstrumentSetupScan } from "@/lib/analysis/setup-scan.types";

const OBJECTIVE_FEATURES = {
	medianDollarVolume20: 100_000_000,
	medianDollarVolume60: 100_000_000,
	missingOrZeroVolumeRate20: 0,
	dollarVolumePercentile252: 0.5,
	amihudIlliquidity20PerBillion: 0.01,
	bodyToRange: 0.5,
	upperWickToRange: 0.25,
	lowerWickToRange: 0.25,
	closeLocationInRange: 0.5,
	overnightGapAtr: 0,
	rangeAtr: 1,
	rangeCompression20: 1,
	directionalFollowThrough3Atr: -0.5,
	breakoutDisplacementAtr: 0.2,
	entryToNearestSupportAtr: 2,
	entryToNearestResistanceAtr: 1,
	nearestSupportPivotTouches: 2,
	nearestResistancePivotTouches: 3,
	supportZoneTouches120: 2,
	supportZoneRejections120: 1,
	resistanceZoneTouches120: 3,
	resistanceZoneRejections120: 2,
	volumePercentile252: 0.5,
	relativeVolume20: 1,
	volumeToPriceMove20: 1,
};

function shortScanFixture(): DailySwingInstrumentSetupScan {
	const signalAt = "2020-06-01T04:00:00.000Z";
	const instrumentId = "fixture:short";
	const signalQuality = {
		evidenceStrength: "moderate" as const,
		relativeStrength20Percent: -1,
		volumeZScore20: 0.5,
		planRiskReward: 2,
	};
	const signalFeatures = {
		momentumRegime: "bearish" as const,
		participationRegime: "normal" as const,
		sma20DistancePercent: -1,
		sma50DistancePercent: -2,
		sma200DistancePercent: -3,
		sma20SlopePercent: -0.2,
		sma50SlopePercent: -0.1,
		rsi14: 40,
		macdHistogramPercent: -0.1,
		atrPercent: 2,
		return5Percent: -1,
		return20Percent: -2,
		return60Percent: -3,
		realizedVolatility20Percent: 15,
		realizedVolatility60Percent: 14,
		volatilityPercentile: 50,
		relativeStrength60Percent: -1,
	};
	return {
		instrument: {
			instrumentId,
			displaySymbol: "FIX",
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
			allowShortSetups: true,
		},
		window: {
			requestedStartAt: "2016-01-01T00:00:00.000Z",
			requestedEndAt: "2022-12-31T23:59:59.999Z",
			firstEvaluatedAt: signalAt,
			lastEvaluatedAt: signalAt,
			barsAvailable: 1_500,
		},
		signalCounts: {
			analyses: 1,
			unavailable: 0,
			noTrade: 0,
			longSetups: 0,
			shortSetups: 1,
			triggered: 1,
			expiredUntriggered: 0,
			endOfDataUntriggered: 0,
		},
		eligibility: {
			researchPolicy: "broad_development_v1",
			setupsEvaluated: 1,
			liquidityRejected: 0,
		},
		objectiveFeatures: [
			{
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
						plannedPositionNotional: 10_000,
						positionFractionOfMedianDollarVolume: 0.0001,
						thresholds: {
							windowSessions: 20,
							minimumObservedSessions: 19,
							minimumMedianDollarVolume: 10_000_000,
							maximumPositionFractionOfMedianDollarVolume: 0.01,
						},
					},
				},
			},
		],
		trades: [
			{
				instrumentId,
				direction: "short",
				setupType: "breakdown",
				signalAt,
				entryAt: "2020-06-02T04:00:00.000Z",
				entryPrice: 100,
				stopPrice: 110,
				targetPrices: [90, 80],
				exitAt: "2020-06-03T04:00:00.000Z",
				exitReason: "target_2",
				exitFills: [],
				barsHeld: 2,
				trendRegime: "bearish",
				volatilityRegime: "normal",
				signalQuality,
				signalFeatures,
				positionUnits: 100,
				riskCapital: 1_000,
				grossPnl: 600,
				transactionCosts: 100,
				netPnl: 500,
				netReturnOnEquityPercent: 0.5,
				rMultiple: 0.5,
				maximumFavorableExcursionPercent: 5,
				maximumAdverseExcursionPercent: -1,
				markToMarket: [],
			},
		],
		untriggeredSetups: [],
	};
}

function syntheticRows() {
	return ([2020, 2021, 2022] as const).flatMap((year) =>
		Array.from({ length: 400 }, (_, index) => {
			const direction = index < 100 ? ("short" as const) : ("long" as const);
			const directionIndex = direction === "short" ? index : index - 100;
			const directionSize = direction === "short" ? 100 : 300;
			const positive = directionIndex < directionSize * 0.6;
			return {
				rowId: `fixture:${year}:${index}|${year}-06-01T04:00:00.000Z`,
				instrumentId: `fixture:${year}:${index}`,
				displaySymbol: `F${index}`,
				signalAt: `${year}-06-01T04:00:00.000Z`,
				resolvedAt: `${year}-06-03T04:00:00.000Z`,
				features: {
					direction,
					setupType: direction === "short" ? "breakdown" : "breakout",
				},
				labels: {
					triggered: true,
					profitable: positive,
					netRMultiple: positive ? 1 : -1,
					exitReason: positive ? "target_2" : "stop_loss",
					targetOneReached: positive,
					maximumFavorableExcursionPercent: positive ? 2 : 0,
					maximumAdverseExcursionPercent: positive ? 0 : -1,
				},
				sourceScan: index % 2 === 0 ? "base" : "expansion",
				utilityBeforeBorrowR: positive ? 1 : -1,
				shortBorrowCost: direction === "short" ? 1 : 0,
				shortBorrowCostR: 0,
				utilityAfterBorrowR: positive ? 1 : -1,
			} as unknown as DailySwingSymmetricCandidateRow;
		}),
	);
}

function run(rows = syntheticRows()) {
	const protocol = DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_PROTOCOL;
	return runDailySwingSymmetricRegimeDevelopment({
		rows,
		baseHistorySha256: protocol.sources.baseHistory.sha256,
		expansionHistorySha256: protocol.sources.expansionHistory.sha256,
		rejectedDevelopment: {
			decision: { status: "reject_benchmark_risk_filter" },
		},
		rejectedDevelopmentSha256:
			protocol.sources.rejectedBenchmarkRiskFilter.sha256,
		scanInventory: {
			base: {
				featureRecords: 700,
				liquidityRejected: 10,
				boundaryTruncatedRows: 2,
			},
			expansion: {
				featureRecords: 500,
				liquidityRejected: 5,
				boundaryTruncatedRows: 1,
			},
		},
		generatedAt: new Date("2026-08-21T12:00:00.000Z"),
	});
}

describe("symmetric regime strategy runner", () => {
	it("builds a train row and subtracts borrow stress from a completed short", () => {
		const built = buildDailySwingSymmetricCandidateRows({
			reports: [shortScanFixture()],
			researchPolicy: "broad_development_v1",
			sourceScan: "base",
		});
		assert.equal(built.rows.length, 1);
		assert.equal(built.rows[0].features.direction, "short");
		assert.equal(built.rows[0].utilityBeforeBorrowR, 0.5);
		assert.equal(built.rows[0].shortBorrowCostR, 0.00136986);
		assert.equal(built.rows[0].utilityAfterBorrowR, 0.49863014);
	});

	it("charges the frozen short borrow rate using calendar days and entry notional", () => {
		const short = calculateShortBorrowStress({
			direction: "short",
			entryAt: "2020-01-01T00:00:00.000Z",
			exitAt: "2021-01-01T00:00:00.000Z",
			entryPrice: 100,
			positionUnits: 100,
			riskCapital: 1_000,
		});
		assert.equal(short.chargedDays, 366);
		assert.equal(short.cost, 501.36986301);
		assert.equal(short.costR, 0.50136986);

		const sameDay = calculateShortBorrowStress({
			direction: "short",
			entryAt: "2020-01-01T15:00:00.000Z",
			exitAt: "2020-01-01T20:00:00.000Z",
			entryPrice: 100,
			positionUnits: 100,
			riskCapital: 1_000,
		});
		assert.equal(sameDay.chargedDays, 1);
		assert.equal(sameDay.costR, 0.00136986);
	});

	it("passes only when all twelve frozen aggregate gates pass", () => {
		const report = run();
		assert.equal(report.generatedAt, "2026-08-21T12:00:00.000Z");
		assert.equal(report.overall.rows, 1_200);
		assert.equal(report.overall.shortRows, 300);
		assert.equal(report.overall.averageSetupUtilityR, 0.2);
		assert.equal(report.overall.profitFactor, 1.5);
		assert.equal(report.overall.triggeredShortRows, 300);
		assert.equal(report.overall.averageTriggeredShortBorrowCostR, 0);
		assert.equal(report.gates.length, 12);
		assert.ok(report.gates.every((gate) => gate.passed));
		assert.equal(report.decision.passed, true);
		assert.equal(
			report.decision.status,
			"advance_to_separate_validation_preregistration",
		);
		assert.equal(report.decision.authorizesValidationAccess, false);
		assert.equal(report.decision.authorizesProductSignals, false);
		assert.equal(report.decision.authorizesLiveTrading, false);
		assert.equal(report.dataAccess.validationFeaturesRead, false);
		assert.equal(report.dataAccess.testLabelsRead, false);
		const serialized = JSON.stringify(report);
		assert.doesNotMatch(serialized, /instrumentId|displaySymbol|F399/);
	});

	it("fails closed for source drift, rejection drift, and non-train rows", () => {
		const protocol = DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_PROTOCOL;
		assert.throws(
			() =>
				runDailySwingSymmetricRegimeDevelopment({
					rows: syntheticRows(),
					baseHistorySha256: "0".repeat(64),
					expansionHistorySha256: protocol.sources.expansionHistory.sha256,
					rejectedDevelopment: {
						decision: { status: "reject_benchmark_risk_filter" },
					},
					rejectedDevelopmentSha256:
						protocol.sources.rejectedBenchmarkRiskFilter.sha256,
					scanInventory: {
						base: { featureRecords: 1, liquidityRejected: 0, boundaryTruncatedRows: 0 },
						expansion: { featureRecords: 1, liquidityRejected: 0, boundaryTruncatedRows: 0 },
					},
				}),
			/checksum does not match/,
		);
		const changed = syntheticRows();
		changed[0] = {
			...changed[0],
			signalAt: "2023-01-01T00:00:00.000Z",
			resolvedAt: "2023-01-02T00:00:00.000Z",
		};
		assert.throws(() => run(changed), /not train-only/);

		const unreconciled = syntheticRows();
		unreconciled[0] = {
			...unreconciled[0],
			shortBorrowCostR: 0.1,
		};
		assert.throws(() => run(unreconciled), /does not reconcile/);
	});
});
