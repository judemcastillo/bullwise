import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
	GOOGLE_TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_CANDIDATE,
	GoogleTransparentAnalysisAiQuestionRoutingProvider,
} from "@/lib/analysis/google-transparent-analysis-ai-question-routing-provider";
import {
	expectedTransparentAnalysisAiQuestionRoutingOutput,
} from "@/lib/analysis/transparent-analysis-ai-question-routing-evaluation";
import { TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_FIXTURES } from "@/lib/analysis/transparent-analysis-ai-question-routing-fixtures";
import {
	buildTransparentAnalysisAiQuestionRoutingInput,
	TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_OUTPUT_SCHEMA,
} from "@/lib/analysis/transparent-analysis-ai-question-routing";
import {
	TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROMPT,
	TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROMPT_SHA256,
	TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROTOCOL,
} from "@/lib/analysis/transparent-analysis-ai-question-routing-prompt";

describe("transparent analysis AI question-routing prompt and Google adapter", () => {
	it("freezes the ID-only prompt, schema, and pacing protocol", () => {
		assert.equal(
			createHash("sha256")
				.update(TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROMPT)
				.digest("hex"),
			TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROMPT_SHA256,
		);
		assert.equal(
			TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROTOCOL.outputSchema,
			TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_OUTPUT_SCHEMA,
		);
		assert.equal(TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROTOCOL.minimumStartIntervalMs, 6_100);
		assert.match(TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROMPT, /Return IDs only/);
		assert.match(TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROMPT, /untrusted data/);
		assert.match(TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROMPT, /route "prohibited"/);
	});

	it("sends the frozen prompt and schema through the reusable Google transport", async () => {
		const fixture = TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_FIXTURES.find(
			(fixture) => fixture.kind === "generation" && fixture.id === "glossary-momentum",
		);
		assert.ok(fixture && fixture.kind === "generation");
		const built = buildTransparentAnalysisAiQuestionRoutingInput({
			panel: fixture.panel,
			question: fixture.question,
		});
		assert.equal(built.ok, true);
		if (!built.ok) throw new Error("Expected a valid frozen input.");
		const expectedOutput = expectedTransparentAnalysisAiQuestionRoutingOutput(fixture);
		let requestCount = 0;
		const provider = new GoogleTransparentAnalysisAiQuestionRoutingProvider({
			apiKey: "synthetic-key",
			fetchImplementation: async (url, init) => {
				requestCount += 1;
				assert.match(String(url), new RegExp(GOOGLE_TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_CANDIDATE.model));
				const body = JSON.parse(String(init?.body));
				assert.equal(
					body.systemInstruction.parts[0].text,
					TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROMPT,
				);
				assert.equal(
					JSON.parse(body.contents[0].parts[0].text).question,
					fixture.question,
				);
				assert.ok(body.generationConfig.responseJsonSchema.properties.limitationIds);
				return new Response(JSON.stringify({
					candidates: [{ content: { parts: [{ text: JSON.stringify(expectedOutput) }] } }],
					usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 12 },
				}), { status: 200 });
			},
		});

		const result = await provider.generateForEvaluation({
			input: built.input,
			signal: new AbortController().signal,
		});
		assert.equal(requestCount, 1);
		assert.deepEqual(result.output, expectedOutput);
		assert.deepEqual(result.usage, { inputTokens: 100, outputTokens: 12, costUsd: 0 });
	});
});
