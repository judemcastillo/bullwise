import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DAILY_SWING_BROAD_WALK_FORWARD_FOLDS } from "@/lib/analysis/broad-dataset.types";
import {
	DAILY_SWING_COMBINED_BROAD_EPISODE_SHA256,
	DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL,
} from "@/lib/analysis/combined-broad-model-development";

describe("combined broad model development protocol", () => {
	it("freezes the exact train artifact and three chronological folds", () => {
		assert.equal(
			DAILY_SWING_COMBINED_BROAD_EPISODE_SHA256,
			"0233cf9961e916e3079694ce0c887ba7f38ca4b5870271e9e769b563abea2a6b",
		);
		assert.equal(DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.trainingDataset.rows, 5_504);
		assert.equal(
			DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.foldDataset.sha256,
			"6bc63cb4559b2334708110fcd15719eb52d7f0bb9100b8f0032e4e42a1e0f9c9",
		);
		assert.equal(
			DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.foldDataset.status,
			"frozen_for_model_development",
		);
		assert.deepEqual(
			DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.walkForwardFolds,
			DAILY_SWING_BROAD_WALK_FORWARD_FOLDS,
		);
	});

	it("allows one constant baseline and only the frozen logistic grid", () => {
		const candidates = DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.candidates;
		assert.equal(candidates[0].kind, "constant_probability");
		assert.deepEqual(
			candidates.slice(1).map((candidate) =>
				"l2Penalty" in candidate ? candidate.l2Penalty : null,
			),
			[0.003, 0.03, 0.3],
		);
		assert.equal(new Set(candidates.map((candidate) => candidate.candidateId)).size, 4);
	});

	it("excludes identity and provenance while keeping validation and test sealed", () => {
		assert.deepEqual(
			DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.featurePolicy.excludedFields,
			[
				"rowId",
				"instrumentId",
				"displaySymbol",
				"sourceScan",
				"signalAt",
				"resolvedAt",
			],
		);
		assert.equal(
			DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.dataAccess.validationLabelsRead,
			false,
		);
		assert.equal(
			DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.dataAccess.testLabelsRead,
			false,
		);
		assert.equal(DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.validationPolicy.oneShot, true);
		assert.equal(DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.testPolicy.status, "sealed");
	});

	it("uses unique robustness and final-validation gates with fail-closed rules", () => {
		const developmentMetrics =
			DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.selectionPolicy.robustnessGates.map(
				(gate) => gate.metric,
			);
		const validationMetrics =
			DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.validationPolicy.criteria.map(
				(gate) => gate.metric,
			);
		assert.equal(new Set(developmentMetrics).size, developmentMetrics.length);
		assert.equal(new Set(validationMetrics).size, validationMetrics.length);
		assert.match(
			DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.selectionPolicy.failureRule,
			/keep validation sealed/,
		);
		assert.match(
			DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.validationPolicy.decisionRule,
			/Every criterion must pass/,
		);
	});
});
