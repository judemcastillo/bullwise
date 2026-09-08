import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	TRANSPARENT_ANALYSIS_AI_QUESTION_MAX_CHARACTERS,
	buildTransparentAnalysisAiQuestionRoutingInput,
	questionRequiresProhibitedRoute,
	renderTransparentAnalysisAiQuestionRoutingAnswer,
	validateTransparentAnalysisAiQuestionRoutingOutput,
} from "@/lib/analysis/transparent-analysis-ai-question-routing";
import {
	TRANSPARENT_ANALYSIS_PANEL_DISCLAIMER,
	type AnalysisPanelAvailableResponse,
	type AnalysisPanelResponse,
} from "@/lib/analysis/transparent-analysis-panel.types";

const panel: AnalysisPanelAvailableResponse = {
	version: "1.0.0",
	status: "partial",
	instrument: {
		canonicalKey: "equity:xnas:example",
		displaySymbol: "EXAMPLE",
		name: "Example Inc.",
		currency: "USD",
	},
	asOf: "2026-09-08T20:00:00.000Z",
	timeframe: { interval: "1d", description: "Daily context" },
	context: "mixed",
	factors: {
		trend: {
			state: "mixed",
			evidence: ["Price is above its 50-day moving average."],
			counterEvidence: ["Price is below its 200-day moving average."],
		},
		momentum: {
			state: "bearish",
			evidence: [],
			counterEvidence: ["The 20-day return is negative."],
		},
		volatility: {
			state: "high",
			evidence: ["Twenty-day realized volatility is 42%."],
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
		provider: "private-provider-name",
		interval: "1d",
		adjusted: true,
		barsUsed: 500,
		firstBarAt: "2024-09-09T04:00:00.000Z",
		lastBarAt: "2026-09-08T04:00:00.000Z",
		completedThrough: "2026-09-08T20:00:00.000Z",
		warnings: ["SPY benchmark data are unavailable; relative strength is omitted."],
	},
	disclaimer: TRANSPARENT_ANALYSIS_PANEL_DISCLAIMER,
};

function readyInput(question = "Why is the context mixed?") {
	const built = buildTransparentAnalysisAiQuestionRoutingInput({ panel, question });
	assert.equal(built.ok, true);
	if (!built.ok) throw new Error("Expected a valid question-routing input.");
	return built.input;
}

describe("transparent analysis AI question routing", () => {
	it("builds a minimal, trimmed input from allow-listed analysis data", () => {
		const input = readyInput("  Why is the context mixed?  ");
		const serialized = JSON.stringify(input);

		assert.equal(input.question, "Why is the context mixed?");
		assert.equal(input.context, "mixed");
		assert.equal(input.factors.trend.facts[0].id, "trend.evidence.1");
		assert.deepEqual(input.limitations.map(({ id }) => id), [
			"participation_unavailable",
			"relative_strength_unavailable",
			"data_quality_warning",
		]);
		assert.equal(input.glossary.length, 7);
		for (const excluded of ["EXAMPLE", "Example Inc.", "private-provider-name", "equity:xnas:example"]) {
			assert.equal(serialized.includes(excluded), false);
		}
	});

	it("rejects unavailable analysis and locally invalid questions before routing", () => {
		const unavailable: AnalysisPanelResponse = {
			version: "1.0.0",
			status: "unavailable",
			reason: "insufficient_history",
			message: "Not enough completed daily history is available.",
			disclaimer: TRANSPARENT_ANALYSIS_PANEL_DISCLAIMER,
		};

		assert.deepEqual(
			buildTransparentAnalysisAiQuestionRoutingInput({ panel: unavailable, question: "Why?" }),
			{ ok: false, reason: "analysis_unavailable" },
		);
		assert.deepEqual(
			buildTransparentAnalysisAiQuestionRoutingInput({ panel, question: "   " }),
			{ ok: false, reason: "question_empty" },
		);
		assert.deepEqual(
			buildTransparentAnalysisAiQuestionRoutingInput({
				panel,
				question: "x".repeat(TRANSPARENT_ANALYSIS_AI_QUESTION_MAX_CHARACTERS + 1),
			}),
			{ ok: false, reason: "question_too_long" },
		);
	});

	it("accepts only known, unique, bounded IDs with valid route semantics", () => {
		const input = readyInput();
		const valid = {
			version: "1.0.0",
			route: "answer",
			factIds: ["trend.evidence.1", "trend.counter_evidence.1"],
			glossaryIds: ["trend"],
			limitationIds: [],
		};

		assert.equal(validateTransparentAnalysisAiQuestionRoutingOutput(input, valid).ok, true);
		for (const invalid of [
			{ ...valid, extra: true },
			{ ...valid, factIds: ["unknown.fact"] },
			{ ...valid, glossaryIds: ["unknown-glossary"] },
			{ ...valid, limitationIds: ["unknown-limitation"] },
			{ ...valid, factIds: ["trend.evidence.1", "trend.evidence.1"] },
			{ ...valid, factIds: [] , glossaryIds: [], limitationIds: [] },
			{ ...valid, route: "clarify", factIds: ["trend.evidence.1"] },
		]) {
			assert.equal(validateTransparentAnalysisAiQuestionRoutingOutput(input, invalid).ok, false);
		}
	});

	it("requires prohibited routing for deterministic trading-request matches", () => {
		const input = readyInput("Should I buy this stock and where is the stop loss?");
		assert.equal(questionRequiresProhibitedRoute(input.question), true);
		assert.equal(questionRequiresProhibitedRoute("What does long-term momentum mean?"), false);

		assert.equal(validateTransparentAnalysisAiQuestionRoutingOutput(input, {
			version: "1.0.0",
			route: "answer",
			factIds: ["momentum.counter_evidence.1"],
			glossaryIds: [],
			limitationIds: [],
		}).ok, false);
		assert.equal(validateTransparentAnalysisAiQuestionRoutingOutput(input, {
			version: "1.0.0",
			route: "prohibited",
			factIds: [],
			glossaryIds: [],
			limitationIds: [],
		}).ok, true);
	});

	it("renders only exact locally supplied text", () => {
		const input = readyInput("Why is participation unavailable?");
		const validated = validateTransparentAnalysisAiQuestionRoutingOutput(input, {
			version: "1.0.0",
			route: "answer",
			factIds: ["participation.counter_evidence.1"],
			glossaryIds: ["participation"],
			limitationIds: ["participation_unavailable"],
		});
		assert.equal(validated.ok, true);
		if (!validated.ok) throw new Error("Expected valid selected IDs.");

		const rendered = renderTransparentAnalysisAiQuestionRoutingAnswer(input, validated.value);
		assert.equal(rendered.facts[0].text, panel.factors.participation.counterEvidence[0]);
		assert.equal(rendered.glossary[0].text, input.glossary.find(({ id }) => id === "participation")!.text);
		assert.equal(rendered.limitations[0].text, "Recent volume participation is unavailable.");
		assert.equal(rendered.disclaimer, TRANSPARENT_ANALYSIS_PANEL_DISCLAIMER);
		assert.equal(JSON.stringify(rendered).includes("Why is participation unavailable?"), false);
	});

	it("renders fixed clarify and prohibited messages without selected content", () => {
		const clarifyInput = readyInput("Can you explain?");
		const clarify = renderTransparentAnalysisAiQuestionRoutingAnswer(clarifyInput, {
			version: "1.0.0",
			route: "clarify",
			factIds: [],
			glossaryIds: [],
			limitationIds: [],
		});
		const prohibitedInput = readyInput("Should I sell?");
		const prohibited = renderTransparentAnalysisAiQuestionRoutingAnswer(prohibitedInput, {
			version: "1.0.0",
			route: "prohibited",
			factIds: [],
			glossaryIds: [],
			limitationIds: [],
		});

		assert.match(clarify.message, /Ask about the displayed market context/);
		assert.match(prohibited.message, /does not provide trading instructions/);
		assert.deepEqual(prohibited.facts, []);
		assert.deepEqual(prohibited.glossary, []);
		assert.deepEqual(prohibited.limitations, []);
	});
});
