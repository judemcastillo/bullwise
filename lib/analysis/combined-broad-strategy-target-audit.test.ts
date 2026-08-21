import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL } from "@/lib/analysis/combined-broad-strategy-target-audit";

describe("combined broad strategy and target audit protocol", () => {
	it("freezes the rejected diagnostic and non-overlapping train population", () => {
		const protocol =
			DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL;
		assert.equal(
			protocol.sources.trainDiagnosticReport.sha256,
			"c3afd8fffa6c1f02e26902cfaffdfdec8b12965c8ba7d3990aeca59c5faa67ae",
		);
		assert.equal(
			protocol.sources.trainDiagnosticReport.decision,
			"revisit_strategy_target_or_signal_time_features",
		);
		assert.deepEqual(protocol.dataAccess.partitions, [
			"evaluate_2020_evaluation",
			"evaluate_2021_evaluation",
			"evaluate_2022_evaluation",
		]);
		assert.equal(protocol.dataAccess.expectedRows, 2_696);
		assert.equal(protocol.dataAccess.fitPartitionsUsed, false);
	});

	it("keeps nominations exploratory and every sealed split closed", () => {
		const protocol =
			DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL;
		assert.equal(
			protocol.strategyCandidateNomination.eligibleInteraction,
			"direction_x_setup_type",
		);
		assert.equal(
			protocol.strategyCandidateNomination.authorizesStrategyChange,
			false,
		);
		assert.equal(
			protocol.strategyCandidateNomination.authorizesModelFitting,
			false,
		);
		assert.equal(
			protocol.strategyCandidateNomination.authorizesValidationAccess,
			false,
		);
		assert.equal(protocol.dataAccess.validationFeaturesRead, false);
		assert.equal(protocol.dataAccess.validationLabelsRead, false);
		assert.equal(protocol.dataAccess.testFeaturesRead, false);
		assert.equal(protocol.dataAccess.testLabelsRead, false);
		assert.equal(protocol.cohortAudit.instrumentLevelOutput, false);
		assert.equal(protocol.output.overwrite, false);
	});

	it("prevents post-hoc strategy and target tuning", () => {
		const prohibitions =
			DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL.prohibitions.join(
				" ",
			);
		assert.match(prohibitions, /Do not search thresholds/);
		assert.match(prohibitions, /Do not alter entry/);
		assert.match(prohibitions, /Do not rank or report instruments/);
		assert.match(prohibitions, /Do not claim profitability/);
		assert.match(prohibitions, /Do not open validation or test/);
	});
});
