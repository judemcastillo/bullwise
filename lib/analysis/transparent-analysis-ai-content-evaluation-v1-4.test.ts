import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TransparentAnalysisAiInput } from "@/lib/analysis/transparent-analysis-ai-contract";
import {
	TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_4_GATES,
	TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_4_PROTOCOL,
} from "@/lib/analysis/transparent-analysis-ai-content-evaluation-v1-4";
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

describe("transparent analysis AI v1.4 paced content evaluation", () => {
	it("keeps the v1.2 prompt and freezes eleven automated gates", () => {
		assert.equal(TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_4_GATES.length, 12);
		assert.equal(TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_4_PROTOCOL.promptVersion, "1.2.0");
		assert.equal(TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_4_PROTOCOL.minimumStartIntervalMs, 6_100);
		assert.deepEqual(
			TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_4_GATES.find(
				({ id }) => id === "minimum_request_start_interval",
			),
			{
				id: "minimum_request_start_interval",
				comparison: ">=",
				threshold: 6_000,
				unit: "milliseconds",
			},
		);
	});

	it("paces generation requests and advances to manual review when all gates pass", async () => {
		let clock = 0;
		const waits: number[] = [];
		const report = await evaluateTransparentAnalysisAiCandidate({
			model: "synthetic-candidate",
			protocol: TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_4_PROTOCOL,
			now: () => clock,
			wait: async (milliseconds) => {
				waits.push(milliseconds);
				clock += milliseconds;
			},
			generate: async (request) => {
				clock += 25;
				return {
					output: validOutput(request.input),
					usage: { inputTokens: 100, outputTokens: 100, costUsd: 0 },
				};
			},
		});

		assert.equal(waits.length, 19);
		assert.equal(report.automatedPassed, 11);
		assert.equal(report.automatedFailed, 0);
		assert.equal(report.decision, "manual_review_required");
		assert.equal(report.observations.minimumRequestStartIntervalMs, 6_100);
	});
});
