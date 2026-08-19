import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	BROAD_DEVELOPMENT_V2_EXPANSION_CANDIDATES,
	BROAD_DEVELOPMENT_V2_EXPANSION_CATEGORIES,
	BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY,
	BROAD_DEVELOPMENT_V2_EXPANSION_INCEPTION_CUTOFF,
	BROAD_DEVELOPMENT_V2_EXPANSION_LIQUIDITY_POLICY,
	BROAD_DEVELOPMENT_V2_EXPANSION_SELECTION_POLICY,
	BROAD_DEVELOPMENT_V2_EXPANSION_SOURCE_SHA256,
	BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS,
	BROAD_DEVELOPMENT_V2_PRIOR_RESEARCH_SYMBOLS,
	evaluateBroadDevelopmentV2ExpansionCoverage,
} from "@/lib/analysis/broad-development-v2-universe";
import {
	BROAD_DEVELOPMENT_DATA_POLICY,
	BROAD_DEVELOPMENT_LIQUIDITY_POLICY,
} from "@/lib/analysis/broad-development-universe";

describe("frozen broad development v2 expansion", () => {
	it("contains 30 unique pre-2016 ETF candidates across four categories", () => {
		assert.equal(BROAD_DEVELOPMENT_V2_EXPANSION_CATEGORIES.length, 4);
		assert.equal(BROAD_DEVELOPMENT_V2_EXPANSION_CANDIDATES.length, 30);
		assert.equal(BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS.length, 30);
		assert.equal(new Set(BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS).size, 30);
		assert.ok(
			BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS.every((symbol) =>
				/^[A-Z][A-Z0-9.-]{0,14}$/.test(symbol),
			),
		);
		assert.ok(
			BROAD_DEVELOPMENT_V2_EXPANSION_CATEGORIES.every(
				(category) =>
					category.candidates.length >=
					BROAD_DEVELOPMENT_V2_EXPANSION_SELECTION_POLICY.minimumCandidatesPerCategory,
			),
		);
		const cutoff = Date.parse(
			`${BROAD_DEVELOPMENT_V2_EXPANSION_INCEPTION_CUTOFF}T23:59:59.999Z`,
		);
		assert.ok(
			BROAD_DEVELOPMENT_V2_EXPANSION_CANDIDATES.every(
				(candidate) =>
					/^\d{4}-\d{2}-\d{2}$/.test(candidate.inceptionDate) &&
					Date.parse(`${candidate.inceptionDate}T00:00:00.000Z`) <= cutoff,
			),
		);
	});

	it("does not reuse a prior research candidate or the SPY benchmark", () => {
		const prior = new Set<string>(BROAD_DEVELOPMENT_V2_PRIOR_RESEARCH_SYMBOLS);
		assert.equal(prior.size, BROAD_DEVELOPMENT_V2_PRIOR_RESEARCH_SYMBOLS.length);
		assert.deepEqual(
			BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS.filter((symbol) =>
				prior.has(symbol),
			),
			[],
		);
		assert.ok(
			!(BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS as readonly string[]).includes(
				BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.benchmarkSymbol,
			),
		);
	});

	it("freezes outcome-blind selection and the unchanged data rules", () => {
		assert.match(BROAD_DEVELOPMENT_V2_EXPANSION_SOURCE_SHA256, /^[a-f0-9]{64}$/);
		assert.equal(
			BROAD_DEVELOPMENT_V2_EXPANSION_SELECTION_POLICY.strategyOutcomesUsedForSelection,
			false,
		);
		assert.equal(
			BROAD_DEVELOPMENT_V2_EXPANSION_SELECTION_POLICY.returnsUsedForSelection,
			false,
		);
		assert.equal(
			BROAD_DEVELOPMENT_V2_EXPANSION_SELECTION_POLICY.coarsePresentDayLiquidityScreenUsed,
			true,
		);
		assert.equal(
			BROAD_DEVELOPMENT_V2_EXPANSION_SELECTION_POLICY.historicalLiquidityUsedForSelection,
			false,
		);
		assert.equal(
			BROAD_DEVELOPMENT_V2_EXPANSION_SELECTION_POLICY.additionalTrainingEpisodesRequired,
			380,
		);
		assert.equal(
			BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.provider,
			BROAD_DEVELOPMENT_DATA_POLICY.provider,
		);
		assert.equal(
			BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.requestedFrom,
			BROAD_DEVELOPMENT_DATA_POLICY.requestedFrom,
		);
		assert.equal(
			BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.requestedThrough,
			BROAD_DEVELOPMENT_DATA_POLICY.requestedThrough,
		);
		assert.equal(
			BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.minimumBarsPerInstrument,
			2_500,
		);
		assert.equal(
			BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.minimumCoverageEligibleInstruments,
			24,
		);
		assert.strictEqual(
			BROAD_DEVELOPMENT_V2_EXPANSION_LIQUIDITY_POLICY,
			BROAD_DEVELOPMENT_LIQUIDITY_POLICY,
		);
	});

	it("applies the frozen expansion coverage gate without setup outcomes", () => {
		const startedAt = new Date("2016-01-04T00:00:00.000Z");
		const bars = Array.from(
			{
				length:
					BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.minimumBarsPerInstrument,
			},
			(_, index) => ({
				startedAt: new Date(startedAt.getTime() + index * 86_400_000),
				open: "100",
				high: "101",
				low: "99",
				close: "100",
			}),
		);
		assert.equal(
			evaluateBroadDevelopmentV2ExpansionCoverage({
				symbol: "VGT",
				marketData: { bars },
			}).eligible,
			true,
		);
		const excluded = evaluateBroadDevelopmentV2ExpansionCoverage({
			symbol: "SPY",
			marketData: { bars: bars.slice(0, 2_000) },
		});
		assert.equal(excluded.eligible, false);
		assert.deepEqual(excluded.reasons, [
			"symbol_not_in_frozen_expansion",
			"insufficient_bars",
		]);
	});
});
