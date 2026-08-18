import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	runDailySwingBacktest,
	simulateTradePlan,
} from "@/lib/analysis/backtest";
import type { DailySwingAnalysisInput } from "@/lib/analysis/technical-analysis";
import type {
	TechnicalAnalysisReadyResult,
	TradePlan,
} from "@/lib/analysis/technical-analysis.types";
import type { MarketBar, MarketBars } from "@/lib/market-data/types";

const DAY_MS = 24 * 60 * 60 * 1_000;
const SIGNAL_AT = new Date("2025-01-01T00:00:00.000Z");

function bar(
	daysAfterSignal: number,
	prices: { open: number; high: number; low: number; close: number },
): MarketBar {
	return {
		startedAt: new Date(SIGNAL_AT.getTime() + daysAfterSignal * DAY_MS),
		open: String(prices.open),
		high: String(prices.high),
		low: String(prices.low),
		close: String(prices.close),
		volume: "1000000",
	};
}

function longPlan(overrides: Partial<TradePlan> = {}): TradePlan {
	return {
		direction: "long",
		status: "active",
		entry: { type: "pullback", low: "100", high: "101", trigger: "test" },
		stopLoss: { price: "95", reason: "test" },
		targets: [
			{ price: "105", rewardRisk: 1, reason: "test" },
			{ price: "110", rewardRisk: 2, reason: "test" },
		],
		riskReward: 2,
		invalidation: "test",
		expiresAfterCompletedBars: 3,
		expiresAt: null,
		...overrides,
	};
}

function shortPlan(): TradePlan {
	return {
		direction: "short",
		status: "active",
		entry: { type: "breakdown", low: "100", high: "101", trigger: "test" },
		stopLoss: { price: "106", reason: "test" },
		targets: [
			{ price: "96", rewardRisk: 1, reason: "test" },
			{ price: "91", rewardRisk: 2, reason: "test" },
		],
		riskReward: 2,
		invalidation: "test",
		expiresAfterCompletedBars: 3,
		expiresAt: null,
	};
}

function simulate(
	futureBars: MarketBar[],
	options: Parameters<typeof simulateTradePlan>[0]["configuration"] = {},
) {
	return simulateTradePlan({
		instrumentId: "instrument-test",
		plan: longPlan(),
		signalAt: SIGNAL_AT,
		trendRegime: "bullish",
		volatilityRegime: "normal",
		futureBars,
		equity: 100_000,
		configuration: {
			transactionCostBpsPerSide: 0,
			slippageBpsPerFill: 0,
			...options,
		},
	});
}

