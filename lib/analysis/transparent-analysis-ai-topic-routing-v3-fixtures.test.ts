import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_FIXTURES } from "@/lib/analysis/transparent-analysis-ai-question-routing-fixtures";
import {
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_BOUNDARY_FIXTURES,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2-fixtures";
import {
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_BOUNDARY_FIXTURES,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FIXTURES_CANONICAL_JSON,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FIXTURES_SHA256,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_PANELS,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v3-fixtures";
import {
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_TOPICS,
	buildTransparentAnalysisAiTopicRoutingV2Input,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2";

describe("transparent analysis AI topic routing v3 fixtures", () => {
	it("freezes the preregistered independent fixture set", () => {
		assert.equal(TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES.length, 62);
		assert.equal(TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_BOUNDARY_FIXTURES.length, 20);
		assert.equal(
			createHash("sha256")
				.update(TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FIXTURES_CANONICAL_JSON)
				.digest("hex"),
			TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FIXTURES_SHA256,
		);
		const v3Fixtures = [
			...TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES,
			...TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_BOUNDARY_FIXTURES,
		];
		assert.equal(new Set(v3Fixtures.map(({ id }) => id)).size, v3Fixtures.length);
		const priorIds = new Set([
			...TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_FIXTURES.map(({ id }) => id),
			...TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES.map(({ id }) => id),
			...TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_BOUNDARY_FIXTURES.map(({ id }) => id),
		]);
		const priorQuestions = new Set([
			...TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_FIXTURES.map(({ question }) => question),
			...TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES.map(({ question }) => question),
			...TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_BOUNDARY_FIXTURES.map(({ question }) => question),
		].filter((question): question is string => typeof question === "string"));
		for (const fixture of v3Fixtures) {
			assert.equal(priorIds.has(fixture.id), false, fixture.id);
			if (typeof fixture.question === "string") {
				assert.equal(priorQuestions.has(fixture.question), false, fixture.id);
			}
		}
	});

	it("covers every topic, panel state, level shape, and multi-topic case", () => {
		for (const { id } of TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_TOPICS) {
			assert.ok(
				TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES.filter(
					({ expected }) => expected.topicIds.includes(id),
				).length >= 3,
				`Expected at least three independent fixtures for ${id}`,
			);
		}
		const contextStates = TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES
			.filter(({ expected }) => expected.topicIds.includes("context"))
			.map(({ panelId }) => TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_PANELS[panelId].context);
		assert.deepEqual(new Set(contextStates), new Set(["constructive", "mixed", "defensive"]));
		assert.deepEqual(
			new Set(TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES.map(({ panelId }) => panelId)),
			new Set(Object.keys(TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_PANELS)),
		);
		for (const tag of ["levels_zero", "levels_one", "levels_several", "multi_topic"]) {
			assert.ok(
				TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES.some(
					({ tags }) => tags.includes(tag),
				),
				tag,
			);
		}
	});

	it("keeps generation cases provider-routable and boundary cases local", () => {
		for (const fixture of TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES) {
			const built = buildTransparentAnalysisAiTopicRoutingV2Input({
				panel: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_PANELS[fixture.panelId],
				question: fixture.question,
			});
			assert.equal(built.ok, true, fixture.id);
		}
		for (const fixture of TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_BOUNDARY_FIXTURES) {
			if (fixture.kind !== "invalid_question" && fixture.kind !== "unavailable_input" &&
				fixture.kind !== "local_prohibited") continue;
			const built = buildTransparentAnalysisAiTopicRoutingV2Input({
				panel: fixture.panel,
				question: fixture.question,
			});
			assert.equal(built.ok, false, fixture.id);
			if (fixture.kind === "local_prohibited") {
				assert.deepEqual(built, { ok: false, reason: "prohibited" }, fixture.id);
			}
		}
	});
});
