import "server-only";

import type { TransparentAnalysisTelemetryEvent } from "@/lib/analysis/transparent-analysis-telemetry";
import { appendTransparentAnalysisLocalTelemetry } from "@/lib/analysis/transparent-analysis-telemetry-file";

function recordToConsole(event: TransparentAnalysisTelemetryEvent) {
	if (event.event === "transparent_analysis_operational_failure") {
		console.error("Bullwise telemetry", event);
		return;
	}
	console.info("Bullwise telemetry", event);
}

export function recordTransparentAnalysisTelemetry(
	event: TransparentAnalysisTelemetryEvent,
) {
	if (process.env.NODE_ENV === "development") {
		try {
			appendTransparentAnalysisLocalTelemetry(event);
		} catch {
			console.error("Bullwise telemetry local sink unavailable");
			recordToConsole(event);
		}
		return;
	}
	recordToConsole(event);
}
