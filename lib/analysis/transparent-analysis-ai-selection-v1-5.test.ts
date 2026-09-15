import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { buildTransparentAnalysisAiInput } from "@/lib/analysis/transparent-analysis-ai-contract";
import { TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES } from "@/lib/analysis/transparent-analysis-ai-fixtures";
import {
	renderedSelectionPreservesExactFacts,
	renderTransparentAnalysisAiSelection,
	validateTransparentAnalysisAiSelection,
} from "@/lib/analysis/transparent-analysis-ai-selection-contract";
import {
	completeTransparentAnalysisAiSelection,
	evaluateTransparentAnalysisAiSelectionV15,
} from "@/lib/analysis/transparent-analysis-ai-selection-evaluation-v1-5";
import {
	TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_GATES,
	TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROMPT,
	TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROMPT_SHA256,
	TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROTOCOL,
} from "@/lib/analysis/transparent-analysis-ai-selection-v1-5";

function fixtureInput() {
	const fixture = TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES.find(
		({ kind }) => kind === "generation");
	assert.ok(fixture);
	const input = buildTransparentAnalysisAiInput(fixture.panel);
	assert.ok(input);
	return input;
}

describe("transparent analysis AI v1.5 fact-selection candidate", () => {
	it("freezes the prompt, pacing, and eleven automated gates plus manual review", () => {
		assert.equal(
			createHash("sha256").update(TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROMPT).digest("hex"),
			TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROMPT_SHA256,
		);
		assert.equal(TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_GATES.length, 12);
		assert.equal(
			TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_GATES.filter(({ id }) =>
				id !== "manual_groundedness").length,
			11,
		);
		assert.equal(TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROTOCOL.minimumStartIntervalMs, 6_100);
	});

	it("rejects unknown, cross-factor, and incomplete fact selections", () => {
		const input = fixtureInput();
		const unknownOverview = structuredClone(completeTransparentAnalysisAiSelection(input));
		unknownOverview.overviewFactIds = ["trend.evidence.999"];
		const unknownResult = validateTransparentAnalysisAiSelection(input, unknownOverview);
		assert.equal(unknownResult.ok, false);
		if (!unknownResult.ok) assert.ok(unknownResult.issueCodes.includes("overview_citation"));

		const unbalanced = structuredClone(completeTransparentAnalysisAiSelection(input));
		unbalanced.overviewFactIds = [input.factors.trend.facts[0].id];
		const unbalancedResult = validateTransparentAnalysisAiSelection(input, unbalanced);
		assert.equal(unbalancedResult.ok, false);
		if (!unbalancedResult.ok) assert.ok(unbalancedResult.issueCodes.includes("overview_balance"));

		const incomplete = structuredClone(completeTransparentAnalysisAiSelection(input));
		incomplete.factors[0].factIds = [input.factors.trend.facts[0].id];
		const incompleteResult = validateTransparentAnalysisAiSelection(input, incomplete);
		assert.equal(incompleteResult.ok, false);
		if (!incompleteResult.ok) assert.ok(incompleteResult.issueCodes.includes("factor_coverage"));

		const crossFactor = structuredClone(completeTransparentAnalysisAiSelection(input));
		crossFactor.factors[0].factIds = [input.factors.momentum.facts[0].id];
		const crossResult = validateTransparentAnalysisAiSelection(input, crossFactor);
		assert.equal(crossResult.ok, false);
		if (!crossResult.ok) assert.ok(crossResult.issueCodes.includes("factor_citation"));
	});

	it("renders only exact deterministic fact text", () => {
		const input = fixtureInput();
		const selection = completeTransparentAnalysisAiSelection(input);
		const rendered = renderTransparentAnalysisAiSelection(input, selection);
		assert.equal(renderedSelectionPreservesExactFacts(input, selection, rendered), true);
		assert.equal(
			rendered.factors[2].explanation.text,
			input.factors.volatility.facts.map(({ text }) => text).join(" "),
		);
		assert.match(rendered.factors[2].explanation.text, /24\.5%/);
	});

	it("paces requests and advances to manual review when every automated gate passes", async () => {
		let clock = 0;
		const waits: number[] = [];
		const report = await evaluateTransparentAnalysisAiSelectionV15({
			model: "synthetic-candidate",
			now: () => clock,
			wait: async (milliseconds) => {
				waits.push(milliseconds);
				clock += milliseconds;
			},
			generate: async (request) => {
				clock += 25;
				return {
					output: completeTransparentAnalysisAiSelection(request.input),
					usage: { inputTokens: 100, outputTokens: 40, costUsd: 0 },
				};
			},
		});

		assert.equal(waits.length, 19);
		assert.equal(report.automatedPassed, 11);
		assert.equal(report.automatedFailed, 0);
		assert.equal(report.decision, "manual_review_required");
		assert.equal(report.observations.providerCompleted, 20);
		assert.equal(report.observations.minimumRequestStartIntervalMs, 6_100);
	});
});
