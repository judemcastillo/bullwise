import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summarizeDailySwingBacktests } from "@/lib/analysis/batch-backtest";
import { buildDailySwingBatchDiagnostics } from "@/lib/analysis/batch-diagnostics";
import type {
	BacktestTrade,
	DailySwingBacktestReport,
} from "@/lib/analysis/backtest.types";

function trade(
	symbol: string,
	netPnl: number,
	rMultiple: number,
	overrides: Partial<BacktestTrade> = {},
): BacktestTrade {
	return {
		instrumentId: `backtest:etf:${symbol.toLowerCase()}`,
		direction: "long",
		setupType: "pullback",
		signalAt: "2026-01-01T00:00:00.000Z",
		entryAt: "2026-01-02T00:00:00.000Z",
		entryPrice: 100,
		stopPrice: 95,
		targetPrices: [105, 110],
		exitAt: "2026-01-03T00:00:00.000Z",
		exitReason: netPnl > 0 ? "target_2" : "stop_loss",
		exitFills: [],
		barsHeld: 2,
		trendRegime: "bullish",
		volatilityRegime: "normal",
		signalQuality: {
			evidenceStrength: "moderate",
			relativeStrength20Percent: 1,
			volumeZScore20: 0,
			planRiskReward: 2,
		},
		positionUnits: 200,
		riskCapital: 1_000,
		grossPnl: netPnl,
		transactionCosts: 0,
		netPnl,
		netReturnOnEquityPercent: netPnl / 1_000,
		rMultiple,
		maximumFavorableExcursionPercent: 5,
		maximumAdverseExcursionPercent: -2,
		markToMarket: [],
		...overrides,
	};
}

function report(
	symbol: string,
	totalReturnPercent: number,
	buyAndHoldReturnPercent: number,
	trades: BacktestTrade[],
): DailySwingBacktestReport {
	const wins = trades.filter((item) => item.netPnl > 0).length;
	const losses = trades.filter((item) => item.netPnl < 0).length;
	return {
		backtestVersion: "1.2.0",
		engineVersion: "1.0.0",
		strategyVersion: "daily-swing-v1-draft",
		instrument: {
			instrumentId: `backtest:etf:${symbol.toLowerCase()}`,
			displaySymbol: symbol,
			assetClass: "equity",
			securityType: "etf",
			etfProfile: "standard",
			currency: "USD",
			pricePrecision: 2,
		},
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
			requestedStartAt: null,
			requestedEndAt: null,
			firstEvaluatedAt: "2025-01-01T00:00:00.000Z",
			lastEvaluatedAt: "2026-01-01T00:00:00.000Z",
			barsAvailable: 500,
		},
		signalCounts: {
			analyses: 100,
			unavailable: 0,
			noTrade: 90,
			longSetups: 10,
			shortSetups: 0,
			triggered: trades.length,
			expiredUntriggered: 10 - trades.length,
			endOfDataUntriggered: 0,
		},
		performance: {
			tradeCount: trades.length,
			wins,
			losses,
			breakeven: trades.length - wins - losses,
			winRatePercent: trades.length === 0 ? null : (wins / trades.length) * 100,
			netPnl: trades.reduce((total, item) => total + item.netPnl, 0),
			averageNetPnl: null,
			averageRMultiple: null,
			profitFactor: null,
			averageFavorableExcursionPercent: null,
			averageAdverseExcursionPercent: null,
			initialEquity: 100_000,
			endingEquity: 100_000 * (1 + totalReturnPercent / 100),
			totalReturnPercent,
			maximumDrawdownPercent: Math.abs(totalReturnPercent) / 2,
		},
		byDirection: {
			long: {
				tradeCount: trades.length,
				wins,
				losses,
				breakeven: 0,
				winRatePercent: null,
				netPnl: 0,
				averageNetPnl: null,
				averageRMultiple: null,
				profitFactor: null,
				averageFavorableExcursionPercent: null,
				averageAdverseExcursionPercent: null,
			},
			short: {
				tradeCount: 0,
				wins: 0,
				losses: 0,
				breakeven: 0,
				winRatePercent: null,
				netPnl: 0,
				averageNetPnl: null,
				averageRMultiple: null,
				profitFactor: null,
				averageFavorableExcursionPercent: null,
				averageAdverseExcursionPercent: null,
			},
		},
		byRegime: [],
		baselines: {
			instrumentBuyAndHoldReturnPercent: buyAndHoldReturnPercent,
			benchmarkBuyAndHoldReturnPercent: 5,
			simpleMomentumReturnPercent: 1,
			definition:
				"Long when close is above SMA200 and 20-day return is positive; otherwise cash.",
		},
		equityCurve: [],
		trades,
		untriggeredSetups: [],
		warnings: [],
	};
}