describe("trade-plan simulation", () => {
	it("expires a setup that never enters its zone", () => {
		const result = simulate([
			bar(1, { open: 103, high: 104, low: 102, close: 103 }),
			bar(2, { open: 104, high: 105, low: 103, close: 104 }),
			bar(3, { open: 105, high: 106, low: 104, close: 105 }),
			bar(4, { open: 100, high: 111, low: 99, close: 110 }),
		]);
		assert.equal(result.status, "untriggered");
		if (result.status === "untriggered") {
			assert.equal(result.setup.reason, "expired");
			assert.equal(result.setup.barsObserved, 3);
			assert.equal(result.barsConsumed, 3);
		}
	});

	it("uses stop-first when one candle touches the stop and both targets", () => {
		const result = simulate([
			bar(1, { open: 100, high: 111, low: 94, close: 101 }),
		]);
		assert.equal(result.status, "completed");
		if (result.status === "completed") {
			assert.equal(result.trade.exitReason, "stop_loss");
			assert.deepEqual(
				result.trade.exitFills.map((fill) => [fill.reason, fill.positionFraction]),
				[["stop_loss", 1]],
			);
			assert.equal(result.trade.rMultiple, -1);
		}
	});

	it("can use target-first explicitly for ambiguous candles", () => {
		const result = simulate(
			[bar(1, { open: 100, high: 111, low: 94, close: 101 })],
			{ sameBarPolicy: "target_first" },
		);
		assert.equal(result.status, "completed");
		if (result.status === "completed") {
			assert.equal(result.trade.exitReason, "target_2");
			assert.deepEqual(
				result.trade.exitFills.map((fill) => [fill.reason, fill.positionFraction]),
				[
					["target_1", 0.5],
					["target_2", 0.5],
				],
			);
			assert.equal(result.trade.rMultiple, 1.5);
		}
	});

	it("takes half at target one and stops the remainder later", () => {
		const result = simulate([
			bar(1, { open: 100, high: 106, low: 99, close: 104 }),
			bar(2, { open: 104, high: 104, low: 94, close: 96 }),
		]);
		assert.equal(result.status, "completed");
		if (result.status === "completed") {
			assert.equal(result.trade.exitReason, "stop_loss");
			assert.deepEqual(
				result.trade.exitFills.map((fill) => [fill.reason, fill.positionFraction]),
				[
					["target_1", 0.5],
					["stop_loss", 0.5],
				],
			);
			assert.equal(result.trade.rMultiple, 0);
		}
	});

	it("records completed-bar mark-to-market PnL while a trade is open", () => {
		const result = simulate([
			bar(1, { open: 100, high: 104, low: 96, close: 96 }),
			bar(2, { open: 96, high: 111, low: 96, close: 110 }),
		]);
		assert.equal(result.status, "completed");
		if (result.status !== "completed") return;
		assert.deepEqual(
			result.trade.markToMarket.map((mark) => ({
				netPnl: mark.netPnl,
				remaining: mark.remainingPositionFraction,
			})),
			[
				{ netPnl: -800, remaining: 1 },
				{ netPnl: 1_500, remaining: 0 },
			],
		);
	});

	it("reduces net performance for configured costs and slippage", () => {
		const futureBars = [
			bar(1, { open: 100, high: 101, low: 99, close: 100 }),
			bar(2, { open: 105, high: 111, low: 104, close: 110 }),
		];
		const frictionless = simulate(futureBars);
		const costed = simulate(futureBars, {
			transactionCostBpsPerSide: 10,
			slippageBpsPerFill: 10,
		});
		assert.equal(frictionless.status, "completed");
		assert.equal(costed.status, "completed");
		if (frictionless.status === "completed" && costed.status === "completed") {
			assert.ok(costed.trade.netPnl < frictionless.trade.netPnl);
			assert.ok(costed.trade.transactionCosts > 0);
			assert.ok(costed.trade.entryPrice > frictionless.trade.entryPrice);
		}
	});

	it("closes an open position at the maximum holding period", () => {
		const result = simulate(
			[
				bar(1, { open: 100, high: 104, low: 99, close: 102 }),
				bar(2, { open: 102, high: 104, low: 99, close: 103 }),
				bar(3, { open: 103, high: 111, low: 102, close: 110 }),
			],
			{ maximumHoldingBars: 2 },
		);
		assert.equal(result.status, "completed");
		if (result.status === "completed") {
			assert.equal(result.trade.exitReason, "maximum_holding_period");
			assert.equal(result.trade.barsHeld, 2);
			assert.equal(result.trade.exitAt, bar(2, { open: 1, high: 1, low: 1, close: 1 }).startedAt.toISOString());
		}
	});

	it("mirrors entry and target execution for short setups", () => {
		const result = simulateTradePlan({
			instrumentId: "instrument-test",
			plan: shortPlan(),
			signalAt: SIGNAL_AT,
			trendRegime: "bearish",
			volatilityRegime: "normal",
			futureBars: [
				bar(1, { open: 101, high: 102, low: 99, close: 100 }),
				bar(2, { open: 96, high: 97, low: 90, close: 91 }),
			],
			equity: 100_000,
			configuration: {
				transactionCostBpsPerSide: 0,
				slippageBpsPerFill: 0,
			},
		});
		assert.equal(result.status, "completed");
		if (result.status === "completed") {
			assert.equal(result.trade.direction, "short");
			assert.equal(result.trade.exitReason, "target_2");
			assert.equal(result.trade.rMultiple, 1.5);
		}
	});
});

function historicalBars(count: number): MarketBar[] {
	const firstAt = SIGNAL_AT.getTime() - 299 * DAY_MS;
	return Array.from({ length: count }, (_, index) => {
		const startedAt = new Date(firstAt + index * DAY_MS);
		if (index === 300) {
			return { ...bar(1, { open: 100, high: 101, low: 99, close: 100 }), startedAt };
		}
		if (index === 301) {
			return { ...bar(2, { open: 105, high: 111, low: 104, close: 110 }), startedAt };
		}
		return {
			startedAt,
			open: "100",
			high: "101",
			low: "99",
			close: "100",
			volume: "1000000",
		};
	});
}

