import type { TransparentAnalysisAiExplanation } from "@/lib/analysis/transparent-analysis-ai-contract";
import type { TransparentAnalysisOrchestrationResult } from "@/lib/analysis/transparent-analysis-orchestrator";
import type { AnalysisPanelResponse } from "@/lib/analysis/transparent-analysis-panel.types";
import { AuthenticationError } from "@/lib/auth/access-policy";
import { parseCanonicalKeyRouteParam } from "@/lib/instruments/canonical-key";

export const TRANSPARENT_ANALYSIS_AI_RESPONSE_VERSION = "1.0.0";

export type TransparentAnalysisAiResponse =
	| {
			version: typeof TRANSPARENT_ANALYSIS_AI_RESPONSE_VERSION;
			status: "ready";
			explanation: TransparentAnalysisAiExplanation;
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
	): Promise<
		| { kind: "ready"; explanation: TransparentAnalysisAiExplanation }
		| { kind: "not_requested" | "fallback" }
	>;
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
	try {
		await dependencies.authenticate();
	} catch (error) {
		if (error instanceof AuthenticationError) {
			return json({ error: "Authentication required." }, 401);
		}
		throw error;
	}

	const canonicalKey = parseCanonicalKeyRouteParam(canonicalKeyRouteParam);
	if (!canonicalKey) return json({ error: "Invalid instrument identifier." }, 400);

	const analysis = await dependencies.getAnalysis(canonicalKey);
	if (analysis.kind === "not_found") {
		return json({ error: "Instrument not found." }, 404);
	}
	if (analysis.response.status === "unavailable") {
		return json(
			{
				version: TRANSPARENT_ANALYSIS_AI_RESPONSE_VERSION,
				status: "unavailable",
				message: "AI analysis requires available daily market context.",
			} satisfies TransparentAnalysisAiResponse,
			analysis.transportStatus === 503 ? 503 : 409,
		);
	}

	const generated = await dependencies.generate(analysis.response, requestSignal);
	if (generated.kind !== "ready") {
		return json(
			{
				version: TRANSPARENT_ANALYSIS_AI_RESPONSE_VERSION,
				status: "unavailable",
				message: "AI analysis is temporarily unavailable. The market analysis above is still valid.",
			} satisfies TransparentAnalysisAiResponse,
			503,
		);
	}

	return json(
		{
			version: TRANSPARENT_ANALYSIS_AI_RESPONSE_VERSION,
			status: "ready",
			explanation: generated.explanation,
		} satisfies TransparentAnalysisAiResponse,
		200,
	);
}
