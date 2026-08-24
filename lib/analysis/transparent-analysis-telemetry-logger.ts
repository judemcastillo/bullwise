import "server-only";

import type { TransparentAnalysisTelemetryEvent } from "@/lib/analysis/transparent-analysis-telemetry";

export function recordTransparentAnalysisTelemetry(
	event: TransparentAnalysisTelemetryEvent,
) {
	if (event.event === "transparent_analysis_operational_failure") {
		console.error("Bullwise telemetry", event);
		return;
	}
	console.info("Bullwise telemetry", event);
}
