import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTransparentAnalysisAiInput } from "@/lib/analysis/transparent-analysis-ai-contract";
import { TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES } from "@/lib/analysis/transparent-analysis-ai-fixtures";
import {
	GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE,
	GoogleTransparentAnalysisAiProvider,
} from "@/lib/analysis/google-transparent-analysis-ai-provider";
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

describe("Google transparent analysis local adapter", () => {
	it("uses only the stable free-tier candidate and a JSON response schema", async () => {
		let url = "";
		let sent: Record<string, unknown> | undefined;
		const provider = new GoogleTransparentAnalysisAiProvider({
			apiKey: "test-key",
			fetchImplementation: async (input, init) => {
				url = String(input);
				sent = JSON.parse(String(init?.body));
				return new Response(JSON.stringify({
					candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
					usageMetadata: { promptTokenCount: 1_000, candidatesTokenCount: 500 },
				}), { status: 200, headers: { "Content-Type": "application/json" } });
			},
		});

		const result = await provider.generateForEvaluation(request());
		assert.deepEqual(result.output, { ok: true });
		assert.equal(result.usage.costUsd, 0);
		assert.match(url, new RegExp(GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE.model));
		assert.doesNotMatch(url, /test-key/);
		assert.equal(JSON.stringify(sent).includes("uniqueItems"), false);
		assert.equal(JSON.stringify(sent).includes('"const"'), false);
		assert.equal(
			(sent?.generationConfig as { responseMimeType: string }).responseMimeType,
			"application/json",
		);
	});

	it("does not expose a provider response body in failures", async () => {
		const provider = new GoogleTransparentAnalysisAiProvider({
			apiKey: "test-key",
			fetchImplementation: async () =>
				new Response("secret provider body", { status: 429 }),
		});
		await assert.rejects(
			provider.generate(request()),
			(error: Error) =>
				error.message === "Gemini request failed (429)" &&
				!error.message.includes("secret provider body"),
		);
	});
});
