import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	evaluateTransparentAnalysisAiTopicRoutingV2,
	expectedTransparentAnalysisAiTopicRoutingV2Output,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2-evaluation";
import {
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_BOUNDARY_FIXTURES,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_FIXTURES_CANONICAL_JSON,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_FIXTURES_SHA256,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PANELS,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2-fixtures";
import {
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_TOPICS,
	buildTransparentAnalysisAiTopicRoutingV2Input,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2";

describe("transparent analysis AI topic routing v2 development evaluator", () => {
	it("freezes an independent fixture set with the preregistered coverage", () => {
		assert.equal(TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES.length, 62);
		assert.equal(TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_BOUNDARY_FIXTURES.length, 20);
		assert.equal(
			createHash("sha256")
				.update(TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_FIXTURES_CANONICAL_JSON)
				.digest("hex"),
			TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_FIXTURES_SHA256,
		);
		assert.equal(
			new Set(TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES.map(({ id }) => id)).size,
			TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES.length,
		);
		assert.equal(
			new Set(TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES.map(({ question }) => question)).size,
			TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES.length,
		);
		for (const { id } of TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_TOPICS) {
			assert.ok(
				TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES.filter(
					({ expected }) => expected.topicIds.includes(id),
				).length >= 3,
				`Expected at least three fixtures for ${id}`,
			);
		}
		assert.ok(
			TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES.filter(
				({ expected }) => expected.topicIds.includes("context"),
			).length >= 2,
		);
		assert.deepEqual(
			new Set(TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES.map(({ panelId }) => panelId)),
			new Set(Object.keys(TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PANELS)),
		);
		const contextPanels = TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES
			.filter(({ expected }) => expected.topicIds.includes("context"))
			.map(({ panelId }) => TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PANELS[panelId].context);
		assert.deepEqual(new Set(contextPanels), new Set(["constructive", "mixed", "defensive"]));
		for (const tag of ["levels_zero", "levels_one", "levels_several"]) {
			assert.ok(
				TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES.some(
					({ tags }) => tags.includes(tag),
				),
			);
		}
	});

	it("keeps every provider-generation question inside the local request boundary", () => {
		for (const fixture of TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES) {
			const built = buildTransparentAnalysisAiTopicRoutingV2Input({
				panel: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PANELS[fixture.panelId],
				question: fixture.question,
			});
			assert.equal(built.ok, true, fixture.id);
		}
	});

	it("passes all automated gates with an ideal paced fake provider", async () => {
		let clock = 0;
		const byId = new Map(
			TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES.map((fixture) => [fixture.id, fixture]),
		);
		const report = await evaluateTransparentAnalysisAiTopicRoutingV2({
			model: "ideal-topic-router",
			now: () => clock,
			wait: async (milliseconds) => { clock += milliseconds; },
			generate: async ({ fixtureId }) => {
				clock += 20;
				return {
					output: expectedTransparentAnalysisAiTopicRoutingV2Output(byId.get(fixtureId)!),
					usage: { inputTokens: 80, outputTokens: 12, costUsd: 0 },
				};
			},
		});
		assert.equal(report.decision, "manual_review_required");
		assert.equal(report.automatedPassed, 14);
		assert.equal(report.automatedFailed, 0);
		assert.equal(report.observations.providerCompleted, 62);
		assert.ok(report.gates.filter(({ passed }) => passed !== null).every(({ passed }) => passed));
		assert.equal(JSON.stringify(report).includes("Which parts of the panel"), false);
	});

	it("rejects a fake provider that adds an unnecessary topic", async () => {
		let clock = 0;
		const byId = new Map(
			TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES.map((fixture) => [fixture.id, fixture]),
		);
		const report = await evaluateTransparentAnalysisAiTopicRoutingV2({
			model: "overselecting-topic-router",
			now: () => clock,
			wait: async (milliseconds) => { clock += milliseconds; },
			generate: async ({ fixtureId }) => {
				clock += 10;
				const expected = expectedTransparentAnalysisAiTopicRoutingV2Output(byId.get(fixtureId)!);
				return {
					output: expected.route === "answer" && expected.topicIds.length < 3
						? { ...expected, topicIds: [...expected.topicIds, "data_quality"] }
						: expected,
					usage: { inputTokens: 80, outputTokens: 12, costUsd: 0 },
				};
			},
		});
		assert.equal(report.decision, "reject_candidate");
		assert.equal(
			report.gates.find(({ id }) => id === "exact_topic_set_accuracy")?.passed,
			false,
		);
	});
});
