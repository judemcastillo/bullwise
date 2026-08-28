import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	summarizeTransparentAnalysisObservation,
	transparentAnalysisDailyCandidates,
	validateTransparentAnalysisObservationArguments,
} from "@/lib/analysis/transparent-analysis-daily-observation";

describe("transparent analysis daily observation helper", () => {
	it("counts only dated valid-instrument requests", () => {
		const lines = [
			{ recordedDate: "2026-08-24", event: "transparent_analysis_request", outcome: "ready", duration: "under_250ms" },
			{ recordedDate: "2026-08-25", event: "transparent_analysis_request", outcome: "partial", duration: "1s_to_2_99s" },
			{ recordedDate: "2026-08-25", event: "transparent_analysis_request", outcome: "unavailable", unavailableReason: "bars_provider_unavailable", duration: "3s_to_9_99s" },
			{ recordedDate: "2026-08-25", event: "transparent_analysis_request", outcome: "unavailable", unavailableReason: "unsupported_instrument", duration: "under_250ms" },
			{ event: "transparent_analysis_request", outcome: "ready", duration: "under_250ms" },
			{ recordedDate: "2026-08-25", event: "transparent_analysis_request", outcome: "authentication_required", duration: "under_250ms" },
			{ recordedDate: "2026-08-25", event: "transparent_analysis_operational_failure", category: "timeout_or_network" },
		];
		const progress = summarizeTransparentAnalysisObservation(
			`${lines.map((line) => JSON.stringify(line)).join("\n")}\nnot-json\n`,
			new Date("2026-08-25T12:00:00.000Z"),
		);

		assert.deepEqual(progress, {
			totalLines: 8,
			invalidLines: 1,
			undatedRequestEvents: 1,
			validRequests: 3,
			distinctDays: 2,
			todayRequests: 2,
			remainingRequests: 47,
			remainingDays: 5,
			requestMinimumMet: false,
			dayMinimumMet: false,
			outcomes: { ready: 1, partial: 1, unavailable: 1 },
			durations: {
				under_250ms: 1,
				"1s_to_2_99s": 1,
				"3s_to_9_99s": 1,
			},
			failureCategories: { timeout_or_network: 1 },
		});
	});

	it("rotates a fixed eight-stock common-stock checklist", () => {
		const first = transparentAnalysisDailyCandidates(
			new Date("2026-08-24T12:00:00.000Z"),
		);
		const next = transparentAnalysisDailyCandidates(
			new Date("2026-08-25T12:00:00.000Z"),
		);
		assert.equal(first.length, 8);
		assert.equal(next.length, 8);
		assert.notDeepEqual(first, next);
		assert.equal(new Set(first.map(({ symbol }) => symbol)).size, 8);
	});

	it("accepts only help flags", () => {
		assert.deepEqual(validateTransparentAnalysisObservationArguments([]), {
			help: false,
		});
		assert.deepEqual(
			validateTransparentAnalysisObservationArguments(["--help"]),
			{ help: true },
		);
		assert.throws(
			() => validateTransparentAnalysisObservationArguments(["--requests=50"]),
			/Unsupported argument/,
		);
	});
});
