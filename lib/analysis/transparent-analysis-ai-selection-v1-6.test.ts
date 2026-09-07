import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
	buildTransparentAnalysisAiInput,
	TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES,
} from "@/lib/analysis/transparent-analysis-ai-contract";
import { TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES } from "@/lib/analysis/transparent-analysis-ai-fixtures";
import {
	completeTransparentAnalysisAiSelectionV16,
	evaluateTransparentAnalysisAiSelectionV16,
} from "@/lib/analysis/transparent-analysis-ai-selection-evaluation-v1-6";
import {
	buildTransparentAnalysisAiSelectionV16Input,
	deterministicBalancedOverviewFactIds,
	TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_GATES,
	TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROMPT,
	TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROMPT_SHA256,
	TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROTOCOL,
	validateTransparentAnalysisAiSelectionV16,
} from "@/lib/analysis/transparent-analysis-ai-selection-v1-6";

function generationInputs() {
	return TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES
		.filter(({ kind }) => kind === "generation")
		.map(({ panel }) => {
			const input = buildTransparentAnalysisAiInput(panel);
			assert.ok(input);
			return input;
		});
}

describe("transparent analysis AI v1.6 deterministic-overview ordering candidate", () => {
	it("freezes the prompt, pacing, and eleven automated gates plus manual review", () => {
		assert.equal(
			createHash("sha256").update(TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROMPT).digest("hex"),
			TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROMPT_SHA256,
		);
		assert.equal(TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_GATES.length, 12);
		assert.equal(
			TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_GATES.filter(({ id }) =>
				id !== "manual_groundedness").length,
			11,
		);
		assert.equal(TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROTOCOL.minimumStartIntervalMs, 6_100);
	});

	it("deterministically requires balanced known overview facts", () => {
		for (const input of generationInputs()) {
			const ids = deterministicBalancedOverviewFactIds(input);
			const facts = TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES.flatMap((factor) =>
				input.factors[factor].facts);
			assert.ok(ids.length >= 1 && ids.length <= 4);
			assert.equal(new Set(ids).size, ids.length);
			assert.ok(ids.every((id) => facts.some((fact) => fact.id === id)));
			const availableKinds = new Set(facts.map(({ kind }) => kind));
			const selectedKinds = new Set(ids.map((id) =>
				facts.find((fact) => fact.id === id)!.kind));
			if (availableKinds.has("evidence") && availableKinds.has("counter_evidence")) {
				assert.ok(selectedKinds.has("evidence"));
				assert.ok(selectedKinds.has("counter_evidence"));
			}
		}
	});

	it("rejects a valid but different overview membership", () => {
		const fixture = TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES.find(
			({ id }) => id === "ready-conflicting-numeric-evidence");
		assert.ok(fixture);
		const baseInput = buildTransparentAnalysisAiInput(fixture.panel);
		assert.ok(baseInput);
		const input = buildTransparentAnalysisAiSelectionV16Input(baseInput);
		const selection = completeTransparentAnalysisAiSelectionV16(input);
		const allIds = TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES.flatMap((factor) =>
			input.factors[factor].facts.map(({ id }) => id));
		const replacement = allIds.find((id) => !selection.overviewFactIds.includes(id));
		assert.ok(replacement);
		selection.overviewFactIds[selection.overviewFactIds.length - 1] = replacement;
		const result = validateTransparentAnalysisAiSelectionV16(input, selection);
		assert.equal(result.ok, false);
		if (!result.ok) assert.ok(result.issueCodes.includes("overview_membership"));
	});

	it("paces requests and advances to manual review when every automated gate passes", async () => {
		let clock = 0;
		const waits: number[] = [];
		const report = await evaluateTransparentAnalysisAiSelectionV16({
			model: "synthetic-candidate",
			now: () => clock,
			wait: async (milliseconds) => {
				waits.push(milliseconds);
				clock += milliseconds;
			},
			generate: async (request) => {
				clock += 25;
				assert.ok("requiredOverviewFactIds" in request.input);
				const modelInput = request.input as typeof request.input & {
					requiredOverviewFactIds: string[];
				};
				return {
					output: completeTransparentAnalysisAiSelectionV16(modelInput),
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
