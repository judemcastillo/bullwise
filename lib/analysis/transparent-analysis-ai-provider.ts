import {
	buildTransparentAnalysisAiInput,
	type TransparentAnalysisAiExplanation,
	type TransparentAnalysisAiInput,
	validateTransparentAnalysisAiExplanation,
} from "@/lib/analysis/transparent-analysis-ai-contract";
import {
	TRANSPARENT_ANALYSIS_AI_PROMPT_SHA256,
	TRANSPARENT_ANALYSIS_AI_PROMPT_VERSION,
	TRANSPARENT_ANALYSIS_AI_SYSTEM_PROMPT,
	TRANSPARENT_ANALYSIS_AI_OUTPUT_SCHEMA,
} from "@/lib/analysis/transparent-analysis-ai-prompt";
import type { AnalysisPanelResponse } from "@/lib/analysis/transparent-analysis-panel.types";

export type TransparentAnalysisAiProviderRequest = {
	promptVersion: string;
	promptSha256: string;
	systemPrompt: string;
	outputSchema: Record<string, unknown>;
	input: TransparentAnalysisAiInput;
	signal: AbortSignal;
};

export interface TransparentAnalysisAiProvider {
	generate(request: TransparentAnalysisAiProviderRequest): Promise<unknown>;
}

export type TransparentAnalysisAiMeasuredGeneration = {
	output: unknown;
	usage: {
		inputTokens: number;
		outputTokens: number;
		costUsd: number;
	};
};

export type TransparentAnalysisAiGenerationResult =
	| {
			kind: "not_requested";
			panel: AnalysisPanelResponse;
			reason: "analysis_unavailable";
	  }
	| {
			kind: "ready";
			panel: AnalysisPanelResponse;
			explanation: TransparentAnalysisAiExplanation;
	  }
	| {
			kind: "fallback";
			panel: AnalysisPanelResponse;
			reason: "provider_failure" | "invalid_output";
	  };

function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
	if (signal.aborted) return Promise.reject(signal.reason);
	return new Promise<T>((resolve, reject) => {
		const abort = () => reject(signal.reason);
		signal.addEventListener("abort", abort, { once: true });
		promise.then(resolve, reject).finally(() => {
			signal.removeEventListener("abort", abort);
		});
	});
}

export async function generateTransparentAnalysisAiExplanation(input: {
	panel: AnalysisPanelResponse;
	provider: TransparentAnalysisAiProvider;
	timeoutMs?: number;
}): Promise<TransparentAnalysisAiGenerationResult> {
	const modelInput = buildTransparentAnalysisAiInput(input.panel);
	if (!modelInput) {
		return {
			kind: "not_requested",
			panel: input.panel,
			reason: "analysis_unavailable",
		};
	}

	let output: unknown;
	try {
		const signal = AbortSignal.timeout(input.timeoutMs ?? 5_000);
		output = await withAbort(input.provider.generate({
			promptVersion: TRANSPARENT_ANALYSIS_AI_PROMPT_VERSION,
			promptSha256: TRANSPARENT_ANALYSIS_AI_PROMPT_SHA256,
			systemPrompt: TRANSPARENT_ANALYSIS_AI_SYSTEM_PROMPT,
			outputSchema: TRANSPARENT_ANALYSIS_AI_OUTPUT_SCHEMA,
			input: modelInput,
			signal,
		}), signal);
	} catch {
		return { kind: "fallback", panel: input.panel, reason: "provider_failure" };
	}

	const validated = validateTransparentAnalysisAiExplanation(modelInput, output);
	if (!validated.ok) {
		return { kind: "fallback", panel: input.panel, reason: "invalid_output" };
	}
	return {
		kind: "ready",
		panel: input.panel,
		explanation: validated.value,
	};
}
