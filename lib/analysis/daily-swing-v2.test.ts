import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyDailySwingV2Rules } from "@/lib/analysis/daily-swing-v2";
import {
	DAILY_SWING_V2_STRATEGY_VERSION,
	type ParticipationState,
	type TechnicalAnalysisReadyResult,
	type TradePlan,
} from "@/lib/analysis/technical-analysis.types";

function plan(overrides: Partial<TradePlan> = {}): TradePlan {
	return {
		direction: "long",
		status: "active",
		entry: {
			type: "breakout",
			low: "101",
			high: "102",
			trigger: "Confirmed breakout.",
		},
		stopLoss: { price: "98", reason: "Structural stop." },
		targets: [
			{ price: "107", rewardRisk: 1.5, reason: "1.5R" },
			{ price: "109", rewardRisk: 2, reason: "2R" },
		],
		riskReward: 2,
		invalidation: "Close below 98.",
		expiresAfterCompletedBars: 10,
		expiresAt: null,
		...overrides,
	};
}

function readyResult(options: {
	tradePlan?: TradePlan;
	relativeStrength20Percent?: number | null;
	participation?: ParticipationState;
} = {}): TechnicalAnalysisReadyResult {
	const tradePlan = options.tradePlan ?? plan();
	return {
		engineVersion: "1.0.0",
		strategyVersion: "daily-swing-v1-draft",
		instrument: {
			instrumentId: "test",
			displaySymbol: "TEST",
			assetClass: "equity",
			securityType: "etf",
			etfProfile: "standard",
			currency: "USD",
			pricePrecision: 2,
		},
		analyzedAt: "2026-08-19T00:00:00.000Z",
		scope: {
			style: "swing",
			primaryInterval: "1d",
			expectedHoldingPeriod: "5-20 trading days",
		},
		dataQuality: {
			provider: "alpaca",
			providerSymbol: "TEST",
			interval: "1d",
			adjusted: true,
			barsReceived: 300,
			barsUsed: 300,
			barsExcluded: 0,
			firstBarAt: "2025-01-01T00:00:00.000Z",
			lastBarAt: "2026-08-18T00:00:00.000Z",
			completedThrough: "2026-08-18T00:00:00.000Z",
			warnings: [],
		},
		status: "ready",
		indicators: {
			close: "101.5",
			sma20: "100",
			sma50: "98",
			sma200: "90",
			sma20SlopePercent: 1,
			sma50SlopePercent: 1,
			rsi14: 60,
			macd: "1",
			macdSignal: "0.8",
			macdHistogram: "0.2",
			atr14: "2",
			atrPercent: 2,
			return5Percent: 2,
			return20Percent: 5,
			return60Percent: 10,
			realizedVolatility20Percent: 20,
			realizedVolatility60Percent: 18,
			volatilityPercentile: 50,
			volumeZScore20: 0,
			relativeStrength20Percent:
				options.relativeStrength20Percent === undefined
					? 1
					: options.relativeStrength20Percent,
			relativeStrength60Percent: 2,
		},
		assessments: {
			trend: { state: "bullish", evidence: [], counterEvidence: [] },
			momentum: { state: "bullish", evidence: [], counterEvidence: [] },
			volatility: { state: "normal", evidence: [], counterEvidence: [] },
			participation: {
				state: options.participation ?? "normal",
				evidence: [],
				counterEvidence: [],
			},
		},
		marketStructure: { support: [], resistance: [] },
		signal: {
			action: "long_setup",
			status: tradePlan.status,
			evidenceStrength: "strong",
			reasons: [],
			counterEvidence: [],
		},
		tradePlan,
	};
}

describe("daily swing v2 frozen filter", () => {
	it("accepts only an active breakout with positive relative strength and participation", () => {
		const result = applyDailySwingV2Rules(readyResult());
		assert.equal(result.strategyVersion, DAILY_SWING_V2_STRATEGY_VERSION);
		assert.equal(result.status, "ready");
		if (result.status === "ready") assert.ok(result.tradePlan);
	});

	it("rejects pullbacks, watched breakouts, weak relative strength, and weak volume", () => {
		const candidates = [
			readyResult({
				tradePlan: plan({ entry: { ...plan().entry, type: "pullback" } }),
			}),
			readyResult({ tradePlan: plan({ status: "watching" }) }),
			readyResult({ relativeStrength20Percent: 0 }),
			readyResult({ participation: "weak" }),
		];
		for (const candidate of candidates) {
			const result = applyDailySwingV2Rules(candidate);
			assert.equal(result.status, "ready");
			if (result.status !== "ready") continue;
			assert.equal(result.signal.action, "no_trade");
			assert.equal(result.tradePlan, null);
		}
	});
});
