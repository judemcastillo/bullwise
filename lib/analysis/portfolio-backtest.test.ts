import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runDailySwingPortfolioBacktest } from "@/lib/analysis/portfolio-backtest";
import type {
	BacktestTrade,
	DailySwingBacktestReport,
} from "@/lib/analysis/backtest.types";

function trade(
	instrumentId: string,
	entryAt: string,
	exitAt: string,
	marks: BacktestTrade["markToMarket"],
	signalQuality: Partial<BacktestTrade["signalQuality"]> = {},
): BacktestTrade {
	const netPnl = marks.at(-1)!.netPnl;
	return {
		instrumentId,
		direction: "long",
		setupType: "breakout",
		signalAt: new Date(new Date(entryAt).getTime() - 86_400_000).toISOString(),
		entryAt,
		entryPrice: 100,
		stopPrice: 98,
		targetPrices: [103, 104],
		exitAt,
		exitReason: "maximum_holding_period",
		exitFills: [
			{
				reason: "maximum_holding_period",
				filledAt: exitAt,
				price: 100.2,
				positionFraction: 1,
			},
		],
		barsHeld: marks.length,
		trendRegime: "bullish",
		volatilityRegime: "normal",
		signalQuality: {
			evidenceStrength: "moderate",
			relativeStrength20Percent: 1,
			volumeZScore20: 0,
			planRiskReward: 2,
			...signalQuality,
		},
		positionUnits: 500,
		riskCapital: 1_000,
		grossPnl: netPnl,
		transactionCosts: 0,
		netPnl,
		netReturnOnEquityPercent: netPnl / 1_000,
		rMultiple: netPnl / 1_000,
		maximumFavorableExcursionPercent: 1,
		maximumAdverseExcursionPercent: -1,
		markToMarket: marks,
	};
}

function mark(
	at: string,
	netPnl: number,
	remainingPositionFraction: number,
): BacktestTrade["markToMarket"][number] {
	return {
		at,
		markPrice: remainingPositionFraction > 0 ? 99.8 : 100.2,
		remainingPositionFraction,
		realizedGrossPnl: remainingPositionFraction > 0 ? 0 : netPnl,
		unrealizedGrossPnl: remainingPositionFraction > 0 ? netPnl : 0,
		transactionCosts: 0,
		netPnl,
	};
}

function report(symbol: string, trades: BacktestTrade[]) {
	return {
		backtestVersion: "1.2.0",
		instrument: {
			instrumentId: `instrument-${symbol.toLowerCase()}`,
			displaySymbol: symbol,
		},
		strategyVersion: "daily-swing-v1-draft",
		configuration: {
			transactionCostBpsPerSide: 2,
			slippageBpsPerFill: 3,
			maximumHoldingBars: 20,
			sameBarPolicy: "stop_first",
		},
		trades,
	} as unknown as DailySwingBacktestReport;
}

describe("shared-capital daily swing portfolio backtest", () => {
	it("enforces gross exposure and resizes later trades from current equity", () => {
		const firstEntry = "2025-01-02T00:00:00.000Z";
		const firstExit = "2025-01-03T00:00:00.000Z";
		const laterEntry = "2025-01-04T00:00:00.000Z";
		const laterExit = "2025-01-05T00:00:00.000Z";
		const firstMarks = [mark(firstEntry, -100, 1), mark(firstExit, 100, 0)];
		const laterMarks = [mark(laterEntry, 0, 1), mark(laterExit, 100, 0)];
		const result = runDailySwingPortfolioBacktest({
			universeName: "Test",
			reports: [
				report("AAA", [
					trade("instrument-aaa", firstEntry, firstExit, firstMarks),
				]),
				report("BBB", [
					trade("instrument-bbb", firstEntry, firstExit, firstMarks),
				]),
				report("CCC", [
					trade("instrument-ccc", laterEntry, laterExit, laterMarks),
				]),
			],
			configuration: { maximumGrossExposurePercent: 60 },
			generatedAt: new Date("2026-08-19T00:00:00.000Z"),
		});

		assert.equal(result.candidateTrades, 3);
		assert.deepEqual(
			result.acceptedTrades.map((item) => item.displaySymbol),
			["AAA", "CCC"],
		);
		assert.equal(result.rejections.maximumGrossExposure, 1);
		assert.equal(result.acceptedTrades[1].portfolioRiskCapital, 1_001);
		assert.equal(result.acceptedTrades[1].scaleFactor, 1.001);
		assert.equal(result.performance.endingEquity, 100_200.1);
		assert.equal(result.performance.maximumDrawdownPercent, 0.1);
	});

	it("keeps positions exiting today in the opening capacity calculation", () => {
		const firstEntry = "2025-01-02T00:00:00.000Z";
		const sharedExitAndEntry = "2025-01-03T00:00:00.000Z";
		const laterExit = "2025-01-04T00:00:00.000Z";
		const result = runDailySwingPortfolioBacktest({
			universeName: "Test",
			reports: [
				report("AAA", [
					trade("instrument-aaa", firstEntry, sharedExitAndEntry, [
						mark(firstEntry, 0, 1),
						mark(sharedExitAndEntry, 100, 0),
					]),
				]),
				report("BBB", [
					trade("instrument-bbb", sharedExitAndEntry, laterExit, [
						mark(sharedExitAndEntry, 0, 1),
						mark(laterExit, 100, 0),
					]),
				]),
			],
			configuration: {
				maximumOpenPositions: 1,
				maximumGrossExposurePercent: 200,
			},
		});

		assert.equal(result.acceptedTrades.length, 1);
		assert.equal(result.rejections.maximumOpenPositions, 1);
	});

	it("uses frozen v3 signal quality instead of symbol order for competing entries", () => {
		const entryAt = "2025-01-02T00:00:00.000Z";
		const exitAt = "2025-01-03T00:00:00.000Z";
		const marks = [mark(entryAt, 0, 1), mark(exitAt, 100, 0)];
		const result = runDailySwingPortfolioBacktest({
			universeName: "Test",
			reports: [
				report("AAA", [
					trade("instrument-aaa", entryAt, exitAt, marks, {
						relativeStrength20Percent: 1,
					}),
				]),
				report("BBB", [
					trade("instrument-bbb", entryAt, exitAt, marks, {
						relativeStrength20Percent: 5,
					}),
				]),
			],
			configuration: {
				candidateSelectionPolicy: "v3_signal_quality",
				maximumGrossExposurePercent: 60,
			},
		});

		assert.deepEqual(
			result.acceptedTrades.map((item) => item.displaySymbol),
			["BBB"],
		);
	});
});
