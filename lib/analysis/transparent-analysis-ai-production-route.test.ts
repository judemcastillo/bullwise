import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
	handleTransparentAnalysisAiProductionRequest,
	type TransparentAnalysisAiProductionRouteDependencies,
} from "@/lib/analysis/transparent-analysis-ai-production-route";
import type { TransparentAnalysisAiExplanation } from "@/lib/analysis/transparent-analysis-ai-contract";
import { AuthenticationError } from "@/lib/auth/access-policy";

const explanation: TransparentAnalysisAiExplanation = {
	version: "1.1.0",
	context: "mixed",
	overview: { text: "Verified fact.", factIds: ["trend.evidence.1"] },
	factors: [],
	limitations: [],
	disclaimer: "Descriptive market context—not investment advice or a trading signal.",
};

function dependencies(
	overrides: Partial<TransparentAnalysisAiProductionRouteDependencies> = {},
): TransparentAnalysisAiProductionRouteDependencies {
	return {
		authenticate: async () => ({ id: "user-1" }),
		getAnalysis: async () => ({ kind: "not_found" }),
		generate: async () => ({ kind: "ready", explanation }),
		...overrides,
	};
}

describe("production AI analysis API boundary", () => {
	it("authenticates before parsing or loading analysis", async () => {
		let analysisCalls = 0;
		const response = await handleTransparentAnalysisAiProductionRequest(
			"invalid",
			new AbortController().signal,
			dependencies({
				authenticate: async () => { throw new AuthenticationError(); },
				getAnalysis: async () => { analysisCalls += 1; return { kind: "not_found" }; },
			}),
		);

		assert.equal(response.status, 401);
		assert.equal(analysisCalls, 0);
	});

	it("does not call Gemini when deterministic analysis is unavailable", async () => {
		let generationCalls = 0;
		const response = await handleTransparentAnalysisAiProductionRequest(
			"equity:xnas:aapl",
			new AbortController().signal,
			dependencies({
				getAnalysis: async () => ({
					kind: "response",
					transportStatus: 200,
					response: {
						version: "1.0.0",
						status: "unavailable",
						reason: "insufficient_history",
						message: "Not enough history.",
						disclaimer: explanation.disclaimer,
					},
				}),
				generate: async () => { generationCalls += 1; return { kind: "ready", explanation }; },
			}),
		);

		assert.equal(response.status, 409);
		assert.equal(generationCalls, 0);
	});

	it("returns a safe unavailable response when generation fails", async () => {
		const response = await handleTransparentAnalysisAiProductionRequest(
			"equity:xnas:aapl",
			new AbortController().signal,
			dependencies({
				getAnalysis: async () => ({
					kind: "response",
					transportStatus: 200,
					response: {
						version: "1.0.0",
						status: "ready",
						instrument: { canonicalKey: "equity:xnas:aapl", displaySymbol: "AAPL", name: "Apple", currency: "USD" },
						asOf: "2026-08-21T20:00:00.000Z",
						timeframe: { interval: "1d", description: "Daily context" },
						context: "mixed",
						factors: {
							trend: { state: "mixed", evidence: [], counterEvidence: [] },
							momentum: { state: "mixed", evidence: [], counterEvidence: [] },
							volatility: { state: "normal", evidence: [], counterEvidence: [] },
							participation: { state: "normal", evidence: [], counterEvidence: [] },
						},
						levels: { support: [], resistance: [] },
						dataQuality: { provider: "massive", interval: "1d", adjusted: true, barsUsed: 500, firstBarAt: "2024-01-01", lastBarAt: "2026-08-21", completedThrough: "2026-08-21", warnings: [] },
						disclaimer: explanation.disclaimer,
					},
				}),
				generate: async () => ({ kind: "fallback" }),
			}),
		);

		assert.equal(response.status, 503);
		assert.deepEqual(await response.json(), {
			version: "1.0.0",
			status: "unavailable",
			message: "AI analysis is temporarily unavailable. The market analysis above is still valid.",
		});
	});

	it("keeps the production route click-only and ignores request bodies", () => {
		const source = readFileSync(
			new URL("../../app/api/instruments/[canonicalKey]/analysis/ai/route.ts", import.meta.url),
			"utf8",
		);
		assert.match(source, /export async function POST/);
		assert.match(source, /process\.env\.GEMINI_API_KEY/);
		assert.doesNotMatch(source, /request\.json|request\.text|searchParams/);
	});
});
