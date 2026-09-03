import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TransparentAnalysisAiInput } from "@/lib/analysis/transparent-analysis-ai-contract";
import { observeTransparentAnalysisAiLatency } from "@/lib/analysis/transparent-analysis-ai-latency-observation";

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
		version: "1.1.0",
		context: input.context,
		overview: factors[0].explanation,
		factors,
		limitations: input.limitations,
		disclaimer: "Descriptive market context—not investment advice or a trading signal.",
	};
}

describe("transparent analysis AI latency observation", () => {
	it("records natural request durations without an application timeout", async () => {
		let clock = 0;
		let calls = 0;
		const report = await observeTransparentAnalysisAiLatency({
			model: "synthetic-candidate",
			now: () => clock,
			generate: async (request) => {
				calls += 1;
				assert.equal(request.signal.aborted, false);
				clock += 100 + calls;
				return {
					output: validOutput(request.input),
					usage: { inputTokens: 100, outputTokens: 50, costUsd: 0 },
				};
			},
		});

		assert.equal(calls, 20);
		assert.equal(report.applicationTimeoutEnabled, false);
		assert.equal(report.completedCount, 20);
		assert.equal(report.validOutputCount, 20);
		assert.deepEqual(report.latencyMs.completedRequests, {
			minimum: 101,
			mean: 110.5,
			p50: 110,
			p90: 118,
			p95: 119,
			maximum: 120,
		});
		assert.deepEqual(report.latencyMs.allRequests, report.latencyMs.completedRequests);
		assert.equal("output" in report.requests[0], false);
	});

	it("keeps provider failures out of completed-response latency", async () => {
		let clock = 0;
		let calls = 0;
		const report = await observeTransparentAnalysisAiLatency({
			model: "synthetic-candidate",
			now: () => clock,
			generate: async (request) => {
				calls += 1;
				clock += 100 + calls;
				if (calls === 1) throw new Error("synthetic provider failure");
				return {
					output: validOutput(request.input),
					usage: { inputTokens: 100, outputTokens: 50, costUsd: 0 },
				};
			},
		});

		assert.equal(report.completedCount, 19);
		assert.equal(report.providerFailureCount, 1);
		assert.equal(report.latencyMs.completedRequests.minimum, 102);
		assert.equal(report.latencyMs.allRequests.minimum, 101);
	});
});
