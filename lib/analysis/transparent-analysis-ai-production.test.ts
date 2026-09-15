import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildTransparentAnalysisAiSynthesisInput,
	generateTransparentAnalysisAiProductionOverview,
	inspectTransparentAnalysisAiSynthesis,
	validateTransparentAnalysisAiSynthesis,
	type TransparentAnalysisAiSynthesis,
	type TransparentAnalysisAiSynthesisInput,
} from "@/lib/analysis/transparent-analysis-ai-production";
import type { AnalysisPanelAvailableResponse } from "@/lib/analysis/transparent-analysis-panel.types";

const panel: AnalysisPanelAvailableResponse = {
	version: "1.0.0",
	status: "ready",
	instrument: { canonicalKey: "equity:xnas:aapl", displaySymbol: "AAPL", name: "Apple Inc.", currency: "USD" },
	asOf: "2026-08-21T20:00:00.000Z",
	timeframe: { interval: "1d", description: "Daily context" },
	context: "mixed",
	factors: {
		trend: { state: "bearish", evidence: ["Price is below its 200-day moving average."], counterEvidence: [] },
		momentum: { state: "bullish", evidence: ["Daily MACD momentum is positive."], counterEvidence: [] },
		volatility: { state: "high", evidence: ["20-day realized volatility is 50.52%."], counterEvidence: [] },
		participation: { state: "normal", evidence: ["Latest volume is -0.76 standard deviations from its 20-day baseline."], counterEvidence: [] },
	},
	levels: {
		support: [{ kind: "support", price: "220.50", distancePercent: -2.4, touches: 3, source: "swing_cluster" }],
		resistance: [{ kind: "resistance", price: "235.10", distancePercent: 4.1, touches: 2, source: "range_boundary" }],
	},
	dataQuality: { provider: "massive", interval: "1d", adjusted: true, barsUsed: 500, firstBarAt: "2024-08-22", lastBarAt: "2026-08-21", completedThrough: "2026-08-21", warnings: [] },
	disclaimer: "Descriptive market context—not investment advice or a trading signal.",
};

function validSynthesis(input: TransparentAnalysisAiSynthesisInput): TransparentAnalysisAiSynthesis {
	return {
		version: input.version,
		interpretation: {
			text: "Positive momentum is developing against a bearish broader trend, leaving the daily picture mixed.",
			factIds: ["trend.1", "momentum.1"],
		},
		conflict: {
			text: "Trend and momentum disagree, so directional confirmation is limited.",
			factIds: ["trend.1", "momentum.1"],
		},
		risk: {
			text: "High volatility suggests larger price movement, while current participation provides limited confirmation.",
			factIds: ["volatility.1", "participation.1"],
		},
		watchNext: {
			text: "Watch how price behaves around the nearest support and resistance boundaries.",
			factIds: ["support.1", "resistance.1"],
		},
		disclaimer: panel.disclaimer,
	};
}

describe("production AI analysis synthesis", () => {
	it("provides factors and levels for a narrow, cited interpretation", () => {
		const input = buildTransparentAnalysisAiSynthesisInput(panel)!;
		assert.deepEqual(input.factorStates, {
			trend: "bearish",
			momentum: "bullish",
			volatility: "high",
			participation: "normal",
		});
		assert.ok(input.facts.some(({ id, text }) => id === "support.1" && text.includes("220.50")));
		assert.equal(validateTransparentAnalysisAiSynthesis(input, validSynthesis(input)), true);
	});

	it("rejects invented numbers, advice, unsupported claims, and missing category citations", () => {
		const input = buildTransparentAnalysisAiSynthesisInput(panel)!;
		const valid = validSynthesis(input);
		for (const invalid of [
			{ ...valid, risk: { ...valid.risk, text: "Volatility may rise to 90%." } },
			{ ...valid, interpretation: { ...valid.interpretation, text: "Buy because momentum is positive." } },
			{ ...valid, risk: { ...valid.risk, text: "News sentiment confirms the move." } },
			{ ...valid, conflict: { ...valid.conflict, factIds: ["trend.1"] } },
			{ ...valid, interpretation: { text: panel.factors.trend.evidence[0], factIds: ["trend.1", "momentum.1"] } },
		]) {
			assert.equal(validateTransparentAnalysisAiSynthesis(input, invalid), false);
		}
	});

	it("reports fixed validation codes without retaining generated text", () => {
		const input = buildTransparentAnalysisAiSynthesisInput(panel)!;
		const value = validSynthesis(input);
		value.risk.text = "Volatility may rise to 90%.";

		assert.deepEqual(inspectTransparentAnalysisAiSynthesis(input, value), {
			ok: false,
			issues: [{ section: "risk", code: "unsupported_number" }],
		});
	});

	it("accepts whichever price-level categories are actually available", () => {
		const supportOnlyPanel = structuredClone(panel);
		supportOnlyPanel.levels.resistance = [];
		const input = buildTransparentAnalysisAiSynthesisInput(supportOnlyPanel)!;
		const value = validSynthesis(input);
		value.watchNext.factIds = ["support.1"];
		assert.equal(validateTransparentAnalysisAiSynthesis(input, value), true);
	});

	it("uses the synthesis prompt and the caller's cancellation signal", async () => {
		const signal = new AbortController().signal;
		let receivedSignal: AbortSignal | undefined;
		const result = await generateTransparentAnalysisAiProductionOverview({
			panel,
			provider: {
				generate: async (request) => {
					receivedSignal = request.signal;
					assert.equal(request.promptVersion, "2.0.0");
					assert.match(request.systemPrompt, /do not merely repeat/);
					return validSynthesis(request.input);
				},
			},
			signal,
		});
		assert.equal(receivedSignal, signal);
		assert.equal(result.kind, "ready");
	});

	it("falls back safely on provider failure, invalid output, or unavailable analysis", async () => {
		const signal = new AbortController().signal;
		const failure = await generateTransparentAnalysisAiProductionOverview({
			panel,
			provider: { generate: async () => { throw new Error("private provider error"); } },
			signal,
		});
		const invalid = await generateTransparentAnalysisAiProductionOverview({
			panel,
			provider: { generate: async () => ({ version: "2.0.0" }) },
			signal,
		});
		let calls = 0;
		const unavailable = await generateTransparentAnalysisAiProductionOverview({
			panel: { version: "1.0.0", status: "unavailable", reason: "insufficient_history", message: "Unavailable.", disclaimer: panel.disclaimer },
			provider: { generate: async () => { calls += 1; } },
			signal,
		});

		assert.deepEqual(failure, { kind: "fallback", reason: "provider_failure" });
		assert.deepEqual(invalid, {
			kind: "fallback",
			reason: "invalid_output",
			validationIssues: [{ section: "root", code: "invalid_shape" }],
		});
		assert.deepEqual(unavailable, { kind: "not_requested", reason: "analysis_unavailable" });
		assert.equal(calls, 0);
	});
});
