import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TransparentAnalysisAiProvider } from "@/lib/analysis/transparent-analysis-ai-provider";
import { generateTransparentAnalysisAiProductionOverview } from "@/lib/analysis/transparent-analysis-ai-production";
import type { AnalysisPanelAvailableResponse } from "@/lib/analysis/transparent-analysis-panel.types";

const panel: AnalysisPanelAvailableResponse = {
	version: "1.0.0",
	status: "ready",
	instrument: {
		canonicalKey: "equity:xnas:aapl",
		displaySymbol: "AAPL",
		name: "Apple Inc.",
		currency: "USD",
	},
	asOf: "2026-08-21T20:00:00.000Z",
	timeframe: { interval: "1d", description: "Daily context" },
	context: "mixed",
	factors: {
		trend: { state: "mixed", evidence: ["Trend evidence."], counterEvidence: ["Trend counter-evidence."] },
		momentum: { state: "bullish", evidence: ["Momentum evidence."], counterEvidence: [] },
		volatility: { state: "normal", evidence: ["Volatility evidence."], counterEvidence: [] },
		participation: { state: "normal", evidence: ["Participation evidence."], counterEvidence: [] },
	},
	levels: { support: [], resistance: [] },
	dataQuality: {
		provider: "massive",
		interval: "1d",
		adjusted: true,
		barsUsed: 500,
		firstBarAt: "2024-08-22T04:00:00.000Z",
		lastBarAt: "2026-08-21T04:00:00.000Z",
		completedThrough: "2026-08-21T20:00:00.000Z",
		warnings: [],
	},
	disclaimer: "Descriptive market context—not investment advice or a trading signal.",
};

function validProvider(onRequest?: (request: Parameters<TransparentAnalysisAiProvider["generate"]>[0]) => void): TransparentAnalysisAiProvider {
	return {
		generate: async (request) => {
			onRequest?.(request);
			const input = request.input as typeof request.input & { requiredOverviewFactIds: string[] };
			return {
				version: "1.0.0",
				overviewFactIds: [...input.requiredOverviewFactIds].reverse(),
				factors: ["trend", "momentum", "volatility", "participation"].map((factor) => ({
					factor,
					factIds: input.factors[factor as keyof typeof input.factors].facts.map(({ id }) => id).reverse(),
				})),
			};
		},
	};
}

describe("production AI analysis generation", () => {
	it("uses the accepted v1.6 ID-only protocol without changing fact text", async () => {
		const signal = new AbortController().signal;
		let receivedSignal: AbortSignal | undefined;
		const result = await generateTransparentAnalysisAiProductionOverview({
			panel,
			provider: validProvider((request) => {
				receivedSignal = request.signal;
				assert.equal(request.promptVersion, "1.1.0");
				assert.match(request.systemPrompt, /Return fact IDs only/);
			}),
			signal,
		});

		assert.equal(receivedSignal, signal);
		assert.equal(result.kind, "ready");
		if (result.kind !== "ready") return;
		assert.match(result.explanation.overview.text, /evidence/i);
		assert.doesNotMatch(result.explanation.overview.text, /buy|sell|hold/i);
	});

	it("falls back safely on provider failure or invalid output", async () => {
		const signal = new AbortController().signal;
		const providerFailure = await generateTransparentAnalysisAiProductionOverview({
			panel,
			provider: { generate: async () => { throw new Error("provider details"); } },
			signal,
		});
		const invalidOutput = await generateTransparentAnalysisAiProductionOverview({
			panel,
			provider: { generate: async () => ({ version: "1.0.0", overviewFactIds: ["invented"], factors: [] }) },
			signal,
		});

		assert.deepEqual(providerFailure, { kind: "fallback", reason: "provider_failure" });
		assert.deepEqual(invalidOutput, { kind: "fallback", reason: "invalid_output" });
	});

	it("does not call Gemini when deterministic analysis is unavailable", async () => {
		let calls = 0;
		const result = await generateTransparentAnalysisAiProductionOverview({
			panel: {
				version: "1.0.0",
				status: "unavailable",
				reason: "insufficient_history",
				message: "Not enough history.",
				disclaimer: panel.disclaimer,
			},
			provider: { generate: async () => { calls += 1; } },
			signal: new AbortController().signal,
		});

		assert.deepEqual(result, { kind: "not_requested", reason: "analysis_unavailable" });
		assert.equal(calls, 0);
	});
});
