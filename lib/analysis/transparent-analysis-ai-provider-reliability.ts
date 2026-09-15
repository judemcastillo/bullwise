import { buildTransparentAnalysisAiInput } from "@/lib/analysis/transparent-analysis-ai-contract";
import { TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_PROTOCOL } from "@/lib/analysis/transparent-analysis-ai-content-evaluation-v1-2";
import { TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES } from "@/lib/analysis/transparent-analysis-ai-fixtures";
import {
	GoogleTransparentAnalysisAiProviderError,
	type GoogleTransparentAnalysisAiProviderFailureCategory,
} from "@/lib/analysis/google-transparent-analysis-ai-provider";
import type {
	TransparentAnalysisAiMeasuredGeneration,
	TransparentAnalysisAiProviderRequest,
} from "@/lib/analysis/transparent-analysis-ai-provider";

export const TRANSPARENT_ANALYSIS_AI_PROVIDER_RELIABILITY_VERSION = "1.0.0";

export type TransparentAnalysisAiProviderReliabilityGenerator = (
	request: TransparentAnalysisAiProviderRequest,
) => Promise<TransparentAnalysisAiMeasuredGeneration>;

const FAILURE_CATEGORIES: GoogleTransparentAnalysisAiProviderFailureCategory[] = [
	"transport_error",
	"rate_limited",
	"authentication_error",
	"server_error",
	"other_http_error",
	"response_not_json",
	"missing_output",
	"output_not_json",
];

function failure(error: unknown) {
	if (error instanceof GoogleTransparentAnalysisAiProviderError) {
		return {
			category: error.category,
			httpStatus: error.httpStatus,
			retryAfterSeconds: error.retryAfterSeconds,
		};
	}
	return {
		category: "unclassified_error" as const,
		httpStatus: null,
		retryAfterSeconds: null,
	};
}

export async function observeTransparentAnalysisAiProviderReliability(input: {
	model: string;
	generate: TransparentAnalysisAiProviderReliabilityGenerator;
	now?: () => number;
	wait?: (milliseconds: number) => Promise<void>;
	minimumStartIntervalMs?: number;
}) {
	const now = input.now ?? (() => performance.now());
	const wait = input.wait ?? ((milliseconds: number) =>
		new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
	const minimumStartIntervalMs = input.minimumStartIntervalMs ?? 0;
	if (!Number.isFinite(minimumStartIntervalMs) || minimumStartIntervalMs < 0) {
		throw new Error("Minimum request-start interval must be a non-negative number");
	}
	const fixtures = TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES.filter(
		({ kind }) => kind === "generation",
	);
	const requests = [];
	let previousStartedAt: number | null = null;

	for (const [index, fixture] of fixtures.entries()) {
		const modelInput = buildTransparentAnalysisAiInput(fixture.panel);
		if (!modelInput) throw new Error("Frozen generation fixture unexpectedly unavailable");
		if (previousStartedAt !== null) {
			const remainingDelay = minimumStartIntervalMs - (now() - previousStartedAt);
			if (remainingDelay > 0) await wait(remainingDelay);
		}
		const startedAt = now();
		const startedAfterPreviousMs = previousStartedAt === null
			? null
			: startedAt - previousStartedAt;
		previousStartedAt = startedAt;
		try {
			const generation = await input.generate({
				promptVersion: TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_PROTOCOL.promptVersion,
				promptSha256: TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_PROTOCOL.promptSha256,
				systemPrompt: TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_PROTOCOL.systemPrompt,
				outputSchema: TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_PROTOCOL.outputSchema,
				input: modelInput,
				signal: new AbortController().signal,
			});
			requests.push({
				sequence: index + 1,
				fixtureId: fixture.id,
				startedAfterPreviousMs,
				durationMs: now() - startedAt,
				outcome: "provider_completed" as const,
				failure: null,
				usage: generation.usage,
			});
		} catch (error) {
			requests.push({
				sequence: index + 1,
				fixtureId: fixture.id,
				startedAfterPreviousMs,
				durationMs: now() - startedAt,
				outcome: "provider_failure" as const,
				failure: failure(error),
				usage: null,
			});
		}
	}

	const failureCounts = Object.fromEntries([
		...FAILURE_CATEGORIES.map((category) => [category, 0]),
		["unclassified_error", 0],
	]) as Record<GoogleTransparentAnalysisAiProviderFailureCategory | "unclassified_error", number>;
	for (const request of requests) {
		if (request.failure) failureCounts[request.failure.category] += 1;
	}

	return {
		version: TRANSPARENT_ANALYSIS_AI_PROVIDER_RELIABILITY_VERSION,
		model: input.model,
		promptVersion: TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_PROTOCOL.promptVersion,
		promptSha256: TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_2_PROTOCOL.promptSha256,
		applicationTimeoutEnabled: false,
		retryEnabled: false,
		requestPacingDelayMs: minimumStartIntervalMs,
		requestCount: requests.length,
		completedCount: requests.filter(({ outcome }) => outcome === "provider_completed").length,
		providerFailureCount: requests.filter(({ outcome }) => outcome === "provider_failure").length,
		failureCounts,
		requests,
	};
}
