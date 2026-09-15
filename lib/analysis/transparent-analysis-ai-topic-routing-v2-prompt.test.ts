import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	GOOGLE_TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_CANDIDATE,
	GoogleTransparentAnalysisAiTopicRoutingV2Provider,
} from "@/lib/analysis/google-transparent-analysis-ai-topic-routing-v2-provider";
import { expectedTransparentAnalysisAiTopicRoutingV2Output } from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2-evaluation";
import {
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PANELS,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2-fixtures";
import {
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_OUTPUT_SCHEMA,
	buildTransparentAnalysisAiTopicRoutingV2Input,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2";
import {
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROMPT,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROMPT_SHA256,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2-prompt";

describe("transparent analysis AI topic routing v2 prompt and Google adapter", () => {
	it("freezes the topic-only prompt, schema, and pacing protocol", () => {
		assert.equal(
			createHash("sha256")
				.update(TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROMPT)
				.digest("hex"),
			TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROMPT_SHA256,
		);
		assert.equal(
			TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL.outputSchema,
			TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_OUTPUT_SCHEMA,
		);
		assert.equal(TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL.minimumStartIntervalMs, 6_100);
		assert.match(TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROMPT, /smallest exact topic set/);
		assert.match(TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROMPT, /untrusted data/);
		assert.match(TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROMPT, /route "prohibited"/);
		assert.doesNotMatch(TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROMPT, /factIds/);
	});

	it("sends only the minimized topic input and frozen schema through Google", async () => {
		const fixture = TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES.find(
			({ id }) => id === "v2-topic-rsi-1",
		);
		assert.ok(fixture);
		const built = buildTransparentAnalysisAiTopicRoutingV2Input({
			panel: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PANELS[fixture.panelId],
			question: fixture.question,
		});
		assert.equal(built.ok, true);
		if (!built.ok) throw new Error("Expected a valid frozen v2 input");
		const expectedOutput = expectedTransparentAnalysisAiTopicRoutingV2Output(fixture);
		let requestCount = 0;
		const provider = new GoogleTransparentAnalysisAiTopicRoutingV2Provider({
			apiKey: "synthetic-key",
			fetchImplementation: async (url, init) => {
				requestCount += 1;
				assert.match(
					String(url),
					new RegExp(GOOGLE_TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_CANDIDATE.model),
				);
				const body = JSON.parse(String(init?.body));
				assert.equal(
					body.systemInstruction.parts[0].text,
					TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROMPT,
				);
				const sentInput = JSON.parse(body.contents[0].parts[0].text);
				assert.deepEqual(Object.keys(sentInput).sort(), ["question", "topics", "version"]);
				assert.equal(sentInput.question, fixture.question);
				assert.ok(body.generationConfig.responseJsonSchema.properties.topicIds);
				assert.equal(body.generationConfig.responseJsonSchema.properties.factIds, undefined);
				return new Response(JSON.stringify({
					candidates: [{ content: { parts: [{ text: JSON.stringify(expectedOutput) }] } }],
					usageMetadata: { promptTokenCount: 90, candidatesTokenCount: 10 },
				}), { status: 200 });
			},
		});

		const result = await provider.generateForEvaluation({
			input: built.input,
			signal: new AbortController().signal,
		});
		assert.equal(requestCount, 1);
		assert.deepEqual(result.output, expectedOutput);
		assert.deepEqual(result.usage, { inputTokens: 90, outputTokens: 10, costUsd: 0 });
	});
});
