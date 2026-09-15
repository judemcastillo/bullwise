import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GoogleTransparentAnalysisAiProviderError } from "@/lib/analysis/google-transparent-analysis-ai-provider";
import {
	evaluateTransparentAnalysisAiProviderPacing,
	TRANSPARENT_ANALYSIS_AI_PROVIDER_PACING_INTERVAL_MS,
} from "@/lib/analysis/transparent-analysis-ai-provider-pacing";

describe("transparent analysis AI provider pacing", () => {
	it("enforces the frozen request-start spacing and passes clean completion", async () => {
		let clock = 0;
		const waits: number[] = [];
		const result = await evaluateTransparentAnalysisAiProviderPacing({
			model: "synthetic-candidate",
			now: () => clock,
			wait: async (milliseconds) => {
				waits.push(milliseconds);
				clock += milliseconds;
			},
			generate: async () => {
				clock += 25;
				return {
					output: { prose: "must not be retained" },
					usage: { inputTokens: 10, outputTokens: 5, costUsd: 0 },
				};
			},
		});

		assert.equal(result.decision, "pacing_supported");
		assert.equal(waits.length, 19);
		assert.equal(waits[0], TRANSPARENT_ANALYSIS_AI_PROVIDER_PACING_INTERVAL_MS - 25);
		assert.equal(result.observation.requests[1].startedAfterPreviousMs, 6_100);
		assert.doesNotMatch(JSON.stringify(result), /must not be retained/);
	});

	it("rejects pacing when completion is low and rate limiting remains", async () => {
		let clock = 0;
		let call = 0;
		const result = await evaluateTransparentAnalysisAiProviderPacing({
			model: "synthetic-candidate",
			now: () => clock,
			wait: async (milliseconds) => { clock += milliseconds; },
			generate: async () => {
				call += 1;
				clock += 25;
				if (call > 17) {
					throw new GoogleTransparentAnalysisAiProviderError({
						message: "synthetic rate limit",
						category: "rate_limited",
						httpStatus: 429,
					});
				}
				return {
					output: {},
					usage: { inputTokens: 10, outputTokens: 5, costUsd: 0 },
				};
			},
		});

		assert.equal(result.decision, "pacing_not_supported");
		assert.equal(
			result.gates.find(({ id }) => id === "provider_completion")?.value,
			85,
		);
		assert.equal(
			result.gates.find(({ id }) => id === "rate_limited_failures")?.value,
			3,
		);
	});
});
