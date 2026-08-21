import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	BROAD_DEVELOPMENT_V2_EXPANSION_NAME,
	BROAD_DEVELOPMENT_V2_EXPANSION_SOURCE_SHA256,
	BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS,
} from "@/lib/analysis/broad-development-v2-universe";
import { scanDailySwingSetupBatch, scanDailySwingSetups } from "@/lib/analysis/setup-scan";
import type { DailySwingAnalysisInput } from "@/lib/analysis/technical-analysis";
import type {
	TechnicalAnalysisReadyResult,
	TradePlan,
} from "@/lib/analysis/technical-analysis.types";
import type { MarketBar, MarketBars } from "@/lib/market-data/types";

const DAY_MS = 86_400_000;
const SIGNAL_AT = new Date("2025-01-01T00:00:00.000Z");

function tradePlan(): TradePlan {
	return {
		direction: "long",
		status: "active",
		entry: { type: "breakout", low: "100", high: "101", trigger: "test" },
		stopLoss: { price: "95", reason: "test" },
		targets: [
			{ price: "105", rewardRisk: 1, reason: "test" },
			{ price: "110", rewardRisk: 2, reason: "test" },
		],
		riskReward: 2,
		invalidation: "test",
		expiresAfterCompletedBars: 3,
		expiresAt: null,
	};
}

