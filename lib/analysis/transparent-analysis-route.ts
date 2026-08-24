import type { TransparentAnalysisOrchestrationResult } from "@/lib/analysis/transparent-analysis-orchestrator";
import { AuthenticationError } from "@/lib/auth/access-policy";
import { parseCanonicalKeyRouteParam } from "@/lib/instruments/canonical-key";

const PRIVATE_JSON_HEADERS = {
	"Cache-Control": "private, no-store",
} as const;

export type TransparentAnalysisRouteDependencies = {
	authenticate(): Promise<unknown>;
	getAnalysis(
		canonicalKey: string,
	): Promise<TransparentAnalysisOrchestrationResult>;
};

function json(body: unknown, status: number) {
	return Response.json(body, {
		status,
		headers: PRIVATE_JSON_HEADERS,
	});
}

export async function handleTransparentAnalysisRequest(
	canonicalKeyRouteParam: string,
	dependencies: TransparentAnalysisRouteDependencies,
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
	if (!canonicalKey) {
		return json({ error: "Invalid instrument identifier." }, 400);
	}

	const result = await dependencies.getAnalysis(canonicalKey);
	if (result.kind === "not_found") {
		return json({ error: "Instrument not found." }, 404);
	}

	return json(result.response, result.transportStatus);
}
