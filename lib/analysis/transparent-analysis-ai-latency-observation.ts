import {
	buildTransparentAnalysisAiInput,
	validateTransparentAnalysisAiExplanation,
} from "@/lib/analysis/transparent-analysis-ai-contract";
import { TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES } from "@/lib/analysis/transparent-analysis-ai-fixtures";
import {
	TRANSPARENT_ANALYSIS_AI_OUTPUT_SCHEMA,
	TRANSPARENT_ANALYSIS_AI_PROMPT_SHA256,
	TRANSPARENT_ANALYSIS_AI_PROMPT_VERSION,
	TRANSPARENT_ANALYSIS_AI_SYSTEM_PROMPT,
} from "@/lib/analysis/transparent-analysis-ai-prompt";
import type {
	TransparentAnalysisAiMeasuredGeneration,
	TransparentAnalysisAiProviderRequest,
} from "@/lib/analysis/transparent-analysis-ai-provider";

export const TRANSPARENT_ANALYSIS_AI_LATENCY_OBSERVATION_VERSION = "1.0.0";

export type TransparentAnalysisAiLatencyGenerator = (
	request: TransparentAnalysisAiProviderRequest,
) => Promise<TransparentAnalysisAiMeasuredGeneration>;

function percentile(values: number[], percentileValue: number) {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.ceil(sorted.length * percentileValue) - 1];
}

function latencySummary(values: number[]) {
	return {
		minimum: values.length === 0 ? null : Math.min(...values),
		mean: values.length === 0
			? null
			: values.reduce((sum, duration) => sum + duration, 0) / values.length,
		p50: percentile(values, 0.5),
		p90: percentile(values, 0.9),
		p95: percentile(values, 0.95),
		maximum: values.length === 0 ? null : Math.max(...values),
	};
}

export async function observeTransparentAnalysisAiLatency(input: {
	model: string;
	generate: TransparentAnalysisAiLatencyGenerator;
	now?: () => number;
}) {
	const now = input.now ?? (() => performance.now());
	const fixtures = TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES.filter(
		({ kind }) => kind === "generation",
	);
	const requests = [];

	for (const fixture of fixtures) {
		const modelInput = buildTransparentAnalysisAiInput(fixture.panel);
		if (!modelInput) throw new Error("Frozen generation fixture unexpectedly unavailable");
		const startedAt = now();
		try {
			const generation = await input.generate({
				promptVersion: TRANSPARENT_ANALYSIS_AI_PROMPT_VERSION,
				promptSha256: TRANSPARENT_ANALYSIS_AI_PROMPT_SHA256,
				systemPrompt: TRANSPARENT_ANALYSIS_AI_SYSTEM_PROMPT,
				outputSchema: TRANSPARENT_ANALYSIS_AI_OUTPUT_SCHEMA,
				input: modelInput,
				signal: new AbortController().signal,
			});
			const validation = validateTransparentAnalysisAiExplanation(
				modelInput,
				generation.output,
			);
			requests.push({
				fixtureId: fixture.id,
				durationMs: now() - startedAt,
				outcome: validation.ok ? "valid_output" as const : "invalid_output" as const,
				issueCodes: validation.ok ? [] : validation.issueCodes,
				usage: generation.usage,
			});
		} catch {
			requests.push({
				fixtureId: fixture.id,
				durationMs: now() - startedAt,
				outcome: "provider_failure" as const,
				issueCodes: [],
				usage: null,
			});
		}
	}

	const durations = requests.map(({ durationMs }) => durationMs);
	const completed = requests.filter(({ outcome }) => outcome !== "provider_failure");
	const completedDurations = completed.map(({ durationMs }) => durationMs);
	return {
		version: TRANSPARENT_ANALYSIS_AI_LATENCY_OBSERVATION_VERSION,
		model: input.model,
		promptVersion: TRANSPARENT_ANALYSIS_AI_PROMPT_VERSION,
		promptSha256: TRANSPARENT_ANALYSIS_AI_PROMPT_SHA256,
		applicationTimeoutEnabled: false,
		requestCount: requests.length,
		completedCount: completed.length,
		validOutputCount: requests.filter(({ outcome }) => outcome === "valid_output").length,
		invalidOutputCount: requests.filter(({ outcome }) => outcome === "invalid_output").length,
		providerFailureCount: requests.filter(({ outcome }) => outcome === "provider_failure").length,
		latencyMs: {
			completedRequests: latencySummary(completedDurations),
			allRequests: latencySummary(durations),
		},
		requests,
	};
}
