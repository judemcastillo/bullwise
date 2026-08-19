import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDailySwingObjectiveFeatures } from "@/lib/analysis/objective-features";
import type {
	TechnicalAnalysisReadyResult,
	TradePlan,
} from "@/lib/analysis/technical-analysis.types";
import type { MarketBar } from "@/lib/market-data/types";

const DAY_MS = 86_400_000;

function plan(): TradePlan {
	return {
		direction: "long",
		status: "active",
		entry: { type: "breakout", low: "100", high: "101", trigger: "test" },
		stopLoss: { price: "95", reason: "test" },
		targets: [
			{ price: "109", rewardRisk: 1.5, reason: "test" },
			{ price: "112", rewardRisk: 2, reason: "test" },
		],
		riskReward: 2,
		invalidation: "test",
		expiresAfterCompletedBars: 3,
		expiresAt: null,
	};
}

function bars(volume = "1000000") {
	const firstAt = Date.parse("2025-01-01T00:00:00.000Z");
	return Array.from({ length: 70 }, (_, index): MarketBar => ({
		startedAt: new Date(firstAt + index * DAY_MS),
		open: index === 69 ? "99.8" : "100",
		high: index === 69 ? "102" : "101",
		low: index === 69 ? "98" : "99",
		close: index === 69 ? "100.8" : "100",
		volume,
	}));
}

function result(source: readonly MarketBar[]): TechnicalAnalysisReadyResult {
	const lastAt = source.at(-1)!.startedAt.toISOString();
	return {
		status: "ready",
		engineVersion: "1.0.0",
		strategyVersion: "daily-swing-v1-draft",
		instrument: {
			instrumentId: "objective:test",
			displaySymbol: "TEST",
			assetClass: "equity",
			securityType: "etf",
			currency: "USD",
			pricePrecision: 2,
		},
		analyzedAt: lastAt,
		scope: {
			style: "swing",
			primaryInterval: "1d",
			expectedHoldingPeriod: "5-20 trading days",
		},
		dataQuality: {
			provider: "fixture",
			providerSymbol: "TEST",
			interval: "1d",
			adjusted: true,
			barsReceived: source.length,
			barsUsed: source.length,
			barsExcluded: 0,
			firstBarAt: source[0].startedAt.toISOString(),
			lastBarAt: lastAt,
			completedThrough: lastAt,
			warnings: [],
		},
		indicators: {
			close: "100.8",
			sma20: "100",
			sma50: "100",
			sma200: "100",
			sma20SlopePercent: 0,
			sma50SlopePercent: 0,
			rsi14: 50,
			macd: "0",
			macdSignal: "0",
			macdHistogram: "0",
			atr14: "2",
			atrPercent: 2,
			return5Percent: 0.8,
			return20Percent: 0.8,
			return60Percent: 0.8,
			realizedVolatility20Percent: 10,
			realizedVolatility60Percent: 10,
			volatilityPercentile: 50,
			volumeZScore20: 0,
			relativeStrength20Percent: null,
			relativeStrength60Percent: null,
		},
		assessments: {
			trend: { state: "bullish", evidence: [], counterEvidence: [] },
			momentum: { state: "bullish", evidence: [], counterEvidence: [] },
			volatility: { state: "normal", evidence: [], counterEvidence: [] },
			participation: { state: "normal", evidence: [], counterEvidence: [] },
		},
		marketStructure: {
			support: [
				{
					kind: "support",
					price: "99.5",
					distancePercent: 1,
					touches: 3,
					source: "swing_cluster",
				},
			],
			resistance: [
				{
					kind: "resistance",
					price: "101.5",
					distancePercent: 1,
					touches: 2,
					source: "range_boundary",
				},
			],
		},
		signal: {
			action: "long_setup",
			status: "active",
			evidenceStrength: "moderate",
			reasons: [],
			counterEvidence: [],
		},
		tradePlan: plan(),
	};
}

describe("daily swing objective signal-time features", () => {
	it("computes frozen liquidity, candle, price-action, and structural fields", () => {
		const source = bars();
		const snapshot = buildDailySwingObjectiveFeatures({
			bars: source,
			result: result(source),
			equity: 100_000,
			riskPerTradePercent: 1,
		});

		assert.equal(snapshot.featureVersion, "1.0.0");
		assert.equal(snapshot.liquidity.eligible, true);
		assert.equal(snapshot.liquidity.observedSessions20, 20);
		assert.equal(snapshot.features.missingOrZeroVolumeRate20, 0);
		assert.equal(snapshot.features.bodyToRange, 0.25);
		assert.equal(snapshot.features.upperWickToRange, 0.3);
		assert.equal(snapshot.features.lowerWickToRange, 0.45);
		assert.equal(snapshot.features.closeLocationInRange, 0.7);
		assert.equal(snapshot.features.rangeAtr, 2);
		assert.equal(snapshot.features.rangeCompression20, 2);
		assert.equal(snapshot.features.entryToNearestSupportAtr, 0.5);
		assert.equal(snapshot.features.entryToNearestResistanceAtr, 0.5);
		assert.equal(snapshot.features.nearestSupportPivotTouches, 3);
		assert.equal(snapshot.features.nearestResistancePivotTouches, 2);
		assert.ok((snapshot.features.supportZoneTouches120 ?? 0) > 0);
		assert.ok((snapshot.features.supportZoneRejections120 ?? 0) > 0);
	});

	it("marks missing signal-time volume as ineligible", () => {
		const source = bars();
		delete source[50].volume;
		delete source[51].volume;
		const snapshot = buildDailySwingObjectiveFeatures({
			bars: source,
			result: result(source),
			equity: 100_000,
			riskPerTradePercent: 1,
		});

		assert.equal(snapshot.liquidity.eligible, false);
		assert.equal(snapshot.liquidity.observedSessions20, 18);
		assert.equal(snapshot.features.missingOrZeroVolumeRate20, 0.1);
		assert.ok(
			snapshot.liquidity.reasons.includes("insufficient_observed_sessions"),
		);
	});

	it("is unchanged when bars strictly after the signal are altered", () => {
		const throughSignal = bars();
		const signalIndex = throughSignal.length - 1;
		const original = [
			...throughSignal,
			{
				startedAt: new Date(throughSignal.at(-1)!.startedAt.getTime() + DAY_MS),
				open: "100",
				high: "101",
				low: "99",
				close: "100",
				volume: "1000000",
			},
		];
		const altered = original.map((bar, index) =>
			index <= signalIndex
				? bar
				: { ...bar, open: "500", high: "900", low: "1", close: "800", volume: "999999999999" },
		);
		const snapshot = (source: MarketBar[]) => {
			const visible = source.slice(0, signalIndex + 1);
			return buildDailySwingObjectiveFeatures({
				bars: visible,
				result: result(visible),
				equity: 100_000,
				riskPerTradePercent: 1,
			});
		};

		assert.deepEqual(snapshot(original), snapshot(altered));
	});
});
