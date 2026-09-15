import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import type { TransparentAnalysisAiInput } from "@/lib/analysis/transparent-analysis-ai-contract";
import {
	TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_GATES,
	TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_PROTOCOL,
	TRANSPARENT_ANALYSIS_AI_CONTENT_PROMPT_V1_2,
	TRANSPARENT_ANALYSIS_AI_CONTENT_PROMPT_V1_2_SHA256,
} from "@/lib/analysis/transparent-analysis-ai-content-evaluation-v1-2";
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

describe("transparent analysis AI v1.2 content evaluation", () => {
	it("freezes the prompt hash and excludes latency from pass/fail gates", () => {
		assert.equal(
			createHash("sha256").update(TRANSPARENT_ANALYSIS_AI_CONTENT_PROMPT_V1_2).digest("hex"),
			TRANSPARENT_ANALYSIS_AI_CONTENT_PROMPT_V1_2_SHA256,
		);
		assert.equal(TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_GATES.length, 10);
		assert.equal(
			TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_GATES.some(
				({ id }) => id === "generation_p95_latency",
			),
			false,
		);
	});

	it("uses non-aborting requests and records latency without gating it", async () => {
		const report = await evaluateTransparentAnalysisAiCandidate({
			model: "synthetic-candidate",
			protocol: TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_PROTOCOL,
			generate: async (request) => {
				assert.equal(request.signal.aborted, false);
				return {
					output: validOutput(request.input),
					usage: { inputTokens: 100, outputTokens: 100, costUsd: 0 },
				};
			},
		});
		assert.equal(report.version, "1.2.0");
		assert.equal(report.contractVersion, "1.1.0");
		assert.equal(report.automatedPassed, 9);
		assert.equal(report.automatedFailed, 0);
		assert.equal(report.decision, "manual_review_required");
		assert.equal(typeof report.observations.generationP95LatencyMs, "number");
	});
});
