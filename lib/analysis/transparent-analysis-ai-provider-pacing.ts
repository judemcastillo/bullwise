import type { TransparentAnalysisAiProviderReliabilityGenerator } from "@/lib/analysis/transparent-analysis-ai-provider-reliability";
import { observeTransparentAnalysisAiProviderReliability } from "@/lib/analysis/transparent-analysis-ai-provider-reliability";

export const TRANSPARENT_ANALYSIS_AI_PROVIDER_PACING_VERSION = "1.0.0";
export const TRANSPARENT_ANALYSIS_AI_PROVIDER_PACING_INTERVAL_MS = 6_100;
export const TRANSPARENT_ANALYSIS_AI_PROVIDER_PACING_MINIMUM_OBSERVED_INTERVAL_MS = 6_000;
export const TRANSPARENT_ANALYSIS_AI_PROVIDER_PACING_MINIMUM_COMPLETION_PERCENT = 90;

export async function evaluateTransparentAnalysisAiProviderPacing(input: {
	model: string;
	generate: TransparentAnalysisAiProviderReliabilityGenerator;
	now?: () => number;
	wait?: (milliseconds: number) => Promise<void>;
}) {
	const observation = await observeTransparentAnalysisAiProviderReliability({
		...input,
		minimumStartIntervalMs: TRANSPARENT_ANALYSIS_AI_PROVIDER_PACING_INTERVAL_MS,
	});
	const startIntervals = observation.requests
		.map(({ startedAfterPreviousMs }) => startedAfterPreviousMs)
		.filter((value): value is number => value !== null);
	const minimumObservedStartIntervalMs = startIntervals.length === 0
		? 0
		: Math.min(...startIntervals);
	const completionPercent = observation.requestCount === 0
		? 0
		: (observation.completedCount / observation.requestCount) * 100;
	const gates = [
		{
			id: "provider_completion",
			comparison: ">=" as const,
			threshold: TRANSPARENT_ANALYSIS_AI_PROVIDER_PACING_MINIMUM_COMPLETION_PERCENT,
			unit: "percent" as const,
			value: completionPercent,
			passed: completionPercent >= TRANSPARENT_ANALYSIS_AI_PROVIDER_PACING_MINIMUM_COMPLETION_PERCENT,
		},
		{
			id: "rate_limited_failures",
			comparison: "=" as const,
			threshold: 0,
			unit: "count" as const,
			value: observation.failureCounts.rate_limited,
			passed: observation.failureCounts.rate_limited === 0,
		},
		{
			id: "minimum_request_start_interval",
			comparison: ">=" as const,
			threshold: TRANSPARENT_ANALYSIS_AI_PROVIDER_PACING_MINIMUM_OBSERVED_INTERVAL_MS,
			unit: "milliseconds" as const,
			value: minimumObservedStartIntervalMs,
			passed: minimumObservedStartIntervalMs >=
				TRANSPARENT_ANALYSIS_AI_PROVIDER_PACING_MINIMUM_OBSERVED_INTERVAL_MS,
		},
	];

	return {
		version: TRANSPARENT_ANALYSIS_AI_PROVIDER_PACING_VERSION,
		decision: gates.every(({ passed }) => passed)
			? "pacing_supported" as const
			: "pacing_not_supported" as const,
		gates,
		observation,
	};
}
