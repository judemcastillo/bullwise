import type {
	TransparentAnalysisAiProductionResult,
	TransparentAnalysisAiSynthesis,
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
	authenticate(): Promise<unknown>;
	getAnalysis(canonicalKey: string): Promise<TransparentAnalysisOrchestrationResult>;
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
		status: 200 | 400 | 401 | 404 | 409 | 503,
		outcome: TransparentAnalysisAiRequestOutcome,
	) => {
		try {
			dependencies.recordTelemetry?.(
				buildTransparentAnalysisAiRequestTelemetry({
					outcome,
					httpStatus: status,
					durationMs: now() - startedAt,
				}),
			);
		} catch {
			// Telemetry must never change the API response.
		}
		return json(body, status);
	};

	try {
		await dependencies.authenticate();
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

	const generated = await dependencies.generate(analysis.response, requestSignal);
	if (generated.kind !== "ready") {
		return finish(
			{
				version: TRANSPARENT_ANALYSIS_AI_RESPONSE_VERSION,
				status: "unavailable",
				message: "AI analysis is temporarily unavailable. The market analysis above is still valid.",
			} satisfies TransparentAnalysisAiResponse,
			503,
			generated.kind === "fallback" ? generated.reason : "analysis_unavailable",
		);
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