function marketBars(bars: MarketBar[]): MarketBars {
	return {
		instrumentId: "instrument-test",
		provider: "fixture",
		providerSymbol: "TEST",
		currency: "USD",
		interval: "1d",
		from: bars[0].startedAt,
		to: bars.at(-1)!.startedAt,
		adjusted: true,
		timeliness: "historical",
		bars,
	};
}

function readyResult(
	input: DailySwingAnalysisInput,
	tradePlan: TradePlan | null,
): TechnicalAnalysisReadyResult {
	return {
		status: "ready",
		engineVersion: "1.0.0",
		strategyVersion: "daily-swing-v1-draft",
		instrument: input.instrument,
		analyzedAt: input.analyzedAt.toISOString(),
		scope: {
			style: "swing",
			primaryInterval: "1d",
			expectedHoldingPeriod: "5-20 trading days",
		},
		dataQuality: {
			provider: input.marketData.provider,
			providerSymbol: input.marketData.providerSymbol,
			interval: "1d",
			adjusted: true,
			barsReceived: input.marketData.bars.length,
			barsUsed: input.marketData.bars.length,
			barsExcluded: 0,
			firstBarAt: input.marketData.bars[0].startedAt.toISOString(),
			lastBarAt: input.marketData.bars.at(-1)!.startedAt.toISOString(),
			completedThrough: input.completedThrough.toISOString(),
			warnings: [],
		},
		indicators: {
			close: "100",
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
			return5Percent: 0,
			return20Percent: 0,
			return60Percent: 0,
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
		marketStructure: { support: [], resistance: [] },
		signal: {
			action: tradePlan ? "long_setup" : "no_trade",
			status: tradePlan ? "active" : "none",
			evidenceStrength: "moderate",
			reasons: [],
			counterEvidence: [],
		},
		tradePlan,
	};
}

describe("daily swing walk-forward backtest", () => {
	it("never exposes future bars to the analyzer and fills only after the signal", () => {
		const bars = historicalBars(303);
		let calls = 0;
		const report = runDailySwingBacktest(
			{
				instrument: {
					instrumentId: "instrument-test",
					displaySymbol: "TEST",
					assetClass: "equity",
					securityType: "common_stock",
					currency: "USD",
					pricePrecision: 2,
				},
				marketData: marketBars(bars),
				configuration: {
					transactionCostBpsPerSide: 0,
					slippageBpsPerFill: 0,
				},
			},
			{
				analyze: (input) => {
					calls += 1;
					assert.equal(
						input.marketData.bars.at(-1)!.startedAt.toISOString(),
						input.completedThrough.toISOString(),
					);
					assert.ok(
						input.marketData.bars.every(
							(item) => item.startedAt <= input.completedThrough,
						),
					);
					return readyResult(input, calls === 1 ? longPlan() : null);
				},
			},
		);

		assert.equal(report.signalCounts.triggered, 1);
		assert.equal(report.performance.tradeCount, 1);
		assert.equal(report.trades[0].signalAt, bars[299].startedAt.toISOString());
		assert.equal(report.trades[0].entryAt, bars[300].startedAt.toISOString());
		assert.equal(report.trades[0].exitAt, bars[301].startedAt.toISOString());
		assert.equal(report.byDirection.long.tradeCount, 1);
		assert.equal(report.byRegime.length, 1);
	});

	it("includes open-trade closing marks in account drawdown", () => {
		const bars = historicalBars(303);
		bars[300] = {
			...bars[300],
			high: "104",
			low: "96",
			close: "96",
		};
		let calls = 0;
		const report = runDailySwingBacktest(
			{
				instrument: {
					instrumentId: "instrument-test",
					displaySymbol: "TEST",
					assetClass: "equity",
					securityType: "common_stock",
					currency: "USD",
					pricePrecision: 2,
				},
				marketData: marketBars(bars),
				configuration: {
					transactionCostBpsPerSide: 0,
					slippageBpsPerFill: 0,
				},
			},
			{
				analyze: (input) => {
					calls += 1;
					return readyResult(input, calls === 1 ? longPlan() : null);
				},
			},
		);

		assert.equal(report.performance.maximumDrawdownPercent, 0.8);
		assert.ok(
			report.equityCurve.some(
				(point) => point.equity === 99_200 && point.drawdownPercent === 0.8,
			),
		);
	});
});
