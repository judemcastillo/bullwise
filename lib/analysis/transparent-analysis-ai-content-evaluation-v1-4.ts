import { TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_GATES } from "@/lib/analysis/transparent-analysis-ai-content-evaluation-v1-3";
import type {
	TransparentAnalysisAiEvaluationGate,
	TransparentAnalysisAiEvaluationProtocol,
} from "@/lib/analysis/transparent-analysis-ai-evaluation";
import {
	TRANSPARENT_ANALYSIS_AI_PROVIDER_PACING_INTERVAL_MS,
	TRANSPARENT_ANALYSIS_AI_PROVIDER_PACING_MINIMUM_OBSERVED_INTERVAL_MS,
} from "@/lib/analysis/transparent-analysis-ai-provider-pacing";
import {
	TRANSPARENT_ANALYSIS_AI_CONTENT_PROMPT_V1_2,
	TRANSPARENT_ANALYSIS_AI_CONTENT_PROMPT_V1_2_SHA256,
} from "@/lib/analysis/transparent-analysis-ai-content-evaluation-v1-2";
import { TRANSPARENT_ANALYSIS_AI_OUTPUT_SCHEMA } from "@/lib/analysis/transparent-analysis-ai-prompt";

export const TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_4_VERSION = "1.4.0";

export const TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_4_GATES = [
	...TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_3_GATES,
	{
		id: "minimum_request_start_interval",
		comparison: ">=",
		threshold: TRANSPARENT_ANALYSIS_AI_PROVIDER_PACING_MINIMUM_OBSERVED_INTERVAL_MS,
		unit: "milliseconds",
	},
] as const satisfies readonly TransparentAnalysisAiEvaluationGate[];

export const TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_4_PROTOCOL = {
	version: TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_4_VERSION,
	promptVersion: "1.2.0",
	promptSha256: TRANSPARENT_ANALYSIS_AI_CONTENT_PROMPT_V1_2_SHA256,
	systemPrompt: TRANSPARENT_ANALYSIS_AI_CONTENT_PROMPT_V1_2,
	outputSchema: TRANSPARENT_ANALYSIS_AI_OUTPUT_SCHEMA,
	gates: TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_4_GATES,
	contentDenominator: "provider_completed",
	minimumStartIntervalMs: TRANSPARENT_ANALYSIS_AI_PROVIDER_PACING_INTERVAL_MS,
	requestSignal: () => new AbortController().signal,
} satisfies TransparentAnalysisAiEvaluationProtocol;
