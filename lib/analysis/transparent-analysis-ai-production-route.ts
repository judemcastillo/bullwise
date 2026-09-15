import type {
	TransparentAnalysisAiProductionResult,
	TransparentAnalysisAiSynthesis,
	TransparentAnalysisAiValidationIssue,
} from "@/lib/analysis/transparent-analysis-ai-production";
import type { TransparentAnalysisOrchestrationResult } from "@/lib/analysis/transparent-analysis-orchestrator";
import type { AnalysisPanelResponse } from "@/lib/analysis/transparent-analysis-panel.types";
import {
	buildTransparentAnalysisAiRequestTelemetry,
	type TransparentAnalysisAiRequestOutcome,
	type TransparentAnalysisTelemetryEvent,
} from "@/lib/analysis/transparent-analysis-telemetry";
import { AuthenticationError } from "@/lib/auth/access-policy";
import { parseCanonicalKeyRouteParam } from "@/lib/instruments/canonical-key";

export const TRANSPARENT_ANALYSIS_AI_RESPONSE_VERSION = "1.0.0";

export type TransparentAnalysisAiResponse =
	| {
			version: typeof TRANSPARENT_ANALYSIS_AI_RESPONSE_VERSION;
			status: "ready";
			synthesis: TransparentAnalysisAiSynthesis;
	  }
	| {
			version: typeof TRANSPARENT_ANALYSIS_AI_RESPONSE_VERSION;
			status: "unavailable";
			message: string;
	  };

export type TransparentAnalysisAiProductionRouteDependencies = {
	authenticate(): Promise<{ id: string }>;
	getAnalysis(canonicalKey: string): Promise<TransparentAnalysisOrchestrationResult>;
	getCached(panel: AnalysisPanelResponse): Promise<TransparentAnalysisAiSynthesis | null>;
	consumeQuota(userId: string): Promise<boolean>;
	cache(panel: AnalysisPanelResponse, synthesis: TransparentAnalysisAiSynthesis): Promise<void>;
	generate(
		panel: AnalysisPanelResponse,
		signal: AbortSignal,
	): Promise<TransparentAnalysisAiProductionResult>;
	monotonicNow?(): number;
	recordTelemetry?(event: TransparentAnalysisTelemetryEvent): void;
};

function json(body: unknown, status: number) {
	return Response.json(body, {
		status,
		headers: { "Cache-Control": "private, no-store" },
	});
}

export async function handleTransparentAnalysisAiProductionRequest(
	canonicalKeyRouteParam: string,
	requestSignal: AbortSignal,
	dependencies: TransparentAnalysisAiProductionRouteDependencies,
) {
	const now = dependencies.monotonicNow ?? (() => performance.now());
	const startedAt = now();
	const finish = (
		body: unknown,
		status: 200 | 400 | 401 | 404 | 409 | 429 | 503,
		outcome: TransparentAnalysisAiRequestOutcome,
		validationIssues?: TransparentAnalysisAiValidationIssue[],
	) => {
		try {
			dependencies.recordTelemetry?.(
				buildTransparentAnalysisAiRequestTelemetry({
					outcome,
					httpStatus: status,
					durationMs: now() - startedAt,
					validationIssues,
				}),
			);
		} catch {
			// Telemetry must never change the API response.
		}
		return json(body, status);
	};

	let user: { id: string };
	try {
		user = await dependencies.authenticate();
	} catch (error) {
		if (error instanceof AuthenticationError) {
			return finish({ error: "Authentication required." }, 401, "authentication_required");
		}
		throw error;
	}

	const canonicalKey = parseCanonicalKeyRouteParam(canonicalKeyRouteParam);
	if (!canonicalKey) return finish({ error: "Invalid instrument identifier." }, 400, "invalid_request");

	const analysis = await dependencies.getAnalysis(canonicalKey);
	if (analysis.kind === "not_found") {
		return finish({ error: "Instrument not found." }, 404, "not_found");
	}
	if (analysis.response.status === "unavailable") {
		return finish(
			{
				version: TRANSPARENT_ANALYSIS_AI_RESPONSE_VERSION,
				status: "unavailable",
				message: "AI analysis requires available daily market context.",
			} satisfies TransparentAnalysisAiResponse,
			analysis.transportStatus === 503 ? 503 : 409,
			"analysis_unavailable",
		);
	}

	let cached: TransparentAnalysisAiSynthesis | null;
	let quotaAllowed: boolean;
	try {
		cached = await dependencies.getCached(analysis.response);
		if (cached) {
			return finish(
				{
					version: TRANSPARENT_ANALYSIS_AI_RESPONSE_VERSION,
					status: "ready",
					synthesis: cached,
				} satisfies TransparentAnalysisAiResponse,
				200,
				"cache_hit",
			);
		}
		quotaAllowed = await dependencies.consumeQuota(user.id);
	} catch {
		return finish(
			{
				version: TRANSPARENT_ANALYSIS_AI_RESPONSE_VERSION,
				status: "unavailable",
				message: "AI analysis is temporarily unavailable. The market analysis above is still valid.",
			} satisfies TransparentAnalysisAiResponse,
			503,
			"provider_failure",
		);
	}
	if (!quotaAllowed) {
		return finish(
			{
				version: TRANSPARENT_ANALYSIS_AI_RESPONSE_VERSION,
				status: "unavailable",
				message: "AI analysis request limit reached. Please try again later.",
			} satisfies TransparentAnalysisAiResponse,
			429,
			"rate_limited",
		);
	}

	const generated = await dependencies.generate(analysis.response, requestSignal);
	if (generated.kind !== "ready") {
		const invalidOutput = generated.kind === "fallback" && generated.reason === "invalid_output";
		return finish(
			{
				version: TRANSPARENT_ANALYSIS_AI_RESPONSE_VERSION,
				status: "unavailable",
				message: invalidOutput
					? "Gemini returned an answer that could not be verified. Please try again."
					: "AI analysis is temporarily unavailable. The market analysis above is still valid.",
			} satisfies TransparentAnalysisAiResponse,
			503,
			generated.kind === "fallback" ? generated.reason : "analysis_unavailable",
			invalidOutput ? generated.validationIssues : undefined,
		);
	}
	try {
		await dependencies.cache(analysis.response, generated.synthesis);
	} catch {
		// A cache write failure must not hide a valid generated result.
	}

	return finish(
		{
			version: TRANSPARENT_ANALYSIS_AI_RESPONSE_VERSION,
			status: "ready",
			synthesis: generated.synthesis,
		} satisfies TransparentAnalysisAiResponse,
		200,
		"ready",
	);
}
