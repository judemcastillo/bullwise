import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildTransparentAnalysisAiInput,
	TRANSPARENT_ANALYSIS_AI_EVALUATION_GATES,
	validateTransparentAnalysisAiExplanation,
} from "@/lib/analysis/transparent-analysis-ai-contract";
import type { AnalysisPanelResponse } from "@/lib/analysis/transparent-analysis-panel.types";

const DISCLAIMER = "Descriptive market context—not investment advice or a trading signal.";

function response(): AnalysisPanelResponse {
	return {
		version: "1.0.0",
		status: "partial",
		instrument: {
			canonicalKey: "equity:xnas:aapl",
			displaySymbol: "AAPL",
			name: "Apple Inc.",
			currency: "USD",
		},
		asOf: "2026-09-02T20:00:00.000Z",
		timeframe: { interval: "1d", description: "Daily context" },
		context: "constructive",
		factors: {
			trend: {
				state: "bullish",
				evidence: ["Price is above its 200-day moving average."],
				counterEvidence: ["The daily moving averages are not fully aligned."],
			},
			momentum: {
				state: "bullish",
				evidence: ["RSI is constructive at 61.2."],
				counterEvidence: [],
			},
			volatility: {
				state: "normal",
				evidence: ["20-day realized volatility is 24.5%."],
				counterEvidence: [],
			},
			participation: {
				state: "unavailable",
				evidence: [],
				counterEvidence: ["Recent volume participation could not be calculated."],
			},
		},
		levels: { support: [], resistance: [] },
		dataQuality: {
			provider: "massive",
			interval: "1d",
			adjusted: true,
			barsUsed: 475,
			firstBarAt: "2024-10-01T04:00:00.000Z",
			lastBarAt: "2026-09-02T04:00:00.000Z",
			completedThrough: "2026-09-02T20:00:00.000Z",
			warnings: ["Recent volume data are incomplete; participation may be unavailable."],
		},
		disclaimer: DISCLAIMER,
	};
}

function validExplanation() {
	return {
		version: "1.0.0",
		context: "constructive",
		overview: {
			text: "Daily evidence is constructive, while participation could not be calculated.",
			factIds: ["trend.evidence.1", "participation.counter_evidence.1"],
		},
		factors: [
			{
				factor: "trend",
				state: "bullish",
				explanation: {
					text: "Price remains above its 200-day moving average.",
					factIds: ["trend.evidence.1"],
				},
			},
			{
				factor: "momentum",
				state: "bullish",
				explanation: {
					text: "RSI is constructive at 61.2.",
					factIds: ["momentum.evidence.1"],
				},
			},
			{
				factor: "volatility",
				state: "normal",
				explanation: {
					text: "The cited 20-day realized volatility is 24.5%.",
					factIds: ["volatility.evidence.1"],
				},
			},
			{
				factor: "participation",
				state: "unavailable",
				explanation: {
					text: "Recent volume participation could not be calculated.",
					factIds: ["participation.counter_evidence.1"],
				},
			},
		],
		limitations: ["participation_unavailable", "data_quality_warning"],
		disclaimer: DISCLAIMER,
	};
}

describe("transparent analysis AI explanation contract", () => {
	it("builds a minimized fact-ID input without product or research internals", () => {
		const input = buildTransparentAnalysisAiInput(response());
		assert.ok(input);
		assert.deepEqual(input.limitations, [
			"participation_unavailable",
			"data_quality_warning",
		]);
		assert.deepEqual(input.factors.trend.facts[0], {
			id: "trend.evidence.1",
			kind: "evidence",
			text: "Price is above its 200-day moving average.",
		});
		assert.doesNotMatch(
			JSON.stringify(input),
			/AAPL|Apple|canonicalKey|provider|levels|signal|tradePlan|user/i,
		);
	});

	it("never creates model input for an unavailable panel", () => {
		assert.equal(
			buildTransparentAnalysisAiInput({
				version: "1.0.0",
				status: "unavailable",
				reason: "bars_provider_unavailable",
				message: "Daily market data are temporarily unavailable.",
				disclaimer: DISCLAIMER,
			}),
			null,
		);
	});

	it("accepts a strict, cited, state-faithful explanation", () => {
		const input = buildTransparentAnalysisAiInput(response());
		assert.ok(input);
		assert.equal(validateTransparentAnalysisAiExplanation(input, validExplanation()).ok, true);
	});

	it("rejects advice, unsupported domains, state drift, and invented numbers", () => {
		const input = buildTransparentAnalysisAiInput(response());
		assert.ok(input);
		const explanation = validExplanation();
		explanation.overview.text =
			"Buy now because earnings sentiment supports a 75% price target.";
		explanation.context = "defensive";
		explanation.factors[0].state = "bearish";
		explanation.factors[0].explanation.factIds = ["momentum.evidence.1"];
		const result = validateTransparentAnalysisAiExplanation(input, explanation);
		assert.equal(result.ok, false);
		if (!result.ok) {
			assert.match(result.reasons.join(" "), /trading advice/);
			assert.match(result.reasons.join(" "), /context label/);
			assert.match(result.reasons.join(" "), /unsupported data domain/);
			assert.match(result.reasons.join(" "), /uncited numeric claim/);
			assert.match(result.reasons.join(" "), /state does not match/);
			assert.match(result.reasons.join(" "), /another factor/);
		}
	});

	it("freezes eleven all-or-nothing evaluation gates before provider selection", () => {
		assert.equal(TRANSPARENT_ANALYSIS_AI_EVALUATION_GATES.length, 11);
		assert.equal(
			new Set(TRANSPARENT_ANALYSIS_AI_EVALUATION_GATES.map(({ id }) => id)).size,
			11,
		);
	});
});
