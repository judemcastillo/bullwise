import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_QUESTION_MAX_CHARACTERS,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_TOPICS,
	buildTransparentAnalysisAiTopicRoutingV2Input,
	expandTransparentAnalysisAiTopicRoutingV2,
	validateTransparentAnalysisAiTopicRoutingV2Output,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2";
import type {
	AnalysisPanelAvailableResponse,
	AnalysisPanelResponse,
} from "@/lib/analysis/transparent-analysis-panel.types";

function panel(
	overrides: Partial<AnalysisPanelAvailableResponse> = {},
): AnalysisPanelAvailableResponse {
	return {
		version: "1.0.0",
		status: "partial",
		instrument: {
			canonicalKey: "us-stock:synthetic",
			displaySymbol: "SYN",
			name: "Synthetic Instrument",
			currency: "USD",
		},
		asOf: "2026-09-08T20:00:00.000Z",
		timeframe: { interval: "1d", description: "Daily context" },
		context: "mixed",
		factors: {
			trend: {
				state: "bullish",
				evidence: ["Trend supporting one.", "Trend supporting two."],
				counterEvidence: ["Trend counter one."],
			},
			momentum: {
				state: "bearish",
				evidence: ["Momentum supporting one."],
				counterEvidence: ["Momentum counter one.", "Momentum counter two."],
			},
			volatility: {
				state: "high",
				evidence: ["Volatility supporting one."],
				counterEvidence: ["Volatility counter one."],
			},
			participation: {
				state: "unavailable",
				evidence: [],
				counterEvidence: ["Participation could not be calculated."],
			},
		},
		levels: {
			support: [
				{
					kind: "support",
					price: "101.25",
					distancePercent: -2.4,
					touches: 3,
					source: "swing_cluster",
				},
			],
			resistance: [],
		},
		dataQuality: {
			provider: "synthetic",
			interval: "1d",
			adjusted: true,
			barsUsed: 400,
			firstBarAt: "2025-01-01T05:00:00.000Z",
			lastBarAt: "2026-09-08T20:00:00.000Z",
			completedThrough: "2026-09-08T20:00:00.000Z",
			warnings: [
				"SPY benchmark history is unavailable; relative strength may be unavailable.",
				"Recent volume data are incomplete; participation may be unavailable.",
			],
		},
		disclaimer: "Descriptive market context—not investment advice or a trading signal.",
		...overrides,
	};
}

const unavailablePanel: AnalysisPanelResponse = {
	version: "1.0.0",
	status: "unavailable",
	reason: "analysis_failed",
	message: "Daily analysis is unavailable.",
	disclaimer: "Descriptive market context—not investment advice or a trading signal.",
};

function inputFor(question = "Explain the market context") {
	const result = buildTransparentAnalysisAiTopicRoutingV2Input({ panel: panel(), question });
	assert.equal(result.ok, true);
	if (!result.ok) throw new Error("Expected a valid topic-routing input");
	return result.input;
}

