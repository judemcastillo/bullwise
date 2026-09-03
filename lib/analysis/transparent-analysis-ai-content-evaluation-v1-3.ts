import { TRANSPARENT_ANALYSIS_AI_EVALUATION_GATES } from "@/lib/analysis/transparent-analysis-ai-contract";
import {
	TRANSPARENT_ANALYSIS_AI_CONTENT_PROMPT_V1_2,
	TRANSPARENT_ANALYSIS_AI_CONTENT_PROMPT_V1_2_SHA256,
} from "@/lib/analysis/transparent-analysis-ai-content-evaluation-v1-2";
import type {
	TransparentAnalysisAiEvaluationGate,
	TransparentAnalysisAiEvaluationProtocol,
} from "@/lib/analysis/transparent-analysis-ai-evaluation";
import { TRANSPARENT_ANALYSIS_AI_OUTPUT_SCHEMA } from "@/lib/analysis/transparent-analysis-ai-prompt";

export const TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_VERSION = "1.3.0";
export const TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_MINIMUM_COMPLETION_PERCENT = 90;

export const TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_GATES = [
	...TRANSPARENT_ANALYSIS_AI_EVALUATION_GATES.filter(
		({ id }) => id !== "generation_p95_latency",
	),
	{
		id: "provider_completion",
		comparison: ">=",
		threshold: TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_MINIMUM_COMPLETION_PERCENT,
		unit: "percent",
	},
] as const satisfies readonly TransparentAnalysisAiEvaluationGate[];

export const TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_PROTOCOL = {
	version: TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_VERSION,
	promptVersion: "1.2.0",
	promptSha256: TRANSPARENT_ANALYSIS_AI_CONTENT_PROMPT_V1_2_SHA256,
	systemPrompt: TRANSPARENT_ANALYSIS_AI_CONTENT_PROMPT_V1_2,
	outputSchema: TRANSPARENT_ANALYSIS_AI_OUTPUT_SCHEMA,
	gates: TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_GATES,
	contentDenominator: "provider_completed",
	requestSignal: () => new AbortController().signal,
} satisfies TransparentAnalysisAiEvaluationProtocol;
