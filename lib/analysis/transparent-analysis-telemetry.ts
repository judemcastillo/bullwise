import type { AnalysisPanelResponse } from "@/lib/analysis/transparent-analysis-panel.types";

export const TRANSPARENT_ANALYSIS_TELEMETRY_VERSION = "1.0.0";

export type TransparentAnalysisRequestOutcome =
	| "authentication_required"
	| "invalid_request"
	| "not_found"
	| "ready"
	| "partial"
	| "unavailable";

export type TransparentAnalysisDurationBucket =
	| "under_250ms"
	| "250ms_to_999ms"
	| "1s_to_2_99s"
	| "3s_to_9_99s"
	| "10s_or_more";

export type TransparentAnalysisWarningCode =
	| "incomplete_bar_excluded"
	| "bars_reordered"
	| "benchmark_unavailable"
	| "volume_incomplete"
	| "benchmark_incomplete"
	| "other_data_quality_warning";

export type TransparentAnalysisPartialReason =
	| "participation_unavailable"
	| "relative_strength_unavailable"
	| "data_quality_warning";

export type TransparentAnalysisTelemetryEvent =
	| {
			version: typeof TRANSPARENT_ANALYSIS_TELEMETRY_VERSION;
			event: "transparent_analysis_request";
			outcome: TransparentAnalysisRequestOutcome;
			httpStatus: 200 | 400 | 401 | 404 | 503;
			duration: TransparentAnalysisDurationBucket;
			unavailableReason?: Extract<AnalysisPanelResponse, { status: "unavailable" }>["reason"];
			partialReasons?: TransparentAnalysisPartialReason[];
			warningCodes?: TransparentAnalysisWarningCode[];
			historyBars?: "300_to_399" | "400_to_499" | "500";
	  }
	| {
			version: typeof TRANSPARENT_ANALYSIS_TELEMETRY_VERSION;
			event: "transparent_analysis_operational_failure";
			stage: "instrument_lookup" | "target_bars" | "benchmark_bars" | "analysis";
			category:
				| "configuration"
				| "authorization"
				| "rate_limited"
				| "timeout_or_network"
				| "result_limit"
				| "provider_response"
				| "unknown";
	  };

type TransparentAnalysisRequestTelemetryEvent = Extract<
	TransparentAnalysisTelemetryEvent,
	{ event: "transparent_analysis_request" }
>;

type TransparentAnalysisOperationalFailureTelemetryEvent = Extract<
	TransparentAnalysisTelemetryEvent,
	{ event: "transparent_analysis_operational_failure" }
>;

const WARNING_CODES = new Map<string, TransparentAnalysisWarningCode>([
	["An incomplete or future-dated daily bar was excluded.", "incomplete_bar_excluded"],
	["Historical daily bars were reordered by timestamp.", "bars_reordered"],
	["SPY benchmark data are unavailable; relative strength is omitted.", "benchmark_unavailable"],
	["Recent volume data are incomplete; participation may be unavailable.", "volume_incomplete"],
	["SPY benchmark data are incomplete; relative strength is omitted.", "benchmark_incomplete"],
]);

export function transparentAnalysisDurationBucket(
	durationMs: number,
): TransparentAnalysisDurationBucket {
	if (durationMs < 250) return "under_250ms";
	if (durationMs < 1_000) return "250ms_to_999ms";
	if (durationMs < 3_000) return "1s_to_2_99s";
	if (durationMs < 10_000) return "3s_to_9_99s";
	return "10s_or_more";
}

function warningCodes(warnings: readonly string[]) {
	return [
		...new Set(
			warnings.map(
				(warning) => WARNING_CODES.get(warning) ?? "other_data_quality_warning",
			),
		),
	];
}

function historyBars(barsUsed: number) {
	if (barsUsed >= 500) return "500" as const;
	if (barsUsed >= 400) return "400_to_499" as const;
	return "300_to_399" as const;
}

export function buildTransparentAnalysisRequestTelemetry(input: {
	outcome: TransparentAnalysisRequestOutcome;
	httpStatus: 200 | 400 | 401 | 404 | 503;
	durationMs: number;
	response?: AnalysisPanelResponse;
}): TransparentAnalysisRequestTelemetryEvent {
	const base: TransparentAnalysisRequestTelemetryEvent = {
		version: TRANSPARENT_ANALYSIS_TELEMETRY_VERSION,
		event: "transparent_analysis_request" as const,
		outcome: input.outcome,
		httpStatus: input.httpStatus,
		duration: transparentAnalysisDurationBucket(Math.max(0, input.durationMs)),
	};
	if (!input.response) return base;
	if (input.response.status === "unavailable") {
		return {
			...base,
			unavailableReason: input.response.reason,
			...(input.response.dataQuality?.warnings.length
				? { warningCodes: warningCodes(input.response.dataQuality.warnings) }
				: {}),
		};
	}

	const codes = warningCodes(input.response.dataQuality.warnings);
	const partialReasons: TransparentAnalysisPartialReason[] = [];
	if (input.response.factors.participation.state === "unavailable") {
		partialReasons.push("participation_unavailable");
	}
	if (codes.includes("benchmark_unavailable") || codes.includes("benchmark_incomplete")) {
		partialReasons.push("relative_strength_unavailable");
	}
	if (codes.length > 0) partialReasons.push("data_quality_warning");

	return {
		...base,
		...(partialReasons.length > 0 ? { partialReasons } : {}),
		...(codes.length > 0 ? { warningCodes: codes } : {}),
		historyBars: historyBars(input.response.dataQuality.barsUsed),
	};
}

export function buildTransparentAnalysisOperationalFailureTelemetry(input: {
	stage: TransparentAnalysisOperationalFailureTelemetryEvent["stage"];
	category: TransparentAnalysisOperationalFailureTelemetryEvent["category"];
}): TransparentAnalysisOperationalFailureTelemetryEvent {
	return {
		version: TRANSPARENT_ANALYSIS_TELEMETRY_VERSION,
		event: "transparent_analysis_operational_failure",
		stage: input.stage,
		category: input.category,
	};
}
