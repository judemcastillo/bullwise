import {
	buildTransparentAnalysisAiInput,
	type TransparentAnalysisAiExplanation,
} from "@/lib/analysis/transparent-analysis-ai-contract";
import type { TransparentAnalysisAiProvider } from "@/lib/analysis/transparent-analysis-ai-provider";
import {
	renderTransparentAnalysisAiSelection,
} from "@/lib/analysis/transparent-analysis-ai-selection-contract";
import {
	buildTransparentAnalysisAiSelectionV16Input,
	TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROTOCOL,
	validateTransparentAnalysisAiSelectionV16,
} from "@/lib/analysis/transparent-analysis-ai-selection-v1-6";
import type { AnalysisPanelResponse } from "@/lib/analysis/transparent-analysis-panel.types";

export type TransparentAnalysisAiProductionResult =
	| { kind: "not_requested"; reason: "analysis_unavailable" }
	| { kind: "fallback"; reason: "provider_failure" | "invalid_output" }
	| { kind: "ready"; explanation: TransparentAnalysisAiExplanation };

export async function generateTransparentAnalysisAiProductionOverview(input: {
	panel: AnalysisPanelResponse;
	provider: TransparentAnalysisAiProvider;
	signal: AbortSignal;
}): Promise<TransparentAnalysisAiProductionResult> {
	const baseInput = buildTransparentAnalysisAiInput(input.panel);
	if (!baseInput) {
		return { kind: "not_requested", reason: "analysis_unavailable" };
	}

	const modelInput = buildTransparentAnalysisAiSelectionV16Input(baseInput);
	let output: unknown;
	try {
		output = await input.provider.generate({
			promptVersion: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROTOCOL.promptVersion,
			promptSha256: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROTOCOL.promptSha256,
			systemPrompt: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROTOCOL.systemPrompt,
			outputSchema: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROTOCOL.outputSchema,
			input: modelInput,
			signal: input.signal,
		});
	} catch {
		return { kind: "fallback", reason: "provider_failure" };
	}

	const validation = validateTransparentAnalysisAiSelectionV16(modelInput, output);
	if (!validation.ok) {
		return { kind: "fallback", reason: "invalid_output" };
	}

	return {
		kind: "ready",
		explanation: renderTransparentAnalysisAiSelection(
			modelInput,
			validation.value,
		),
	};
}
