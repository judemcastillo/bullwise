import type { TransparentAnalysisOrchestrationResult } from "@/lib/analysis/transparent-analysis-orchestrator";
import {
	buildTransparentAnalysisRequestTelemetry,
	type TransparentAnalysisRequestOutcome,
	type TransparentAnalysisTelemetryEvent,
} from "@/lib/analysis/transparent-analysis-telemetry";
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
	monotonicNow?(): number;
	recordTelemetry?(event: TransparentAnalysisTelemetryEvent): void;
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
	const now = dependencies.monotonicNow ?? (() => performance.now());
	const startedAt = now();
	const finish = (
		body: unknown,
		status: 200 | 400 | 401 | 404 | 503,
		outcome: TransparentAnalysisRequestOutcome,
		response?: Extract<TransparentAnalysisOrchestrationResult, { kind: "response" }>["response"],
	) => {
		try {
			dependencies.recordTelemetry?.(
				buildTransparentAnalysisRequestTelemetry({
					outcome,
					httpStatus: status,
					durationMs: now() - startedAt,
					...(response ? { response } : {}),
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
			return finish(
				{ error: "Authentication required." },
				401,
				"authentication_required",
			);
		}
		throw error;
	}

	const canonicalKey = parseCanonicalKeyRouteParam(canonicalKeyRouteParam);
	if (!canonicalKey) {
		return finish(
			{ error: "Invalid instrument identifier." },
			400,
			"invalid_request",
		);
	}

	const result = await dependencies.getAnalysis(canonicalKey);
	if (result.kind === "not_found") {
		return finish({ error: "Instrument not found." }, 404, "not_found");
	}

	return finish(
		result.response,
		result.transportStatus,
		result.response.status,
		result.response,
	);
}
