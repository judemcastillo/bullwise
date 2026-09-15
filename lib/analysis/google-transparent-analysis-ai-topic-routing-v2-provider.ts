import {
	GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE,
	GoogleTransparentAnalysisAiProvider,
	type GoogleTransparentAnalysisAiFetchImplementation,
} from "@/lib/analysis/google-transparent-analysis-ai-provider";
import type { TransparentAnalysisAiTopicRoutingV2MeasuredGeneration } from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2-evaluation";
import type {
	TransparentAnalysisAiTopicRoutingV2Provider,
	TransparentAnalysisAiTopicRoutingV2ProviderRequest,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2-provider";
import { TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL } from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2-prompt";

export const GOOGLE_TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_CANDIDATE =
	GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE;

export class GoogleTransparentAnalysisAiTopicRoutingV2Provider
	implements TransparentAnalysisAiTopicRoutingV2Provider
{
	private readonly provider: GoogleTransparentAnalysisAiProvider;

	constructor(input: {
		apiKey: string;
		fetchImplementation?: GoogleTransparentAnalysisAiFetchImplementation;
	}) {
		this.provider = new GoogleTransparentAnalysisAiProvider(input);
	}

	async generate(request: TransparentAnalysisAiTopicRoutingV2ProviderRequest) {
		return (await this.generateForEvaluation(request)).output;
	}

	generateForEvaluation(
		request: TransparentAnalysisAiTopicRoutingV2ProviderRequest,
	): Promise<TransparentAnalysisAiTopicRoutingV2MeasuredGeneration> {
		return this.provider.generateForEvaluation({
			promptVersion: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL.promptVersion,
			promptSha256: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL.promptSha256,
			systemPrompt: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL.systemPrompt,
			outputSchema: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL.outputSchema,
			input: request.input,
			signal: request.signal,
		});
	}
}