describe("transparent analysis AI topic routing v2", () => {
	it("builds a minimized input with only the question and frozen topic catalog", () => {
		const result = buildTransparentAnalysisAiTopicRoutingV2Input({
			panel: panel(),
			question: "  Explain the context  ",
		});
		assert.equal(result.ok, true);
		if (!result.ok) return;
		assert.deepEqual(Object.keys(result.input).sort(), ["question", "topics", "version"]);
		assert.equal(result.input.question, "Explain the context");
		assert.deepEqual(
			result.input.topics.map(({ id }) => id),
			TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_TOPICS.map(({ id }) => id),
		);
		const serialized = JSON.stringify(result.input);
		for (const forbidden of [
			"SYN",
			"Synthetic Instrument",
			"101.25",
			"bullish",
			"bearish",
			"Trend supporting one",
			"provider",
		]) {
			assert.equal(serialized.includes(forbidden), false);
		}
	});

	it("stops unavailable, empty, over-length, and explicit trading questions locally", () => {
		assert.deepEqual(
			buildTransparentAnalysisAiTopicRoutingV2Input({ panel: unavailablePanel, question: "Trend?" }),
			{ ok: false, reason: "analysis_unavailable" },
		);
		assert.deepEqual(
			buildTransparentAnalysisAiTopicRoutingV2Input({ panel: panel(), question: "   " }),
			{ ok: false, reason: "question_empty" },
		);
		assert.deepEqual(
			buildTransparentAnalysisAiTopicRoutingV2Input({
				panel: panel(),
				question: "x".repeat(
					TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_QUESTION_MAX_CHARACTERS + 1,
				),
			}),
			{ ok: false, reason: "question_too_long" },
		);
		for (const question of [
			"Should I buy this?",
			"Give me a stop loss.",
			"Create a trade plan.",
			"Forecast the next price.",
		]) {
			assert.deepEqual(
				buildTransparentAnalysisAiTopicRoutingV2Input({ panel: panel(), question }),
				{ ok: false, reason: "prohibited" },
			);
		}
		assert.equal(
			buildTransparentAnalysisAiTopicRoutingV2Input({
				panel: panel(),
				question: "What does long-term trend mean?",
			}).ok,
			true,
		);
	});

	it("strictly validates routes and topic selections", () => {
		const input = inputFor();
		assert.deepEqual(
			validateTransparentAnalysisAiTopicRoutingV2Output(input, {
				version: "2.0.0",
				route: "answer",
				topicIds: ["context", "volatility"],
			}),
			{
				ok: true,
				value: {
					version: "2.0.0",
					route: "answer",
					topicIds: ["context", "volatility"],
				},
			},
		);
		const invalidValues = [
			{ version: "2.0.0", route: "answer", topicIds: [] },
			{ version: "2.0.0", route: "clarify", topicIds: ["trend"] },
			{ version: "2.0.0", route: "answer", topicIds: ["unknown"] },
			{ version: "2.0.0", route: "answer", topicIds: ["trend", "trend"] },
			{
				version: "2.0.0",
				route: "answer",
				topicIds: ["trend", "momentum", "volatility", "participation"],
			},
			{ version: "2.0.0", route: "answer", topicIds: ["trend"], extra: true },
		];
		for (const value of invalidValues) {
			assert.equal(validateTransparentAnalysisAiTopicRoutingV2Output(input, value).ok, false);
		}
		const explicitTradingInput = { ...input, question: "Should I buy this?" };
		assert.equal(
			validateTransparentAnalysisAiTopicRoutingV2Output(explicitTradingInput, {
				version: "2.0.0",
				route: "answer",
				topicIds: ["context"],
			}).ok,
			false,
		);
		assert.equal(
			validateTransparentAnalysisAiTopicRoutingV2Output(explicitTradingInput, {
				version: "2.0.0",
				route: "prohibited",
				topicIds: [],
			}).ok,
			true,
		);
	});

	it("expands context into every trend and momentum fact but no unrelated factor", () => {
		const result = expandTransparentAnalysisAiTopicRoutingV2(panel(), {
			version: "2.0.0",
			route: "answer",
			topicIds: ["context"],
		});
		assert.equal(result.ok, true);
		if (!result.ok) return;
		assert.equal(result.value.context, "mixed");
		assert.deepEqual(result.value.factors.map(({ factor }) => factor), ["trend", "momentum"]);
		assert.deepEqual(
			result.value.factors.map(({ facts }) => facts.length),
			[3, 3],
		);
		assert.equal(result.value.factors.some(({ factor }) => factor === "volatility"), false);
		assert.deepEqual(result.value.topics.map(({ id }) => id), ["context"]);
	});

	it("deduplicates factor bundles and applies frozen local topic ordering", () => {
		const result = expandTransparentAnalysisAiTopicRoutingV2(panel(), {
			version: "2.0.0",
			route: "answer",
			topicIds: ["rsi", "momentum", "macd"],
		});
		assert.equal(result.ok, true);
		if (!result.ok) return;
		assert.deepEqual(result.value.topics.map(({ id }) => id), ["momentum", "macd", "rsi"]);
		assert.deepEqual(result.value.factors.map(({ factor }) => factor), ["momentum"]);
		assert.equal(result.value.factors[0].facts.length, 3);
	});

	it("renders levels, limitations, and approved warnings without inference", () => {
		const result = expandTransparentAnalysisAiTopicRoutingV2(panel(), {
			version: "2.0.0",
			route: "answer",
			topicIds: ["resistance", "support", "data_quality"],
		});
		assert.equal(result.ok, true);
		if (!result.ok) return;
		assert.deepEqual(result.value.levels.map(({ kind }) => kind), ["support", "resistance"]);
		assert.deepEqual(result.value.levels[0].items, panel().levels.support);
		assert.equal(result.value.levels[0].emptyMessage, null);
		assert.deepEqual(result.value.levels[1].items, []);
		assert.equal(
			result.value.levels[1].emptyMessage,
			"No level is available in the current daily analysis.",
		);
		assert.deepEqual(
			result.value.limitations.map(({ id }) => id),
			["participation_unavailable", "relative_strength_unavailable", "data_quality_warning"],
		);
		assert.deepEqual(result.value.dataQualityWarnings, panel().dataQuality.warnings);
	});

	it("attaches only the limitations belonging to participation and relative strength", () => {
		const result = expandTransparentAnalysisAiTopicRoutingV2(panel(), {
			version: "2.0.0",
			route: "answer",
			topicIds: ["relative_strength", "participation"],
		});
		assert.equal(result.ok, true);
		if (!result.ok) return;
		assert.deepEqual(result.value.factors.map(({ factor }) => factor), [
			"momentum",
			"participation",
		]);
		assert.deepEqual(
			result.value.limitations.map(({ id }) => id),
			["participation_unavailable", "relative_strength_unavailable"],
		);
		assert.deepEqual(result.value.dataQualityWarnings, []);
	});

	it("renders fixed non-answer routes and refuses unavailable expansion", () => {
		for (const route of ["clarify", "prohibited"] as const) {
			const result = expandTransparentAnalysisAiTopicRoutingV2(panel(), {
				version: "2.0.0",
				route,
				topicIds: [],
			});
			assert.equal(result.ok, true);
			if (!result.ok) continue;
			assert.deepEqual(result.value.topics, []);
			assert.deepEqual(result.value.factors, []);
			assert.deepEqual(result.value.levels, []);
			assert.deepEqual(result.value.limitations, []);
			assert.deepEqual(result.value.dataQualityWarnings, []);
		}
		assert.deepEqual(
			expandTransparentAnalysisAiTopicRoutingV2(unavailablePanel, {
				version: "2.0.0",
				route: "clarify",
				topicIds: [],
			}),
			{ ok: false, reason: "analysis_unavailable" },
		);
	});
});
