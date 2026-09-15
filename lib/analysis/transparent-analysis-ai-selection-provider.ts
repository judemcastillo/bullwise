import {
	buildTransparentAnalysisAiInput,
	type TransparentAnalysisAiExplanation,
} from "@/lib/analysis/transparent-analysis-ai-contract";
import type {
	TransparentAnalysisAiProvider,
	TransparentAnalysisAiProviderRequest,
} from "@/lib/analysis/transparent-analysis-ai-provider";
import {
	renderTransparentAnalysisAiSelection,
	type TransparentAnalysisAiSelection,
	validateTransparentAnalysisAiSelection,
} from "@/lib/analysis/transparent-analysis-ai-selection-contract";
import { TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROTOCOL } from "@/lib/analysis/transparent-analysis-ai-selection-v1-5";
import type { AnalysisPanelResponse } from "@/lib/analysis/transparent-analysis-panel.types";

export type TransparentAnalysisAiSelectionGenerationResult =
	| {
			kind: "not_requested";
			panel: AnalysisPanelResponse;
			reason: "analysis_unavailable";
	  }
	| {
			kind: "ready";
			panel: AnalysisPanelResponse;
			selection: TransparentAnalysisAiSelection;
			explanation: TransparentAnalysisAiExplanation;
	  }
	| {
			kind: "fallback";
			panel: AnalysisPanelResponse;
			reason: "provider_failure" | "invalid_output";
	  };

export async function generateTransparentAnalysisAiSelectedExplanation(input: {
	panel: AnalysisPanelResponse;
	provider: TransparentAnalysisAiProvider;
	timeoutMs?: number | null;
}): Promise<TransparentAnalysisAiSelectionGenerationResult> {
	const modelInput = buildTransparentAnalysisAiInput(input.panel);
	if (!modelInput) {
		return {
			kind: "not_requested",
			panel: input.panel,
			reason: "analysis_unavailable",
		};
	}

	const signal = input.timeoutMs === null
		? new AbortController().signal
		: AbortSignal.timeout(input.timeoutMs ?? 5_000);
	let output: unknown;
	try {
		output = await input.provider.generate({
			promptVersion: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROTOCOL.promptVersion,
			promptSha256: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROTOCOL.promptSha256,
			systemPrompt: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROTOCOL.systemPrompt,
			outputSchema: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROTOCOL.outputSchema,
			input: modelInput,
			signal,
		} satisfies TransparentAnalysisAiProviderRequest);
	} catch {
		return { kind: "fallback", panel: input.panel, reason: "provider_failure" };
	}

	const validation = validateTransparentAnalysisAiSelection(modelInput, output);
	if (!validation.ok) {
		return { kind: "fallback", panel: input.panel, reason: "invalid_output" };
	}
	return {
		kind: "ready",
		panel: input.panel,
		selection: validation.value,
		explanation: renderTransparentAnalysisAiSelection(modelInput, validation.value),
	};
}
