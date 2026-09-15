import type { AnalysisPanelResponse } from "@/lib/analysis/transparent-analysis-panel.types";
import {
	buildTransparentAnalysisAiQuestionRoutingInput,
	renderTransparentAnalysisAiQuestionRoutingAnswer,
	validateTransparentAnalysisAiQuestionRoutingOutput,
	type TransparentAnalysisAiQuestionRenderedAnswer,
	type TransparentAnalysisAiQuestionRoutingBuildResult,
	type TransparentAnalysisAiQuestionRoutingInput,
} from "@/lib/analysis/transparent-analysis-ai-question-routing";

export type TransparentAnalysisAiQuestionRoutingProviderRequest = {
	input: TransparentAnalysisAiQuestionRoutingInput;
	signal: AbortSignal;
};

export interface TransparentAnalysisAiQuestionRoutingProvider {
	generate(request: TransparentAnalysisAiQuestionRoutingProviderRequest): Promise<unknown>;
}

export type TransparentAnalysisAiQuestionRoutingGenerationResult =
	| {
			kind: "not_requested";
			reason: Extract<TransparentAnalysisAiQuestionRoutingBuildResult, { ok: false }>["reason"];
	  }
	| {
			kind: "ready";
			answer: TransparentAnalysisAiQuestionRenderedAnswer;
	  }
	| {
			kind: "fallback";
			reason: "provider_failure" | "invalid_output";
	  };

export async function generateTransparentAnalysisAiQuestionRoutingAnswer(input: {
	panel: AnalysisPanelResponse;
	question: unknown;
	provider: TransparentAnalysisAiQuestionRoutingProvider;
	signal?: AbortSignal;
}): Promise<TransparentAnalysisAiQuestionRoutingGenerationResult> {
	const built = buildTransparentAnalysisAiQuestionRoutingInput({
		panel: input.panel,
		question: input.question,
	});
	if (!built.ok) return { kind: "not_requested", reason: built.reason };

	let output: unknown;
	try {
		output = await input.provider.generate({
			input: built.input,
			signal: input.signal ?? new AbortController().signal,
		});
	} catch {
		return { kind: "fallback", reason: "provider_failure" };
	}
	const validated = validateTransparentAnalysisAiQuestionRoutingOutput(built.input, output);
	if (!validated.ok) return { kind: "fallback", reason: "invalid_output" };
	return {
		kind: "ready",
		answer: renderTransparentAnalysisAiQuestionRoutingAnswer(built.input, validated.value),
	};
}
