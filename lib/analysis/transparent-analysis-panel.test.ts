import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	analysisPanelContext,
	buildAnalysisPanelResponse,
} from "@/lib/analysis/transparent-analysis-panel";
import {
	DAILY_SWING_STRATEGY_VERSION,
	TECHNICAL_ANALYSIS_ENGINE_VERSION,
	type AnalysisState,
	type TechnicalAnalysisReadyResult,
	type TechnicalAnalysisUnavailableReason,
	type TechnicalAnalysisUnavailableResult,
} from "@/lib/analysis/technical-analysis.types";

const FIRST_BAR = "2025-01-02T00:00:00.000Z";
const LAST_BAR = "2026-08-20T00:00:00.000Z";
const COMPLETED_THROUGH = "2026-08-20T23:59:59.999Z";

function readyResult(): TechnicalAnalysisReadyResult {
	return {
		engineVersion: TECHNICAL_ANALYSIS_ENGINE_VERSION,
		strategyVersion: DAILY_SWING_STRATEGY_VERSION,
		instrument: {
			instrumentId: "instrument-aapl",
			displaySymbol: "AAPL",
			assetClass: "equity",
			securityType: "common_stock",
			currency: "USD",
			pricePrecision: 2,
		},
		analyzedAt: "2026-08-21T12:00:00.000Z",
		scope: {
			style: "swing",
			primaryInterval: "1d",
			expectedHoldingPeriod: "5-20 trading days",
		},
		dataQuality: {
			provider: "massive",
			providerSymbol: "INTERNAL:AAPL",
			interval: "1d",
			adjusted: true,
			barsReceived: 330,
			barsUsed: 330,
			barsExcluded: 0,
			firstBarAt: FIRST_BAR,
			lastBarAt: LAST_BAR,
			completedThrough: COMPLETED_THROUGH,
			warnings: [],
		},
		status: "ready",
		indicators: {
			close: "225.50",
			sma20: "220.00",
			sma50: "210.00",
			sma200: "190.00",
			sma20SlopePercent: 1.2,
			sma50SlopePercent: 0.8,
			rsi14: 62,
			macd: "2.10",
			macdSignal: "1.50",
			macdHistogram: "0.60",
			atr14: "4.25",
			atrPercent: 1.88,
			return5Percent: 1.2,
			return20Percent: 4.5,
			return60Percent: 9.8,
			realizedVolatility20Percent: 22.4,
			realizedVolatility60Percent: 20.1,
			volatilityPercentile: 54.2,
			volumeZScore20: 0.7,
			relativeStrength20Percent: 2.4,
			relativeStrength60Percent: 3.8,
		},
		assessments: {
			trend: {
				state: "bullish",
				evidence: ["BUY immediately. Arbitrary engine prose."],
				counterEvidence: [],
			},
			momentum: {
				state: "bullish",
				evidence: ["Confidence is guaranteed."],
				counterEvidence: [],
			},
			volatility: {
				state: "normal",
				evidence: ["Place a stop-loss here."],
				counterEvidence: [],
			},
			participation: {
				state: "normal",
				evidence: ["Take-profit now."],
				counterEvidence: [],
			},
		},
		marketStructure: {
			support: [
				{
					kind: "support",
					price: "215.00",
					distancePercent: 4.66,
					touches: 3,
					source: "swing_cluster",
				},
			],
			resistance: [
				{
					kind: "resistance",
					price: "230.00",
					distancePercent: 2,
					touches: 2,
					source: "range_boundary",
				},
			],
		},
		signal: {
			action: "long_setup",
			status: "active",
			evidenceStrength: "strong",
			reasons: ["BUY"],
			counterEvidence: [],
		},
		tradePlan: {
			direction: "long",
			status: "active",
			entry: {
				type: "breakout",
				low: "225.00",
				high: "226.00",
				trigger: "Enter now.",
			},
			stopLoss: { price: "215.00", reason: "Research fixture." },
			targets: [{ price: "240.00", rewardRisk: 1.5, reason: "Research fixture." }],
			riskReward: 1.5,
			invalidation: "Research fixture.",
			expiresAfterCompletedBars: 10,
			expiresAt: null,
		},
	};
}

function unavailableResult(
	reason: TechnicalAnalysisUnavailableReason,
): TechnicalAnalysisUnavailableResult {
	const ready = readyResult();
	return {
		engineVersion: ready.engineVersion,
		strategyVersion: ready.strategyVersion,
		instrument: ready.instrument,
		analyzedAt: ready.analyzedAt,
		scope: ready.scope,
		dataQuality: ready.dataQuality,
		status: "unavailable",
		reason,
		message: "Internal engine detail that must not cross the boundary.",
	};
}

