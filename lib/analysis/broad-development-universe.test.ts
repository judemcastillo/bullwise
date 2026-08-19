import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	BROAD_DEVELOPMENT_CATEGORIES,
	BROAD_DEVELOPMENT_DATA_POLICY,
	BROAD_DEVELOPMENT_LIQUIDITY_POLICY,
	BROAD_DEVELOPMENT_SYMBOLS,
	PREVIOUSLY_CONSUMED_RESEARCH_SYMBOLS,
} from "@/lib/analysis/broad-development-universe";

describe("frozen broad development universe", () => {
	it("contains 100 unique standard ETF candidates across six categories", () => {
		assert.equal(BROAD_DEVELOPMENT_CATEGORIES.length, 6);
		assert.equal(BROAD_DEVELOPMENT_SYMBOLS.length, 100);
		assert.equal(new Set(BROAD_DEVELOPMENT_SYMBOLS).size, 100);
		assert.ok(
			BROAD_DEVELOPMENT_SYMBOLS.every((symbol) =>
				/^[A-Z][A-Z0-9.-]{0,14}$/.test(symbol),
			),
		);
		assert.ok(
			BROAD_DEVELOPMENT_CATEGORIES.every(
				(category) => category.symbols.length >= 12,
			),
		);
	});

	it("does not reuse a prior research candidate or the SPY benchmark", () => {
		const consumed = new Set<string>(PREVIOUSLY_CONSUMED_RESEARCH_SYMBOLS);
		assert.equal(consumed.size, PREVIOUSLY_CONSUMED_RESEARCH_SYMBOLS.length);
		assert.deepEqual(
			BROAD_DEVELOPMENT_SYMBOLS.filter((symbol) => consumed.has(symbol)),
			[],
		);
	});

	it("freezes coverage and signal-time liquidity rules before retrieval", () => {
		assert.equal(BROAD_DEVELOPMENT_DATA_POLICY.provider, "alpaca");
		assert.equal(BROAD_DEVELOPMENT_DATA_POLICY.requestedFrom, "2016-01-01");
		assert.equal(BROAD_DEVELOPMENT_DATA_POLICY.requestedThrough, "2026-08-18");
		assert.equal(BROAD_DEVELOPMENT_DATA_POLICY.minimumBarsPerInstrument, 2_500);
		assert.equal(
			BROAD_DEVELOPMENT_DATA_POLICY.minimumCoverageEligibleInstruments,
			50,
		);
		assert.equal(BROAD_DEVELOPMENT_DATA_POLICY.targetTrainingEpisodes, 5_000);
		assert.equal(BROAD_DEVELOPMENT_LIQUIDITY_POLICY.windowSessions, 20);
		assert.equal(
			BROAD_DEVELOPMENT_LIQUIDITY_POLICY.minimumMedianDollarVolume,
			10_000_000,
		);
		assert.equal(
			BROAD_DEVELOPMENT_LIQUIDITY_POLICY.maximumPositionFractionOfMedianDollarVolume,
			0.01,
		);
	});
});
