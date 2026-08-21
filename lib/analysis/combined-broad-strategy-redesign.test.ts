import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL } from "@/lib/analysis/combined-broad-strategy-redesign";

describe("combined broad strategy redesign protocol", () => {
	it("freezes the rejected audit and one benchmark-risk hypothesis", () => {
		const protocol = DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL;
		assert.equal(
			protocol.sources.rejectedStrategyAudit.sha256,
			"dc0b9d9c45352bc941f8402b2a17a9b764823f41a076b838806393676f659e27",
		);
		assert.equal(
			protocol.sources.rejectedStrategyAudit.decision,
			"redesign_strategy_mechanics",
		);
		assert.equal(protocol.candidate.candidateCount, 1);
		assert.equal(protocol.candidate.marketBenchmark, "SPY");
		assert.deepEqual(protocol.candidate.eligibility.conditions, [
			"spy_close_above_sma200",
			"spy_20_session_return_above_0",
		]);
		assert.equal(protocol.candidate.eligibility.missingBenchmarkPolicy, "reject_setup");
	});

	it("keeps mechanics fixed and evaluation train-only", () => {
		const protocol = DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL;
		assert.ok(protocol.candidate.unchangedMechanics.includes("stop_loss"));
		assert.ok(protocol.candidate.unchangedMechanics.includes("take_profit_targets"));
		assert.ok(
			protocol.candidate.unchangedMechanics.includes(
				"transaction_costs_and_slippage",
			),
		);
		assert.equal(protocol.evaluation.instrumentLevelOutput, false);
		assert.equal(protocol.dataAccess.validationFeaturesRead, false);
		assert.equal(protocol.dataAccess.validationLabelsRead, false);
		assert.equal(protocol.dataAccess.testFeaturesRead, false);
		assert.equal(protocol.dataAccess.testLabelsRead, false);
		assert.equal(protocol.decisionPolicy.authorizesValidationAccess, false);
		assert.equal(protocol.decisionPolicy.authorizesProductSignals, false);
		assert.equal(protocol.output.overwrite, false);
	});

	it("requires every fixed gate and forbids condition tuning", () => {
		const protocol = DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL;
		assert.equal(protocol.developmentGates.length, 9);
		assert.equal(
			new Set(protocol.developmentGates.map((gate) => gate.metric)).size,
			protocol.developmentGates.length,
		);
		assert.equal(protocol.decisionPolicy.requiresEveryGate, true);
		const prohibitions = protocol.prohibitions.join(" ");
		assert.match(prohibitions, /Do not test other benchmark averages/);
		assert.match(prohibitions, /Do not change entry/);
		assert.match(prohibitions, /Do not add short setups or an AI model/);
		assert.match(prohibitions, /Do not rank or report instruments/);
		assert.match(prohibitions, /Do not open validation or test/);
	});
});
