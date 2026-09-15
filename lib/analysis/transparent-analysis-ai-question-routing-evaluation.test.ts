import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
	evaluateTransparentAnalysisAiQuestionRoutingV1,
	expectedTransparentAnalysisAiQuestionRoutingOutput,
} from "@/lib/analysis/transparent-analysis-ai-question-routing-evaluation";
import {
	TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_FIXTURES,
	TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_FIXTURES_SHA256,
} from "@/lib/analysis/transparent-analysis-ai-question-routing-fixtures";
import {
	TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_GATES,
	TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PACING_INTERVAL_MS,
	buildTransparentAnalysisAiQuestionRoutingInput,
} from "@/lib/analysis/transparent-analysis-ai-question-routing";

describe("transparent analysis AI question-routing development evaluator", () => {
	it("freezes at least forty generation fixtures with all required coverage tags", () => {
		const generation = TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_FIXTURES.filter(
			(fixture) => fixture.kind === "generation",
		);
		assert.equal(generation.length, 40);
		assert.ok(TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_FIXTURES.length >= 50);
		for (const tag of [
			"context",
			"volatility_low",
			"volatility_normal",
			"volatility_high",
			"participation_weak",
			"participation_normal",
			"participation_strong",
			"participation_unavailable",
			"glossary",
			"same_factor_multiple",
			"multi_factor",
			"limitation",
			"prohibited",
			"prompt_injection",
			"clarify",
		]) {
			assert.ok(generation.some((fixture) => fixture.tags.includes(tag)), `Missing ${tag}`);
		}
		assert.equal(TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_GATES.length, 13);
		assert.equal(TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PACING_INTERVAL_MS, 6_100);
		assert.equal(
			createHash("sha256")
				.update(JSON.stringify(TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_FIXTURES))
				.digest("hex"),
			TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_FIXTURES_SHA256,
		);
	});

	it("keeps every expected and allowed ID inside its built input", () => {
		for (const fixture of TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_FIXTURES) {
			if (fixture.kind !== "generation") continue;
			const built = buildTransparentAnalysisAiQuestionRoutingInput({
				panel: fixture.panel,
				question: fixture.question,
			});
			assert.equal(built.ok, true, fixture.id);
			if (!built.ok) continue;
			const factIds = Object.values(built.input.factors).flatMap(({ facts }) =>
				facts.map(({ id }) => id));
			const glossaryIds = built.input.glossary.map(({ id }) => id);
			const limitationIds = built.input.limitations.map(({ id }) => id);
			for (const ids of [fixture.expected.factIds, fixture.allowed.factIds]) {
				assert.ok(ids.every((id) => factIds.includes(id)), fixture.id);
			}
			for (const ids of [fixture.expected.glossaryIds, fixture.allowed.glossaryIds]) {
				assert.ok(ids.every((id) => glossaryIds.includes(id)), fixture.id);
			}
			for (const ids of [fixture.expected.limitationIds, fixture.allowed.limitationIds]) {
				assert.ok(ids.every((id) => limitationIds.includes(id)), fixture.id);
			}
		}
	});

	it("passes every automated gate with an ideal paced fake provider", async () => {
		let clock = 0;
		const waits: number[] = [];
		const byId = new Map(TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_FIXTURES
			.filter((fixture) => fixture.kind === "generation")
			.map((fixture) => [fixture.id, fixture]));
		const report = await evaluateTransparentAnalysisAiQuestionRoutingV1({
			model: "ideal-fake-provider",
			now: () => clock,
			wait: async (milliseconds) => {
				waits.push(milliseconds);
				clock += milliseconds;
			},
			generate: async ({ fixtureId }) => {
				clock += 25;
				const fixture = byId.get(fixtureId);
				assert.ok(fixture);
				return {
					output: expectedTransparentAnalysisAiQuestionRoutingOutput(fixture),
					usage: { inputTokens: 80, outputTokens: 12, costUsd: 0 },
				};
			},
		});

		assert.equal(waits.length, 39);
		assert.equal(report.fixtureCount, TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_FIXTURES.length);
		assert.equal(report.generationFixtureCount, 40);
		assert.equal(report.automatedPassed, 12);
		assert.equal(report.automatedFailed, 0);
		assert.equal(report.decision, "manual_review_required");
		assert.equal(report.observations.providerCompleted, 40);
		assert.equal(report.observations.minimumRequestStartIntervalMs, 6_100);
		assert.equal(report.observations.latencyP95Ms, 25);
	});

	it("rejects a fake provider that returns an incorrect route", async () => {
		let clock = 0;
		const report = await evaluateTransparentAnalysisAiQuestionRoutingV1({
			model: "wrong-route-fake-provider",
			now: () => clock,
			wait: async (milliseconds) => { clock += milliseconds; },
			generate: async () => {
				clock += 1;
				return {
					output: {
						version: "1.0.0",
						route: "clarify",
						factIds: [],
						glossaryIds: [],
						limitationIds: [],
					},
					usage: { inputTokens: 1, outputTokens: 1, costUsd: 0 },
				};
			},
		});

		assert.equal(report.decision, "reject_candidate");
		assert.ok(report.automatedFailed > 0);
	});
});