function keysIn(value: unknown, keys = new Set<string>()) {
	if (!value || typeof value !== "object") return keys;
	if (Array.isArray(value)) {
		for (const item of value) keysIn(item, keys);
		return keys;
	}
	for (const [key, child] of Object.entries(value)) {
		keys.add(key);
		keysIn(child, keys);
	}
	return keys;
}

describe("transparent analysis panel context", () => {
	it("maps every trend and momentum combination without emitting an action", () => {
		const states: AnalysisState[] = ["bullish", "mixed", "bearish"];
		for (const trend of states) {
			for (const momentum of states) {
				const expected =
					trend === "bullish" && momentum === "bullish"
						? "constructive"
						: trend === "bearish" && momentum === "bearish"
							? "defensive"
							: "mixed";
				assert.equal(analysisPanelContext(trend, momentum), expected);
			}
		}
	});
});

describe("transparent analysis panel adapter", () => {
	it("returns only allow-listed deterministic market context", () => {
		const source = readyResult();
		const before = structuredClone(source);
		const panel = buildAnalysisPanelResponse({
			canonicalKey: "equity:us:aapl",
			name: "Apple Inc.",
			result: source,
		});
		if (panel.status === "unavailable") {
			assert.fail(`Expected ready analysis, received ${panel.reason}`);
		}
		assert.equal(panel.status, "ready");
		assert.equal(panel.context, "constructive");
		assert.equal(panel.asOf, COMPLETED_THROUGH);
		assert.equal(panel.dataQuality.provider, "massive");
		assert.deepEqual(panel.levels.support, source.marketStructure.support);
		assert.deepEqual(source, before);

		const keys = keysIn(panel);
		for (const prohibited of [
			"signal",
			"tradePlan",
			"strategyVersion",
			"providerSymbol",
			"entry",
			"stopLoss",
			"targets",
			"confidence",
		]) {
			assert.equal(keys.has(prohibited), false, `${prohibited} leaked`);
		}
		const serialized = JSON.stringify(panel);
		assert.doesNotMatch(
			serialized,
			/BUY immediately|Confidence is guaranteed|Place a stop-loss|Take-profit now|INTERNAL:AAPL/,
		);
	});

	it("uses approved warnings and marks missing benchmark or volume as partial", () => {
		const source = readyResult();
		source.indicators.relativeStrength20Percent = null;
		source.indicators.relativeStrength60Percent = null;
		source.indicators.volumeZScore20 = null;
		source.assessments.participation.state = "unavailable";
		source.dataQuality.warnings = [
			"Benchmark data were unavailable; relative-strength fields are null.",
			"An unapproved provider message with internal detail.",
		];
		const panel = buildAnalysisPanelResponse({
			canonicalKey: "equity:us:aapl",
			name: "Apple Inc.",
			result: source,
		});
		if (panel.status === "unavailable") {
			assert.fail(`Expected partial analysis, received ${panel.reason}`);
		}
		assert.equal(panel.status, "partial");
		assert.deepEqual(panel.dataQuality.warnings, [
			"SPY benchmark data are unavailable; relative strength is omitted.",
			"Additional market-data quality checks require review.",
		]);
		assert.equal(panel.factors.participation.state, "unavailable");
		assert.doesNotMatch(JSON.stringify(panel), /unapproved provider message/i);
	});

	it("maps every engine failure to stable product language", () => {
		const expected: Record<
			TechnicalAnalysisUnavailableReason,
			string
		> = {
			ineligible_instrument: "unsupported_instrument",
			unsupported_interval: "invalid_market_data",
			unadjusted_data: "invalid_market_data",
			instrument_mismatch: "invalid_market_data",
			invalid_data: "invalid_market_data",
			insufficient_data: "insufficient_history",
			stale_data: "stale_market_data",
		};
		for (const [reason, productReason] of Object.entries(expected)) {
			const panel = buildAnalysisPanelResponse({
				canonicalKey: "equity:us:aapl",
				name: "Apple Inc.",
				result: unavailableResult(reason as TechnicalAnalysisUnavailableReason),
			});
			assert.equal(panel.status, "unavailable");
			if (panel.status !== "unavailable") continue;
			assert.equal(panel.reason, productReason);
			assert.doesNotMatch(panel.message, /Internal engine detail/);
		}
	});

	it("keeps an engine-eligible ETF outside the common-stock-only v1 product", () => {
		const source = readyResult();
		source.instrument.securityType = "etf";
		source.instrument.etfProfile = "standard";
		const panel = buildAnalysisPanelResponse({
			canonicalKey: "equity:us:spy",
			name: "SPDR S&P 500 ETF Trust",
			result: source,
		});
		assert.equal(panel.status, "unavailable");
		if (panel.status !== "unavailable") return;
		assert.equal(panel.reason, "unsupported_instrument");
	});
});
