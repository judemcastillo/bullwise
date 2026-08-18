import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	annualizedRealizedVolatility,
	averageTrueRangeSeries,
	exponentialMovingAverageSeries,
	relativeStrengthIndexSeries,
	simpleMovingAverage,
	type NumericBar,
} from "@/lib/analysis/indicators";
import { deriveMarketStructure } from "@/lib/analysis/market-structure";
import { analyzeDailySwing } from "@/lib/analysis/technical-analysis";
import type { TradePlan } from "@/lib/analysis/technical-analysis.types";
import type { MarketBar, MarketBars } from "@/lib/market-data/types";
import type { EquitySecurityType } from "@/types/instruments";

const DAY_MS = 24 * 60 * 60 * 1000;
const LAST_SESSION = new Date("2026-08-14T00:00:00.000Z");

type FixtureOptions = {
	count?: number;
	direction?: "up" | "down" | "sideways";
	volatility?: number;
	volume?: boolean;
	endAt?: Date;
};

function fixtureBars(options: FixtureOptions = {}): MarketBar[] {
	const count = options.count ?? 330;
	const direction = options.direction ?? "up";
	const volatility = options.volatility ?? 1.5;
	const endAt = options.endAt ?? LAST_SESSION;
	const start = endAt.getTime() - (count - 1) * DAY_MS;
	let previousClose = direction === "down" ? 180 : 50;
	return Array.from({ length: count }, (_, index) => {
		const trend =
			direction === "up" ? index * 0.3 : direction === "down" ? -index * 0.3 : 0;
		const center = (direction === "down" ? 180 : 50) + trend;
		const wave = Math.sin((index * Math.PI) / 5) * volatility;
		const close = Math.max(5, center + wave);
		const open = previousClose;
		const high = Math.max(open, close) + 0.8;
		const low = Math.min(open, close) - 0.8;
		previousClose = close;
		return {
			startedAt: new Date(start + index * DAY_MS),
			open: open.toFixed(4),
			high: high.toFixed(4),
			low: low.toFixed(4),
			close: close.toFixed(4),
			...(options.volume === false
				? {}
				: { volume: String(1_000_000 + index * 1_000 + (index % 7) * 20_000) }),
		};
	});
}

function marketBars(
	bars: MarketBar[],
	overrides: Partial<MarketBars> = {},
): MarketBars {
	return {
		instrumentId: "instrument-aapl",
		provider: "massive",
		providerSymbol: "AAPL",
		currency: "USD",
		interval: "1d",
		from: bars[0]?.startedAt ?? LAST_SESSION,
		to: bars.at(-1)?.startedAt ?? LAST_SESSION,
		adjusted: true,
		timeliness: "historical",
		bars,
		...overrides,
	};
}

function analyze(
	data: MarketBars,
	options: {
		securityType?: EquitySecurityType;
		benchmarkData?: MarketBars;
		completedThrough?: Date;
		allowShortSetups?: boolean;
	} = {},
) {
	return analyzeDailySwing({
		instrument: {
			instrumentId: "instrument-aapl",
			displaySymbol: "AAPL",
			assetClass: "equity",
			securityType: options.securityType ?? "common_stock",
			currency: "USD",
			pricePrecision: 2,
		},
		marketData: data,
		benchmarkData: options.benchmarkData,
		completedThrough: options.completedThrough ?? LAST_SESSION,
		analyzedAt: new Date("2026-08-15T12:00:00.000Z"),
		allowShortSetups: options.allowShortSetups,
	});
}

