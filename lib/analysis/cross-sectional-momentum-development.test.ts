import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BROAD_DEVELOPMENT_CATEGORIES } from "@/lib/analysis/broad-development-universe";
import { BROAD_DEVELOPMENT_V2_EXPANSION_CATEGORIES } from "@/lib/analysis/broad-development-v2-universe";
import { ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_PROTOCOL } from "@/lib/analysis/cross-sectional-momentum-development";

describe("ETF cross-sectional momentum development protocol", () => {
	it("freezes four exhaustive outcome-blind sleeves", () => {
		const protocol = ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_PROTOCOL;
		assert.equal(protocol.universe.expectedEligibleInstruments, 127);
		assert.equal(protocol.universe.sleeves.length, 4);
		assert.ok(
			protocol.universe.sleeves.every((sleeve) => sleeve.targetWeight === 0.2475),
		);
		const sourceCategories = protocol.universe.sleeves.flatMap(
			(sleeve) => sleeve.sourceCategories,
		);
		assert.equal(sourceCategories.length, 10);
		assert.equal(new Set(sourceCategories).size, sourceCategories.length);
		const manifestCategories = [
			...BROAD_DEVELOPMENT_CATEGORIES.map(
				(category) => `base:${category.name}`,
			),
			...BROAD_DEVELOPMENT_V2_EXPANSION_CATEGORIES.map(
				(category) => `expansion:${category.name}`,
			),
		];
		assert.deepEqual([...sourceCategories].sort(), manifestCategories.sort());
		assert.equal(protocol.universe.selectionUsesPriorStrategyOutcomes, false);
	});

	it("freezes one canonical long-cash monthly momentum rule", () => {
		const protocol = ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_PROTOCOL;
		assert.equal(protocol.signal.formation.lookbackSessions, 252);
		assert.equal(protocol.signal.formation.skipRecentSessions, 21);
		assert.equal(protocol.signal.formation.minimumObservedSessions, 253);
		assert.equal(protocol.signal.selectionPerSleeve, 1);
		assert.equal(protocol.signal.tieBreaker, "display_symbol_ascending");
		assert.equal(protocol.signal.liquidityEligibility.windowSessions, 20);
		assert.equal(
			protocol.signal.liquidityEligibility.minimumMedianDollarVolume,
			10_000_000,
		);
		assert.equal(
			protocol.signal.liquidityEligibility
				.maximumTargetPositionFractionOfMedianDollarVolume,
			0.01,
		);
		assert.equal(protocol.portfolio.positioning, "long_or_cash");
		assert.equal(protocol.portfolio.shortsAllowed, false);
		assert.equal(protocol.portfolio.leverageAllowed, false);
		assert.equal(protocol.portfolio.maximumGrossExposure, 0.99);
		assert.equal(protocol.portfolio.operationalCashReserveWeight, 0.01);
		assert.equal(protocol.portfolio.maximumPositions, 4);
		assert.equal(protocol.costs.base.transactionCostBpsPerSide, 2);
		assert.equal(protocol.costs.base.slippageBpsPerFill, 3);
		assert.equal(protocol.costs.stress.transactionCostBpsPerSide, 4);
		assert.equal(protocol.costs.stress.slippageBpsPerFill, 6);
	});

	it("requires all fixed economic gates while sealed splits remain closed", () => {
		const protocol = ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_PROTOCOL;
		assert.equal(protocol.developmentGates.length, 13);
		assert.equal(
			new Set(protocol.developmentGates.map((gate) => gate.metric)).size,
			protocol.developmentGates.length,
		);
		assert.equal(protocol.evaluation.expectedMonthlyHoldingPeriods, 36);
		assert.equal(protocol.evaluation.instrumentLevelOutput, false);
		assert.equal(protocol.decisionPolicy.requiresEveryGate, true);
		assert.equal(protocol.decisionPolicy.authorizesValidationAccess, false);
		assert.equal(protocol.decisionPolicy.authorizesProductSignals, false);
		assert.equal(protocol.decisionPolicy.authorizesLiveTrading, false);
		assert.equal(protocol.dataAccess.validationFeaturesRead, false);
		assert.equal(protocol.dataAccess.validationLabelsRead, false);
		assert.equal(protocol.dataAccess.testFeaturesRead, false);
		assert.equal(protocol.dataAccess.testLabelsRead, false);
		assert.equal(protocol.output.overwrite, false);

		const prohibitions = protocol.prohibitions.join(" ");
		assert.match(prohibitions, /Do not calculate real momentum/);
		assert.match(prohibitions, /Do not add stops, targets, shorts, leverage/);
		assert.match(prohibitions, /Do not remove instruments/);
		assert.match(prohibitions, /Do not open validation or test/);
	});
});
