import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GoogleTransparentAnalysisAiProviderError } from "@/lib/analysis/google-transparent-analysis-ai-provider";
import { observeTransparentAnalysisAiProviderReliability } from "@/lib/analysis/transparent-analysis-ai-provider-reliability";

describe("transparent analysis AI provider reliability observation", () => {
	it("records safe failure categories without retaining model output", async () => {
		let call = 0;
		let clock = 0;
		const report = await observeTransparentAnalysisAiProviderReliability({
			model: "synthetic-candidate",
			now: () => clock,
			generate: async (request) => {
				call += 1;
				clock += 25;
				assert.equal(request.signal.aborted, false);
				if (call === 16) {
					throw new GoogleTransparentAnalysisAiProviderError({
						message: "synthetic secret-free failure",
						category: "rate_limited",
						httpStatus: 429,
						retryAfterSeconds: 30,
					});
				}
				return {
					output: { prose: "must not be retained" },
					usage: { inputTokens: 10, outputTokens: 5, costUsd: 0 },
				};
			},
		});

		assert.equal(report.requestCount, 20);
		assert.equal(report.completedCount, 19);
		assert.equal(report.providerFailureCount, 1);
		assert.equal(report.failureCounts.rate_limited, 1);
		assert.deepEqual(report.requests[15].failure, {
			category: "rate_limited",
			httpStatus: 429,
			retryAfterSeconds: 30,
		});
		assert.doesNotMatch(JSON.stringify(report), /must not be retained/);
	});

	it("fails closed to an unclassified category", async () => {
		const report = await observeTransparentAnalysisAiProviderReliability({
			model: "synthetic-candidate",
			generate: async () => { throw new Error("untrusted details"); },
		});
		assert.equal(report.providerFailureCount, 20);
		assert.equal(report.failureCounts.unclassified_error, 20);
		assert.doesNotMatch(JSON.stringify(report), /untrusted details/);
	});
});