describe("technical indicators", () => {
	it("calculates moving averages with conventional seeds", () => {
		assert.equal(simpleMovingAverage([1, 2, 3, 4], 3), 3);
		assert.deepEqual(exponentialMovingAverageSeries([1, 2, 3, 4], 3), [
			null,
			null,
			2,
			3,
		]);
	});

	it("handles one-directional and flat RSI inputs", () => {
		assert.equal(relativeStrengthIndexSeries([1, 2, 3, 4, 5, 6], 3).at(-1), 100);
		assert.equal(relativeStrengthIndexSeries([4, 4, 4, 4, 4], 3).at(-1), 50);
		assert.equal(relativeStrengthIndexSeries([6, 5, 4, 3, 2, 1], 3).at(-1), 0);
	});

	it("calculates Wilder ATR and zero volatility for constant returns", () => {
		const bars: NumericBar[] = Array.from({ length: 5 }, (_, index) => ({
			startedAt: new Date(index),
			open: 10,
			high: 11,
			low: 9,
			close: 10,
		}));
		assert.equal(averageTrueRangeSeries(bars, 3).at(-1), 2);
		const geometric = Array.from({ length: 22 }, (_, index) => 100 * 1.01 ** index);
		assert.ok((annualizedRealizedVolatility(geometric, 20) ?? 1) < 1e-10);
	});
});

describe("market structure", () => {
	it("returns clustered levels on the correct side of the latest price", () => {
		const numeric = fixtureBars({ direction: "sideways" }).map((bar) => ({
			startedAt: bar.startedAt,
			open: Number(bar.open),
			high: Number(bar.high),
			low: Number(bar.low),
			close: Number(bar.close),
			volume: Number(bar.volume),
		}));
		const structure = deriveMarketStructure(numeric, 2, 2);
		const close = numeric.at(-1)!.close;
		assert.ok(structure.support.length > 0);
		assert.ok(structure.resistance.length > 0);
		assert.ok(structure.support.every((level) => Number(level.price) < close));
		assert.ok(structure.resistance.every((level) => Number(level.price) > close));
		assert.ok(structure.support.length <= 3);
		assert.ok(structure.resistance.length <= 3);
	});
});

