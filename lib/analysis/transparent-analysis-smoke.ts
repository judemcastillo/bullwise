import type { AnalysisPanelResponse } from "@/lib/analysis/transparent-analysis-panel.types";
import type { TransparentAnalysisOperationalFailure } from "@/lib/analysis/transparent-analysis-orchestrator";

export const TRANSPARENT_ANALYSIS_SMOKE_VERSION = "1.0.0";

export type TransparentAnalysisSmokeSummary = {
	version: typeof TRANSPARENT_ANALYSIS_SMOKE_VERSION;
	status: "pass" | "fail";
	completedThrough: string;
	targetBars: number;
	benchmarkBars: number;
	panelStatus: AnalysisPanelResponse["status"];
	warningCount: number;
	unavailableReason?: Extract<AnalysisPanelResponse, { status: "unavailable" }>["reason"];
};

export type TransparentAnalysisSmokeFailure = {
	version: typeof TRANSPARENT_ANALYSIS_SMOKE_VERSION;
	status: "fail";
	category:
		| TransparentAnalysisOperationalFailure["category"]
		| "completed_session_unavailable";
};

export function validateTransparentAnalysisSmokeArguments(args: readonly string[]) {
	const unsupported = args.filter((argument) => argument !== "--help" && argument !== "-h");
	if (unsupported.length > 0) {
		throw new Error(
			`Unsupported argument: ${unsupported[0]}. The smoke-test contract is fixed.`,
		);
	}
	return { help: args.includes("--help") || args.includes("-h") };
}

export function buildTransparentAnalysisSmokeSummary(input: {
	completedThrough: Date;
	targetBars: number;
	benchmarkBars: number;
	response: AnalysisPanelResponse;
}): TransparentAnalysisSmokeSummary {
	const warningCount = input.response.dataQuality?.warnings.length ?? 0;
	return {
		version: TRANSPARENT_ANALYSIS_SMOKE_VERSION,
		status: input.response.status === "unavailable" ? "fail" : "pass",
		completedThrough: input.completedThrough.toISOString(),
		targetBars: input.targetBars,
		benchmarkBars: input.benchmarkBars,
		panelStatus: input.response.status,
		warningCount,
		...(input.response.status === "unavailable"
			? { unavailableReason: input.response.reason }
			: {}),
	};
}

export function buildTransparentAnalysisSmokeFailure(
	category: TransparentAnalysisSmokeFailure["category"],
): TransparentAnalysisSmokeFailure {
	return {
		version: TRANSPARENT_ANALYSIS_SMOKE_VERSION,
		status: "fail",
		category,
	};
}
