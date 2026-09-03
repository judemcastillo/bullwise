import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
	buildTransparentAnalysisAiInput,
	type TransparentAnalysisAiInput,
} from "@/lib/analysis/transparent-analysis-ai-contract";
import { TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES } from "@/lib/analysis/transparent-analysis-ai-fixtures";
import {
	TRANSPARENT_ANALYSIS_AI_PROMPT_SHA256,
	TRANSPARENT_ANALYSIS_AI_SYSTEM_PROMPT,
	TRANSPARENT_ANALYSIS_AI_OUTPUT_SCHEMA,
} from "@/lib/analysis/transparent-analysis-ai-prompt";
import {
	generateTransparentAnalysisAiExplanation,
	type TransparentAnalysisAiProvider,
} from "@/lib/analysis/transparent-analysis-ai-provider";

const DISCLAIMER = "Descriptive market context—not investment advice or a trading signal.";

function validOutput(input: TransparentAnalysisAiInput) {
	const explanation = (factor: keyof TransparentAnalysisAiInput["factors"]) => ({
		factor,
		state: input.factors[factor].state,
		explanation: {
			text: input.factors[factor].facts[0].text,
			factIds: [input.factors[factor].facts[0].id],
		},
	});
	return {
		version: "1.0.0",
		context: input.context,
		overview: {
			text: input.factors.trend.facts[0].text,
			factIds: [input.factors.trend.facts[0].id],
		},
		factors: [
			explanation("trend"),
			explanation("momentum"),
			explanation("volatility"),
			explanation("participation"),
		],
		limitations: input.limitations,
		disclaimer: DISCLAIMER,
	};
}

describe("transparent analysis AI provider boundary", () => {
	it("freezes the exact system prompt with a checksum", () => {
		assert.equal(
			createHash("sha256").update(TRANSPARENT_ANALYSIS_AI_SYSTEM_PROMPT).digest("hex"),
			TRANSPARENT_ANALYSIS_AI_PROMPT_SHA256,
		);
	});

	it("accepts only provider output that passes the deterministic validator", async () => {
		const panel = TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES[0].panel;
		let calls = 0;
		const provider: TransparentAnalysisAiProvider = {
			generate: async (request) => {
				calls += 1;
				assert.deepEqual(request.input, buildTransparentAnalysisAiInput(panel));
				assert.equal(request.outputSchema, TRANSPARENT_ANALYSIS_AI_OUTPUT_SCHEMA);
				assert.equal(request.signal.aborted, false);
				return validOutput(request.input);
			},
		};
		const result = await generateTransparentAnalysisAiExplanation({ panel, provider });

		assert.equal(calls, 1);
		assert.equal(result.kind, "ready");
		assert.equal(result.panel, panel);
	});

	it("does not call a provider for unavailable analysis", async () => {
		const panel = TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES.find(
			({ kind }) => kind === "unavailable_input",
		)!.panel;
		let calls = 0;
		const result = await generateTransparentAnalysisAiExplanation({
			panel,
			provider: { generate: async () => { calls += 1; } },
		});
		assert.equal(calls, 0);
		assert.deepEqual(result, {
			kind: "not_requested",
			panel,
			reason: "analysis_unavailable",
		});
	});

	it("falls back to the unchanged panel on provider or validation failure", async () => {
		const panel = TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES[0].panel;
		const providerFailure = await generateTransparentAnalysisAiExplanation({
			panel,
			provider: { generate: async () => { throw new Error("SECRET provider body"); } },
		});
		const invalidOutput = await generateTransparentAnalysisAiExplanation({
			panel,
			provider: { generate: async () => ({ advice: "buy" }) },
		});

		assert.deepEqual(providerFailure, {
			kind: "fallback",
			panel,
			reason: "provider_failure",
		});
		assert.deepEqual(invalidOutput, {
			kind: "fallback",
			panel,
			reason: "invalid_output",
		});
		assert.doesNotMatch(JSON.stringify([providerFailure, invalidOutput]), /SECRET|buy/);
	});

	it("enforces the timeout even when a provider ignores its abort signal", async () => {
		const panel = TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES[0].panel;
		const result = await generateTransparentAnalysisAiExplanation({
			panel,
			provider: { generate: () => new Promise(() => undefined) },
			timeoutMs: 5,
		});
		assert.deepEqual(result, {
			kind: "fallback",
			panel,
			reason: "provider_failure",
		});
	});

	it("freezes exactly 32 unique fixtures with every required boundary class", () => {
		assert.equal(TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES.length, 32);
		assert.equal(
			new Set(TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES.map(({ id }) => id)).size,
			32,
		);
		for (const kind of [
			"generation",
			"unavailable_input",
			"provider_failure",
			"invalid_output",
		] as const) {
			assert.ok(
				TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES.some(
					(fixture) => fixture.kind === kind,
				),
			);
		}
		assert.equal(
			new Set(
				TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES.filter(
					({ mutation }) => mutation,
				).map(({ mutation }) => mutation),
			).size,
			8,
		);
	});
});