describe("daily swing analysis", () => {
	it("rejects ineligible securities and unadjusted data", () => {
		const bars = fixtureBars();
		const ineligible = analyze(marketBars(bars), { securityType: "warrant" });
		assert.equal(ineligible.status, "unavailable");
		if (ineligible.status === "unavailable") {
			assert.equal(ineligible.reason, "ineligible_instrument");
		}

		const unadjusted = analyze(marketBars(bars, { adjusted: false }));
		assert.equal(unadjusted.status, "unavailable");
		if (unadjusted.status === "unavailable") {
			assert.equal(unadjusted.reason, "unadjusted_data");
		}
	});

	it("requires ETFs to be explicitly classified as standard products", () => {
		const data = marketBars(fixtureBars());
		const unknownProfile = analyzeDailySwing({
			instrument: {
				instrumentId: "instrument-aapl",
				displaySymbol: "SPY",
				assetClass: "equity",
				securityType: "etf",
				etfProfile: "unknown",
				currency: "USD",
				pricePrecision: 2,
			},
			marketData: data,
			completedThrough: LAST_SESSION,
			analyzedAt: new Date("2026-08-15T12:00:00.000Z"),
		});
		assert.equal(unknownProfile.status, "unavailable");

		const standardProfile = analyzeDailySwing({
			instrument: {
				instrumentId: "instrument-aapl",
				displaySymbol: "SPY",
				assetClass: "equity",
				securityType: "etf",
				etfProfile: "standard",
				currency: "USD",
				pricePrecision: 2,
			},
			marketData: data,
			completedThrough: LAST_SESSION,
			analyzedAt: new Date("2026-08-15T12:00:00.000Z"),
		});
		assert.equal(standardProfile.status, "ready");
	});

	it("reports insufficient, stale, and duplicate data precisely", () => {
		const insufficient = analyze(marketBars(fixtureBars({ count: 299 })));
		assert.equal(insufficient.status, "unavailable");
		if (insufficient.status === "unavailable") {
			assert.equal(insufficient.reason, "insufficient_data");
		}

		const staleBars = fixtureBars({ endAt: new Date("2026-07-01T00:00:00.000Z") });
		const stale = analyze(marketBars(staleBars));
		assert.equal(stale.status, "unavailable");
		if (stale.status === "unavailable") assert.equal(stale.reason, "stale_data");

		const duplicatedBars = fixtureBars();
		duplicatedBars.push({ ...duplicatedBars.at(-1)! });
		const duplicate = analyze(marketBars(duplicatedBars));
		assert.equal(duplicate.status, "unavailable");
		if (duplicate.status === "unavailable") {
			assert.equal(duplicate.reason, "invalid_data");
		}
	});

	it("excludes unfinished bars and preserves complete data provenance", () => {
		const completed = fixtureBars();
		const futureBar: MarketBar = {
			...completed.at(-1)!,
			startedAt: new Date(LAST_SESSION.getTime() + DAY_MS),
		};
		const result = analyze(marketBars([...completed, futureBar]));
		assert.equal(result.status, "ready");
		assert.equal(result.dataQuality.barsReceived, 331);
		assert.equal(result.dataQuality.barsUsed, 330);
		assert.equal(result.dataQuality.barsExcluded, 1);
		assert.equal(result.dataQuality.lastBarAt, LAST_SESSION.toISOString());
	});

	it("returns a complete long-biased analysis with benchmark-relative features", () => {
		const instrument = marketBars(fixtureBars({ direction: "up" }));
		const benchmark = marketBars(fixtureBars({ direction: "sideways" }), {
			instrumentId: "benchmark-spy",
			providerSymbol: "SPY",
		});
		const result = analyze(instrument, { benchmarkData: benchmark });
		assert.equal(result.status, "ready");
		if (result.status !== "ready") return;
		assert.equal(result.assessments.trend.state, "bullish");
		assert.ok(result.indicators.relativeStrength20Percent !== null);
		assert.ok(result.indicators.relativeStrength20Percent > 0);
		assert.ok(result.marketStructure.support.length > 0);
		assert.equal(result.signal.action, "long_setup");
		assert.ok(result.tradePlan);
		assertTradePlanInvariants(result.tradePlan!);
	});

	it("does not emit a short setup unless short analysis is explicitly enabled", () => {
		const data = marketBars(fixtureBars({ direction: "down" }));
		const disabled = analyze(data);
		assert.equal(disabled.status, "ready");
		if (disabled.status === "ready") {
			assert.equal(disabled.assessments.trend.state, "bearish");
			assert.equal(disabled.signal.action, "no_trade");
		}

		const enabled = analyze(data, { allowShortSetups: true });
		assert.equal(enabled.status, "ready");
		if (enabled.status !== "ready") return;
		assert.equal(enabled.signal.action, "short_setup");
		assert.equal(enabled.tradePlan?.direction, "short");
		assertTradePlanInvariants(enabled.tradePlan!);
	});

	it("returns no trade when trend evidence is mixed", () => {
		const result = analyze(marketBars(fixtureBars({ direction: "sideways" })));
		assert.equal(result.status, "ready");
		if (result.status !== "ready") return;
		assert.equal(result.assessments.trend.state, "mixed");
		assert.equal(result.signal.action, "no_trade");
		assert.equal(result.tradePlan, null);
	});
});

function assertTradePlanInvariants(plan: TradePlan) {
	const entryLow = Number(plan.entry.low);
	const entryHigh = Number(plan.entry.high);
	const stop = Number(plan.stopLoss.price);
	assert.ok(entryLow <= entryHigh);
	assert.equal(plan.targets.length, 2);
	assert.equal(plan.expiresAfterCompletedBars, 10);
	assert.equal(plan.expiresAt, null);
	assert.ok(plan.riskReward >= 1.5);
	assert.ok(plan.targets.every((target) => target.rewardRisk > 0));
	if (plan.direction === "long") {
		assert.ok(stop < entryLow);
		assert.ok(plan.targets.every((target) => Number(target.price) > entryHigh));
	} else {
		assert.ok(stop > entryHigh);
		assert.ok(plan.targets.every((target) => Number(target.price) < entryLow));
	}
}
