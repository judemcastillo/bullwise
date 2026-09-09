import type { AnalysisPanelResponse } from "@/lib/analysis/transparent-analysis-panel.types";
import {
	buildTransparentAnalysisAiTopicRoutingV2Input,
	expandTransparentAnalysisAiTopicRoutingV2,
	validateTransparentAnalysisAiTopicRoutingV2Output,
	type TransparentAnalysisAiTopicRoutingV2BuildResult,
	type TransparentAnalysisAiTopicRoutingV2Input,
	type TransparentAnalysisAiTopicRoutingV2RenderedAnswer,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2";

export type TransparentAnalysisAiTopicRoutingV2ProviderRequest = {
	input: TransparentAnalysisAiTopicRoutingV2Input;
	signal: AbortSignal;
};

export interface TransparentAnalysisAiTopicRoutingV2Provider {
	generate(request: TransparentAnalysisAiTopicRoutingV2ProviderRequest): Promise<unknown>;
}

export type TransparentAnalysisAiTopicRoutingV2GenerationResult =
	| {
			kind: "not_requested";
			reason: Exclude<
				Extract<TransparentAnalysisAiTopicRoutingV2BuildResult, { ok: false }>["reason"],
				"prohibited"
			>;
	  }
	| { kind: "local_prohibited"; answer: TransparentAnalysisAiTopicRoutingV2RenderedAnswer }
	| { kind: "ready"; answer: TransparentAnalysisAiTopicRoutingV2RenderedAnswer }
	| { kind: "fallback"; reason: "provider_failure" | "invalid_output" };

export async function generateTransparentAnalysisAiTopicRoutingV2Answer(input: {
	panel: AnalysisPanelResponse;
	question: unknown;
	provider: TransparentAnalysisAiTopicRoutingV2Provider;
	signal?: AbortSignal;
}): Promise<TransparentAnalysisAiTopicRoutingV2GenerationResult> {
	const built = buildTransparentAnalysisAiTopicRoutingV2Input({
		panel: input.panel,
		question: input.question,
	});
	if (!built.ok) {
		if (built.reason !== "prohibited") {
			return { kind: "not_requested", reason: built.reason };
		}
		const expanded = expandTransparentAnalysisAiTopicRoutingV2(input.panel, {
			version: "2.0.0",
			route: "prohibited",
			topicIds: [],
		});
		if (!expanded.ok) return { kind: "not_requested", reason: expanded.reason };
		return { kind: "local_prohibited", answer: expanded.value };
	}

	let output: unknown;
	try {
		output = await input.provider.generate({
			input: built.input,
			signal: input.signal ?? new AbortController().signal,
		});
	} catch {
		return { kind: "fallback", reason: "provider_failure" };
	}
	const validated = validateTransparentAnalysisAiTopicRoutingV2Output(built.input, output);
	if (!validated.ok) return { kind: "fallback", reason: "invalid_output" };
	const expanded = expandTransparentAnalysisAiTopicRoutingV2(input.panel, validated.value);
	if (!expanded.ok) return { kind: "fallback", reason: "invalid_output" };
	return { kind: "ready", answer: expanded.value };
}
