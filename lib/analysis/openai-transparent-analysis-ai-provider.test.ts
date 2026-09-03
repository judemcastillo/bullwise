import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTransparentAnalysisAiInput } from "@/lib/analysis/transparent-analysis-ai-contract";
import { TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES } from "@/lib/analysis/transparent-analysis-ai-fixtures";
import {
	OPENAI_TRANSPARENT_ANALYSIS_AI_CANDIDATES,
	OpenAiTransparentAnalysisAiProvider,
} from "@/lib/analysis/openai-transparent-analysis-ai-provider";
import {
	TRANSPARENT_ANALYSIS_AI_PROMPT_SHA256,
	TRANSPARENT_ANALYSIS_AI_PROMPT_VERSION,
	TRANSPARENT_ANALYSIS_AI_SYSTEM_PROMPT,
	TRANSPARENT_ANALYSIS_AI_OUTPUT_SCHEMA,
} from "@/lib/analysis/transparent-analysis-ai-prompt";
import type { TransparentAnalysisAiProviderRequest } from "@/lib/analysis/transparent-analysis-ai-provider";

function request(): TransparentAnalysisAiProviderRequest {
	const input = buildTransparentAnalysisAiInput(
		TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES[0].panel,
	);
	assert.ok(input);
	return {
		promptVersion: TRANSPARENT_ANALYSIS_AI_PROMPT_VERSION,
		promptSha256: TRANSPARENT_ANALYSIS_AI_PROMPT_SHA256,
		systemPrompt: TRANSPARENT_ANALYSIS_AI_SYSTEM_PROMPT,
		outputSchema: TRANSPARENT_ANALYSIS_AI_OUTPUT_SCHEMA,
		input,
		signal: new AbortController().signal,
	};
}

describe("OpenAI transparent analysis local adapter", () => {
	it("sends a non-stored strict structured-output request and measures cost", async () => {
		let sent: Record<string, unknown> | undefined;
		const candidate = OPENAI_TRANSPARENT_ANALYSIS_AI_CANDIDATES[0];
		const provider = new OpenAiTransparentAnalysisAiProvider({
			apiKey: "test-key",
			candidate,
			fetchImplementation: async (_url, init) => {
				sent = JSON.parse(String(init?.body));
				return new Response(
					JSON.stringify({
						status: "completed",
						output: [{ type: "message", content: [{ type: "output_text", text: '{"ok":true}' }] }],
						usage: { input_tokens: 1_000, output_tokens: 500 },
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				);
			},
		});

		const result = await provider.generateForEvaluation(request());
		assert.deepEqual(result.output, { ok: true });
		assert.equal(result.usage.costUsd, 0.0008);
		assert.equal(sent?.model, candidate.model);
		assert.equal(sent?.store, false);
		assert.equal(JSON.stringify(sent).includes("uniqueItems"), false);
		assert.deepEqual(
			(sent?.text as { format: Record<string, unknown> }).format.strict,
			true,
		);
	});

	it("returns only sanitized failures", async () => {
		const provider = new OpenAiTransparentAnalysisAiProvider({
			apiKey: "test-key",
			candidate: OPENAI_TRANSPARENT_ANALYSIS_AI_CANDIDATES[0],
			fetchImplementation: async () =>
				new Response("secret provider body", { status: 429 }),
		});
		await assert.rejects(
			provider.generate(request()),
			(error: Error) =>
				error.message === "OpenAI request failed" &&
				!error.message.includes("secret provider body"),
		);
	});
});
