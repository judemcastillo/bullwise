import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { buildTransparentAnalysisAiInput } from "@/lib/analysis/transparent-analysis-ai-contract";
import { TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES } from "@/lib/analysis/transparent-analysis-ai-fixtures";
import {
	evaluateTransparentAnalysisAiSelectionAcceptanceV1,
	TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_VERSION,
} from "@/lib/analysis/transparent-analysis-ai-selection-acceptance-v1";
import {
	TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_FIXTURES,
	TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_FIXTURES_SHA256,
} from "@/lib/analysis/transparent-analysis-ai-selection-acceptance-v1-fixtures";
import { completeTransparentAnalysisAiSelectionV16 } from "@/lib/analysis/transparent-analysis-ai-selection-evaluation-v1-6";

function factTexts(fixtures: readonly { panel: Parameters<typeof buildTransparentAnalysisAiInput>[0] }[]) {
	return new Set(fixtures.flatMap(({ panel }) => {
		const input = buildTransparentAnalysisAiInput(panel);
		return input
			? Object.values(input.factors).flatMap(({ facts }) => facts.map(({ text }) => text))
			: [];
	}));
}

describe("transparent analysis AI v1.6 acceptance v1", () => {
	it("freezes 32 new fixtures with 20 generation requests", () => {
		assert.equal(TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_VERSION, "1.0.0");
		assert.equal(TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_FIXTURES.length, 32);
		assert.equal(
			TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_FIXTURES.filter(
				({ kind }) => kind === "generation").length,
			20,
		);
		assert.equal(
			createHash("sha256")
				.update(JSON.stringify(TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_FIXTURES))
				.digest("hex"),
			TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_FIXTURES_SHA256,
		);
	});

	it("does not reuse development fact text", () => {
		const developmentTexts = factTexts(TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES);
		const acceptanceTexts = factTexts(TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_FIXTURES);
		assert.deepEqual(
			[...acceptanceTexts].filter((text) => developmentTexts.has(text)),
			[],
		);
	});

	it("passes all frozen gates with a compliant synthetic provider", async () => {
		let clock = 0;
		const waits: number[] = [];
		const report = await evaluateTransparentAnalysisAiSelectionAcceptanceV1({
			model: "synthetic-candidate",
			now: () => clock,
			wait: async (milliseconds) => {
				waits.push(milliseconds);
				clock += milliseconds;
			},
			generate: async (request) => {
				clock += 25;
				assert.ok("requiredOverviewFactIds" in request.input);
				return {
					output: completeTransparentAnalysisAiSelectionV16(
						request.input as typeof request.input & { requiredOverviewFactIds: string[] }),
					usage: { inputTokens: 100, outputTokens: 40, costUsd: 0 },
				};
			},
		});

		assert.equal(waits.length, 19);
		assert.equal(report.automatedPassed, 11);
		assert.equal(report.automatedFailed, 0);
		assert.equal(report.decision, "manual_review_required");
		assert.equal(report.observations.providerCompleted, 20);
		assert.equal(report.observations.minimumRequestStartIntervalMs, 6_100);
	});
});