describe("daily swing batch summaries", () => {
	it("rejects an empty report collection", () => {
		assert.throws(
			() => summarizeDailySwingBacktests("Test ETFs", []),
			/At least one report is required/,
		);
	});

	it("pools trade statistics and keeps instrument returns equal-weighted", () => {
		const spy = report("SPY", 2, 5, [
			trade("SPY", 1_000, 1),
			trade("SPY", -500, -0.5),
		]);
		const qqq = report("QQQ", -1, -2, [trade("QQQ", -100, -0.1)]);
		const batch = summarizeDailySwingBacktests(
			"Test ETFs",
			[spy, qqq],
			new Date("2026-08-18T00:00:00.000Z"),
		);

		assert.equal(batch.generatedAt, "2026-08-18T00:00:00.000Z");
		assert.equal(batch.aggregate.instrumentsTested, 2);
		assert.equal(batch.aggregate.totalTrades, 3);
		assert.equal(batch.aggregate.pooledWinRatePercent, 33.33333333);
		assert.equal(batch.aggregate.pooledAverageRMultiple, 0.13333333);
		assert.equal(batch.aggregate.pooledProfitFactor, 1.66666667);
		assert.equal(batch.aggregate.equalWeightAverageReturnPercent, 0.5);
		assert.equal(batch.aggregate.medianInstrumentReturnPercent, 0.5);
		assert.equal(batch.aggregate.equalWeightAverageBuyAndHoldReturnPercent, 1.5);
		assert.equal(batch.aggregate.equalWeightAverageExcessReturnPercent, -1);
		assert.equal(batch.aggregate.profitableInstrumentCount, 1);
		assert.equal(batch.aggregate.beatBuyAndHoldCount, 1);
		assert.deepEqual(batch.aggregate.bestInstrument, {
			displaySymbol: "SPY",
			totalReturnPercent: 2,
		});
		assert.deepEqual(batch.aggregate.worstInstrument, {
			displaySymbol: "QQQ",
			totalReturnPercent: -1,
		});
		assert.match(batch.warnings.at(-1)!, /smoke test/);
	});

	it("diagnoses setup, regime, exit, holding-period, and friction groups", () => {
		const spy = report("SPY", 2, 5, [
			trade("SPY", 1_000, 1, {
				barsHeld: 4,
				exitFills: [
					{
						reason: "target_1",
						filledAt: "2026-01-03T00:00:00.000Z",
						price: 105,
						positionFraction: 0.5,
					},
				],
			}),
		]);
		const qqq = report("QQQ", -1, -2, [
			trade("QQQ", -500, -0.5, {
				setupType: "breakout",
				trendRegime: "mixed",
				volatilityRegime: "high",
				exitReason: "maximum_holding_period",
				barsHeld: 12,
			}),
		]);
		const configured = summarizeDailySwingBacktests("Test ETFs", [spy, qqq]);
		const diagnostics = buildDailySwingBatchDiagnostics(
			configured.reports,
			[
				{
					scenario: "configured",
					transactionCostBpsPerSide: 2,
					slippageBpsPerFill: 3,
					report: configured,
				},
			],
		);

		assert.equal(
			diagnostics.bySetupType.find((group) => group.key === "pullback")
				?.metrics.tradeCount,
			1,
		);
		assert.equal(
			diagnostics.bySetupType.find((group) => group.key === "breakout")
				?.metrics.averageRMultiple,
			-0.5,
		);
		assert.equal(
			diagnostics.byCombinedRegime.find(
				(group) => group.key === "mixed:high",
			)?.metrics.tradeCount,
			1,
		);
		assert.equal(
			diagnostics.byExitReason.find(
				(group) => group.key === "maximum_holding_period",
			)?.metrics.tradeCount,
			1,
		);
		assert.equal(
			diagnostics.byHoldingPeriod.find((group) => group.key === "11-20")
				?.metrics.tradeCount,
			1,
		);
		assert.equal(
			diagnostics.byHoldingPeriod.find((group) => group.key === "1-5")
				?.metrics.targetOneReachRatePercent,
			100,
		);
		assert.equal(diagnostics.frictionSensitivity[0].scenario, "configured");
		assert.match(diagnostics.warnings.at(-1)!, /No short trades/);
	});
});
