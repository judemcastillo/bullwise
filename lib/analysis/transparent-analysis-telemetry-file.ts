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
) {
	const path = transparentAnalysisLocalTelemetryPath(rootDirectory);
	mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
	appendFileSync(path, `${JSON.stringify(event)}\n`, {
		encoding: "utf8",
		flag: "a",
		mode: 0o600,
	});
}
