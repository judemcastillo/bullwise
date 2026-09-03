import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TransparentAnalysisAiInput } from "@/lib/analysis/transparent-analysis-ai-contract";
import { evaluateTransparentAnalysisAiCandidate } from "@/lib/analysis/transparent-analysis-ai-evaluation";

function validOutput(input: TransparentAnalysisAiInput) {
	const factors = (["trend", "momentum", "volatility", "participation"] as const).map(
		(factor) => ({
			factor,
			state: input.factors[factor].state,
			explanation: {
				text: input.factors[factor].facts[0].text,
				factIds: [input.factors[factor].facts[0].id],
			},
		}),
	);
	return {
		version: "1.0.0",
		context: input.context,
		overview: factors[0].explanation,
		factors,
		limitations: input.limitations,
		disclaimer: "Descriptive market context—not investment advice or a trading signal.",
	};
}

describe("transparent analysis AI development evaluation", () => {
	it("passes ten automated gates and leaves groundedness for manual review", async () => {
		let calls = 0;
		const report = await evaluateTransparentAnalysisAiCandidate({
			model: "synthetic-candidate",
			generate: async (request) => {
				calls += 1;
				return {
					output: validOutput(request.input),
					usage: { inputTokens: 100, outputTokens: 100, costUsd: 0.0001 },
				};
			},
		});
		assert.equal(calls, 20);
		assert.equal(report.fixtureCount, 32);
		assert.equal(report.generationFixtureCount, 20);
		assert.equal(report.automatedPassed, 10);
		assert.equal(report.automatedFailed, 0);
		assert.equal(report.decision, "manual_review_required");
		assert.equal(
			report.gates.find(({ id }) => id === "manual_groundedness")?.passed,
			null,
		);
	});
});
