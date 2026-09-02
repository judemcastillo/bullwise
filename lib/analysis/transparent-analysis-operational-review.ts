import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import {
	summarizeTransparentAnalysisObservation,
	TRANSPARENT_ANALYSIS_OBSERVATION_MINIMUM_DAYS,
	TRANSPARENT_ANALYSIS_OBSERVATION_MINIMUM_REQUESTS,
} from "@/lib/analysis/transparent-analysis-daily-observation";

export const TRANSPARENT_ANALYSIS_OPERATIONAL_REVIEW_VERSION = "1.0.0";
export const TRANSPARENT_ANALYSIS_OPERATIONAL_REVIEW_PATH =
	"artifacts/telemetry/transparent-analysis-operational-review-v1.json";

type OperationalReviewGate = {
	id:
		| "minimum_valid_requests"
		| "minimum_distinct_days"
		| "availability_rate"
		| "ten_second_rate"
		| "critical_operational_failures"
		| "unknown_warning_codes"
		| "participation_unavailability"
		| "relative_strength_unavailability"
		| "telemetry_integrity";
	passed: boolean;
	value: number;
	comparison: ">=" | "<=" | "=";
	threshold: number;
	unit: "count" | "percent";
};

export type TransparentAnalysisOperationalReview = {
	version: typeof TRANSPARENT_ANALYSIS_OPERATIONAL_REVIEW_VERSION;
	createdAt: string;
	decision: "pass_operational_review" | "investigate_before_ai_contract";
	source: {
		path: "artifacts/telemetry/transparent-analysis-v1.jsonl";
		sha256: string;
		bytes: number;
	};
	coverage: {
		firstDate: string | null;
		lastDate: string | null;
		distinctDays: number;
		validRequests: number;
		excludedUndatedRequests: number;
		invalidLines: number;
	};
	aggregates: {
		outcomes: Record<string, number>;
		durations: Record<string, number>;
		unavailableReasons: Record<string, number>;
		partialReasons: Record<string, number>;
		warningCodes: Record<string, number>;
		historyBars: Record<string, number>;
		operationalFailureCategories: Record<string, number>;
	};
	rates: {
		availablePercent: number;
		tenSecondsOrMorePercent: number;
	};
	gates: OperationalReviewGate[];
};

function count(counts: Record<string, number>, key: string) {
	return counts[key] ?? 0;
}

function percent(numerator: number, denominator: number) {
	return denominator === 0 ? 0 : Number(((numerator / denominator) * 100).toFixed(8));
}

export function buildTransparentAnalysisOperationalReview(input: {
	contents: string;
	createdAt: Date;
	sourceBytes?: number;
}): TransparentAnalysisOperationalReview {
	const progress = summarizeTransparentAnalysisObservation(
		input.contents,
		input.createdAt,
	);
	const available = count(progress.outcomes, "ready") + count(progress.outcomes, "partial");
	const availablePercent = percent(available, progress.validRequests);
	const tenSecondsOrMorePercent = percent(
		count(progress.durations, "10s_or_more"),
		progress.validRequests,
	);
	const criticalFailures = [
		"configuration",
		"authorization",
		"result_limit",
		"unknown",
	].reduce((total, category) => total + count(progress.failureCategories, category), 0);
	const gates: OperationalReviewGate[] = [
		{
			id: "minimum_valid_requests",
			passed:
				progress.validRequests >= TRANSPARENT_ANALYSIS_OBSERVATION_MINIMUM_REQUESTS,
			value: progress.validRequests,
			comparison: ">=",
			threshold: TRANSPARENT_ANALYSIS_OBSERVATION_MINIMUM_REQUESTS,
			unit: "count",
		},
		{
			id: "minimum_distinct_days",
			passed:
				progress.distinctDays >= TRANSPARENT_ANALYSIS_OBSERVATION_MINIMUM_DAYS,
			value: progress.distinctDays,
			comparison: ">=",
			threshold: TRANSPARENT_ANALYSIS_OBSERVATION_MINIMUM_DAYS,
			unit: "count",
		},
		{
			id: "availability_rate",
			passed: availablePercent >= 95,
			value: availablePercent,
			comparison: ">=",
			threshold: 95,
			unit: "percent",
		},
		{
			id: "ten_second_rate",
			passed: tenSecondsOrMorePercent <= 5,
			value: tenSecondsOrMorePercent,
			comparison: "<=",
			threshold: 5,
			unit: "percent",
		},
		{
			id: "critical_operational_failures",
			passed: criticalFailures === 0,
			value: criticalFailures,
			comparison: "=",
			threshold: 0,
			unit: "count",
		},
		{
			id: "unknown_warning_codes",
			passed: count(progress.warningCodes, "other_data_quality_warning") === 0,
			value: count(progress.warningCodes, "other_data_quality_warning"),
			comparison: "=",
			threshold: 0,
			unit: "count",
		},
		{
			id: "participation_unavailability",
			passed: count(progress.partialReasons, "participation_unavailable") <= 1,
			value: count(progress.partialReasons, "participation_unavailable"),
			comparison: "<=",
			threshold: 1,
			unit: "count",
		},
		{
			id: "relative_strength_unavailability",
			passed: count(progress.partialReasons, "relative_strength_unavailable") <= 1,
			value: count(progress.partialReasons, "relative_strength_unavailable"),
			comparison: "<=",
			threshold: 1,
			unit: "count",
		},
		{
			id: "telemetry_integrity",
			passed: progress.invalidLines === 0,
			value: progress.invalidLines,
			comparison: "=",
			threshold: 0,
			unit: "count",
		},
	];

	return {
		version: TRANSPARENT_ANALYSIS_OPERATIONAL_REVIEW_VERSION,
		createdAt: input.createdAt.toISOString(),
		decision: gates.every((gate) => gate.passed)
			? "pass_operational_review"
			: "investigate_before_ai_contract",
		source: {
			path: "artifacts/telemetry/transparent-analysis-v1.jsonl",
			sha256: createHash("sha256").update(input.contents).digest("hex"),
			bytes: input.sourceBytes ?? Buffer.byteLength(input.contents),
		},
		coverage: {
			firstDate: progress.firstDate,
			lastDate: progress.lastDate,
			distinctDays: progress.distinctDays,
			validRequests: progress.validRequests,
			excludedUndatedRequests: progress.undatedRequestEvents,
			invalidLines: progress.invalidLines,
		},
		aggregates: {
			outcomes: progress.outcomes,
			durations: progress.durations,
			unavailableReasons: progress.unavailableReasons,
			partialReasons: progress.partialReasons,
			warningCodes: progress.warningCodes,
			historyBars: progress.historyBars,
			operationalFailureCategories: progress.failureCategories,
		},
		rates: { availablePercent, tenSecondsOrMorePercent },
		gates,
	};
}

export async function writeTransparentAnalysisOperationalReview(
	path: string,
	review: TransparentAnalysisOperationalReview,
) {
	await writeFile(path, `${JSON.stringify(review, null, 2)}\n`, {
		encoding: "utf8",
		flag: "wx",
		mode: 0o600,
	});
}

export function validateTransparentAnalysisOperationalReviewArguments(
	args: readonly string[],
) {
	const unsupported = args.filter((argument) => argument !== "--help" && argument !== "-h");
	if (unsupported.length > 0) throw new Error(`Unsupported argument: ${unsupported[0]}`);
	return { help: args.includes("--help") || args.includes("-h") };
}
