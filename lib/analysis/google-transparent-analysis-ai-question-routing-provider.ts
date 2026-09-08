import {
	GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE,
	GoogleTransparentAnalysisAiProvider,
	type GoogleTransparentAnalysisAiFetchImplementation,
} from "@/lib/analysis/google-transparent-analysis-ai-provider";
import type { TransparentAnalysisAiQuestionRoutingMeasuredGeneration } from "@/lib/analysis/transparent-analysis-ai-question-routing-evaluation";
import type {
	TransparentAnalysisAiQuestionRoutingProvider,
	TransparentAnalysisAiQuestionRoutingProviderRequest,
} from "@/lib/analysis/transparent-analysis-ai-question-routing-provider";
import { TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROTOCOL } from "@/lib/analysis/transparent-analysis-ai-question-routing-prompt";

export const GOOGLE_TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_CANDIDATE =
	GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE;

export class GoogleTransparentAnalysisAiQuestionRoutingProvider
	implements TransparentAnalysisAiQuestionRoutingProvider
{
	private readonly provider: GoogleTransparentAnalysisAiProvider;

	constructor(input: {
		apiKey: string;
		fetchImplementation?: GoogleTransparentAnalysisAiFetchImplementation;
	}) {
		this.provider = new GoogleTransparentAnalysisAiProvider(input);
	}

	async generate(request: TransparentAnalysisAiQuestionRoutingProviderRequest) {
		return (await this.generateForEvaluation(request)).output;
	}

	generateForEvaluation(
		request: TransparentAnalysisAiQuestionRoutingProviderRequest,
	): Promise<TransparentAnalysisAiQuestionRoutingMeasuredGeneration> {
		return this.provider.generateForEvaluation({
			promptVersion: TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROTOCOL.promptVersion,
			promptSha256: TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROTOCOL.promptSha256,
			systemPrompt: TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROTOCOL.systemPrompt,
			outputSchema: TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROTOCOL.outputSchema,
			input: request.input,
			signal: request.signal,
		});
	}
}
