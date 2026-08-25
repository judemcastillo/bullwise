import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { TransparentAnalysisTelemetryEvent } from "@/lib/analysis/transparent-analysis-telemetry";

export const TRANSPARENT_ANALYSIS_LOCAL_TELEMETRY_PATH =
	"artifacts/telemetry/transparent-analysis-v1.jsonl";

export function transparentAnalysisLocalTelemetryPath(rootDirectory: string) {
	return resolve(rootDirectory, TRANSPARENT_ANALYSIS_LOCAL_TELEMETRY_PATH);
}

export function appendTransparentAnalysisLocalTelemetry(
	event: TransparentAnalysisTelemetryEvent,
	rootDirectory = process.cwd(),
	recordedAt = new Date(),
) {
	const path = transparentAnalysisLocalTelemetryPath(rootDirectory);
	mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
	appendFileSync(
		path,
		`${JSON.stringify({ recordedDate: recordedAt.toISOString().slice(0, 10), ...event })}\n`,
		{
		encoding: "utf8",
		flag: "a",
		mode: 0o600,
		},
	);
}
