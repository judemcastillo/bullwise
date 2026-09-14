import assert from "node:assert/strict";
import { describe, it } from "node:test";
import AnalysisAiCache from "@/database/models/analysis-ai-cache.model";
import AnalysisAiRateLimit from "@/database/models/analysis-ai-rate-limit.model";
import {
	ANALYSIS_AI_MAX_GENERATIONS_PER_WINDOW,
	ANALYSIS_AI_RATE_LIMIT_WINDOW_MS,
	evaluateTransparentAnalysisAiQuota,
} from "@/lib/analysis/transparent-analysis-ai-rate-limit";

describe("AI analysis cache and rate-limit policy", () => {
	it("allows twenty uncached generations in a rolling hour and rejects the next", () => {
		const now = new Date("2026-09-12T12:00:00.000Z");
		const nineteen = Array.from({ length: 19 }, (_, index) =>
			new Date(now.getTime() - (index + 1) * 1_000));
		const allowed = evaluateTransparentAnalysisAiQuota(
			[new Date(now.getTime() - ANALYSIS_AI_RATE_LIMIT_WINDOW_MS - 1), ...nineteen],
			now,
		);
		assert.equal(allowed.allowed, true);
		assert.equal(allowed.attempts.length, ANALYSIS_AI_MAX_GENERATIONS_PER_WINDOW);
		assert.equal(
			evaluateTransparentAnalysisAiQuota(allowed.attempts, now).allowed,
			false,
		);
	});

	it("uses unique lookup keys and automatic expiration indexes", () => {
		for (const [model, key] of [
			[AnalysisAiCache, "cacheKey"],
			[AnalysisAiRateLimit, "userId"],
		] as const) {
			const indexes = model.schema.indexes() as Array<
				[Record<string, number>, { unique?: boolean; expireAfterSeconds?: number }]
			>;
			assert.equal(indexes.find(([fields]) => fields[key] === 1)?.[1].unique, true);
			assert.equal(
				indexes.find(([fields]) => fields.expiresAt === 1)?.[1].expireAfterSeconds,
				0,
			);
		}
	});
});
