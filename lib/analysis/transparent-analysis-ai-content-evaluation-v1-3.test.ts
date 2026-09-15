import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TransparentAnalysisAiInput } from "@/lib/analysis/transparent-analysis-ai-contract";
import {
	TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_GATES,
	TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_PROTOCOL,
} from "@/lib/analysis/transparent-analysis-ai-content-evaluation-v1-3";
import { evaluateTransparentAnalysisAiCandidate } from "@/lib/analysis/transparent-analysis-ai-evaluation";

function validOutput(input: TransparentAnalysisAiInput) {
	return {
		version: "1.1.0",
		context: input.context,
		overview: {
			text: input.factors.trend.facts[0].text,
			factIds: [input.factors.trend.facts[0].id],
		},
		factors: (["trend", "momentum", "volatility", "participation"] as const).map(
			(factor) => ({
				factor,
				state: input.factors[factor].state,
				explanation: {
					text: input.factors[factor].facts[0].text,
					factIds: [input.factors[factor].facts[0].id],
				},
			}),
		),
		limitations: input.limitations,
		disclaimer: "Descriptive market context—not investment advice or a trading signal.",
	};
}

describe("transparent analysis AI v1.3 content evaluation", () => {
	it("freezes ten automated gates plus manual groundedness", () => {
		assert.equal(TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_GATES.length, 11);
		assert.deepEqual(
			TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_GATES.find(
				({ id }) => id === "provider_completion",
			),
			{ id: "provider_completion", comparison: ">=", threshold: 90, unit: "percent" },
		);
		assert.equal(TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_PROTOCOL.promptVersion, "1.2.0");
	});

	it("passes with perfect completed content and exactly 90 percent completion", async () => {
		let call = 0;
		const report = await evaluateTransparentAnalysisAiCandidate({
			model: "synthetic-candidate",
			protocol: TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_PROTOCOL,
			generate: async (request) => {
				call += 1;
				if (call > 18) throw new Error("synthetic provider failure");
				return {
					output: validOutput(request.input),
					usage: { inputTokens: 100, outputTokens: 100, costUsd: 0 },
				};
			},
		});
		assert.equal(report.automatedPassed, 10);
		assert.equal(report.automatedFailed, 0);
		assert.equal(report.decision, "manual_review_required");
		assert.equal(report.observations.providerCompletionPercent, 90);
		assert.equal(
			report.gates.find(({ id }) => id === "structured_output_valid")?.value,
			100,
		);
	});

	it("fails availability without misclassifying completed content", async () => {
		let call = 0;
		const report = await evaluateTransparentAnalysisAiCandidate({
			model: "synthetic-candidate",
			protocol: TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_PROTOCOL,
			generate: async (request) => {
				call += 1;
				if (call > 17) throw new Error("synthetic provider failure");
				return {
					output: validOutput(request.input),
					usage: { inputTokens: 100, outputTokens: 100, costUsd: 0 },
				};
			},
		});
		assert.equal(report.automatedFailed, 1);
		assert.equal(report.decision, "reject_candidate");
		assert.equal(
			report.gates.find(({ id }) => id === "provider_completion")?.value,
			85,
		);
		assert.equal(
			report.gates.find(({ id }) => id === "structured_output_valid")?.value,
			100,
		);
	});
});