function bars(): MarketBar[] {
	const firstAt = SIGNAL_AT.getTime() - 299 * DAY_MS;
	return Array.from({ length: 304 }, (_, index) => {
		const startedAt = new Date(firstAt + index * DAY_MS);
		if (index === 300 || index === 302) {
			return {
				startedAt,
				open: "100",
				high: "101",
				low: "99",
				close: "100",
				volume: "1000000",
			};
		}
		if (index === 301 || index === 303) {
			return {
				startedAt,
				open: "105",
				high: "111",
				low: "104",
				close: "110",
				volume: "1000000",
			};
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

function marketData(sourceBars: MarketBar[]): MarketBars {
	return {
		instrumentId: "instrument-test",
		provider: "fixture",
		providerSymbol: "TEST",
		currency: "USD",
		interval: "1d",
		from: sourceBars[0].startedAt,
		to: sourceBars.at(-1)!.startedAt,
		adjusted: true,
		timeliness: "historical",
		bars: sourceBars,
	};
}

function expansionScanInput(symbol: string) {
	const startsLate = symbol === "GDXJ" || symbol === "OIH";
	const firstAt = new Date(
		startsLate ? "2016-05-02T04:00:00.000Z" : "2016-01-04T05:00:00.000Z",
	).getTime();
	const sourceBars = Array.from({ length: 2_500 }, (_, index) => ({
		startedAt: new Date(firstAt + index * DAY_MS),
		open: "100",
		high: "101",
		low: "99",
		close: "100",
		volume: "1000000",
	}));
	const instrumentId = `backtest:us-etf:${symbol.toLowerCase()}`;
	const benchmarkBars: MarketBars = {
		instrumentId: "backtest:benchmark:spy",
		provider: "alpaca",
		providerSymbol: "SPY",
		currency: "USD",
		interval: "1d",
		from: new Date("2016-01-01T00:00:00.000Z"),
		to: new Date("2026-08-18T23:59:59.999Z"),
		adjusted: true,
		timeliness: "historical",
		bars: sourceBars,
	};
	return {
		instrument: {
			instrumentId,
			displaySymbol: symbol,
			assetClass: "equity" as const,
			securityType: "etf" as const,
			etfProfile: "standard" as const,
			currency: "USD",
			pricePrecision: 2,
		},
		marketData: {
			...benchmarkBars,
			instrumentId,
			providerSymbol: symbol,
		},
		benchmarkData: benchmarkBars,
		startAt: sourceBars.at(-1)!.startedAt,
	};
}

function readyResult(
	input: DailySwingAnalysisInput,
	plan: TradePlan | null,
) {
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
			sma20: "99",
			sma50: "98",
			sma200: "90",
			sma20SlopePercent: 0.5,
			sma50SlopePercent: 0.3,
			rsi14: 58,
			macd: "1",
			macdSignal: "0.8",
			macdHistogram: "0.2",
			atr14: "2",
			atrPercent: 2,
			return5Percent: 1,
			return20Percent: 4,
			return60Percent: 8,
			realizedVolatility20Percent: 18,
			realizedVolatility60Percent: 16,
			volatilityPercentile: 55,
			volumeZScore20: 1.5,
			relativeStrength20Percent: 2,
			relativeStrength60Percent: 3,
		},
		assessments: {
			trend: { state: "bullish", evidence: [], counterEvidence: [] },
			momentum: { state: "bullish", evidence: [], counterEvidence: [] },
			volatility: { state: "normal", evidence: [], counterEvidence: [] },
			participation: { state: "strong", evidence: [], counterEvidence: [] },
		},
		marketStructure: { support: [], resistance: [] },
		signal: {
			action: plan ? "long_setup" : "no_trade",
			status: plan ? "active" : "none",
			evidenceStrength: "strong",
			reasons: [],
			counterEvidence: [],
		},
		tradePlan: plan,
	} satisfies TechnicalAnalysisReadyResult;
}

describe("exhaustive daily swing setup scan", () => {
	it("records a new signal while the previous signal's trade is still open", () => {
		const sourceBars = bars();
		let calls = 0;
		const input = {
			instrument: {
				instrumentId: "instrument-test",
				displaySymbol: "TEST",
				assetClass: "equity" as const,
				securityType: "etf" as const,
				etfProfile: "standard" as const,
				currency: "USD",
				pricePrecision: 2,
			},
			marketData: marketData(sourceBars),
			configuration: {
				transactionCostBpsPerSide: 0,
				slippageBpsPerFill: 0,
			},
		};
		const report = scanDailySwingSetups(input, {
			analyze: (analysisInput) => {
				calls += 1;
				assert.equal(
					analysisInput.marketData.bars.at(-1)!.startedAt.toISOString(),
					analysisInput.completedThrough.toISOString(),
				);
				return readyResult(analysisInput, calls <= 2 ? tradePlan() : null);
			},
		});

		assert.equal(report.signalCounts.analyses, 5);
		assert.equal(report.signalCounts.longSetups, 2);
		assert.equal(report.signalCounts.triggered, 2);
		assert.equal(report.trades.length, 2);
		assert.equal(report.trades[0].signalAt, sourceBars[299].startedAt.toISOString());
		assert.equal(report.trades[0].entryAt, sourceBars[300].startedAt.toISOString());
		assert.equal(report.trades[0].exitAt, sourceBars[301].startedAt.toISOString());
		assert.equal(report.trades[1].signalAt, sourceBars[300].startedAt.toISOString());
		assert.equal(report.trades[1].entryAt, sourceBars[302].startedAt.toISOString());
		assert.equal(report.trades[1].signalFeatures?.rsi14, 58);
		assert.equal(report.objectiveFeatures.length, 2);
		assert.equal(report.eligibility.liquidityRejected, 0);
		assert.equal(
			report.objectiveFeatures[0].snapshot.signalAt,
			sourceBars[299].startedAt.toISOString(),
		);
	});

	it("enforces the broad-development liquidity policy before outcome simulation", () => {
		const sourceBars = bars().map((bar) => ({ ...bar, volume: "1" }));
		const input = {
			instrument: {
				instrumentId: "instrument-test",
				displaySymbol: "TEST",
				assetClass: "equity" as const,
				securityType: "etf" as const,
				currency: "USD",
				pricePrecision: 2,
			},
			marketData: marketData(sourceBars),
		};
		const report = scanDailySwingSetups(
			input,
			{ analyze: (analysisInput) => readyResult(analysisInput, tradePlan()) },
			"broad_development_v1",
		);

		assert.equal(report.eligibility.setupsEvaluated, 5);
		assert.equal(report.eligibility.liquidityRejected, 5);
		assert.equal(report.signalCounts.longSetups, 0);
		assert.equal(report.trades.length, 0);
		assert.equal(report.untriggeredSetups.length, 0);
		assert.equal(report.objectiveFeatures.length, 5);
	});

	it("records exhaustive independent-label provenance in batch output", () => {
		const sourceBars = bars();
		const report = scanDailySwingSetupBatch({
			universeName: "test universe",
			generatedAt: new Date("2026-08-19T00:00:00.000Z"),
			instruments: [
				{
					instrument: {
						instrumentId: "instrument-test",
						displaySymbol: "TEST",
						assetClass: "equity",
						securityType: "etf",
						etfProfile: "standard",
						currency: "USD",
						pricePrecision: 2,
					},
					marketData: marketData(sourceBars),
				},
			],
			dependencies: { analyze: (input) => readyResult(input, null) },
		});

		assert.equal(report.scanVersion, "2.0.0");
		assert.equal(report.methodology.evaluationPolicy, "every_eligible_completed_bar");
		assert.equal(report.methodology.labelPolicy, "independent_fixed_equity_simulation");
		assert.equal(report.aggregate.analyses, 5);
		assert.equal(report.aggregate.liquidityRejected, 0);
	});

	it("enforces the frozen v2 expansion source and coverage exclusions", () => {
		const instruments = BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS.map((symbol) =>
			expansionScanInput(symbol),
		);
		assert.throws(
			() =>
				scanDailySwingSetupBatch({
					universeName: BROAD_DEVELOPMENT_V2_EXPANSION_NAME,
					instruments,
					researchPolicy: "broad_development_v2_expansion",
					sourceSha256: "0".repeat(64),
				}),
			/exact frozen source SHA-256/,
		);

		const report = scanDailySwingSetupBatch({
			universeName: BROAD_DEVELOPMENT_V2_EXPANSION_NAME,
			instruments,
			researchPolicy: "broad_development_v2_expansion",
			sourceSha256: BROAD_DEVELOPMENT_V2_EXPANSION_SOURCE_SHA256,
			dependencies: {
				analyze: (input) => readyResult(input, null),
			},
		});

		assert.equal(report.sourceSha256, BROAD_DEVELOPMENT_V2_EXPANSION_SOURCE_SHA256);
		assert.equal(report.aggregate.candidatesReceived, 30);
		assert.equal(report.aggregate.instrumentsScanned, 28);
		assert.equal(report.aggregate.coverageExcluded, 2);
		assert.deepEqual(
			report.reports.map((item) => item.instrument.displaySymbol),
			BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS.filter(
				(symbol) => symbol !== "GDXJ" && symbol !== "OIH",
			),
		);
		assert.equal(
			report.methodology.researchPolicy,
			"broad_development_v2_expansion",
		);
	});
});
