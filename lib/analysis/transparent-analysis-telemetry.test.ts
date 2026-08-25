import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { AnalysisPanelAvailableResponse } from "@/lib/analysis/transparent-analysis-panel.types";
import {
	buildTransparentAnalysisOperationalFailureTelemetry,
	buildTransparentAnalysisRequestTelemetry,
	transparentAnalysisDurationBucket,
} from "@/lib/analysis/transparent-analysis-telemetry";
import {
	appendTransparentAnalysisLocalTelemetry,
	transparentAnalysisLocalTelemetryPath,
} from "@/lib/analysis/transparent-analysis-telemetry-file";

function partialResponse(): AnalysisPanelAvailableResponse {
	return {
		version: "1.0.0",
		status: "partial",
		instrument: {
			canonicalKey: "equity:xnas:aapl",
			displaySymbol: "AAPL",
			name: "Apple Inc.",
			currency: "USD",
		},
		asOf: "2026-08-21T20:00:00.000Z",
		timeframe: { interval: "1d", description: "Daily context" },
		context: "mixed",
		factors: {
			trend: { state: "bullish", evidence: ["private evidence"], counterEvidence: [] },
			momentum: { state: "mixed", evidence: [], counterEvidence: ["private counter"] },
			volatility: { state: "normal", evidence: [], counterEvidence: [] },
			participation: {
				state: "unavailable",
				evidence: [],
				counterEvidence: ["Recent volume participation could not be calculated."],
			},
		},
		levels: {
			support: [
				{
					kind: "support",
					price: "220.50",
					distancePercent: -2.4,
					touches: 3,
					source: "swing_cluster",
				},
			],
			resistance: [],
		},
		dataQuality: {
			provider: "massive",
			interval: "1d",
			adjusted: true,
			barsUsed: 420,
			firstBarAt: "2025-01-02T00:00:00.000Z",
			lastBarAt: "2026-08-21T00:00:00.000Z",
			completedThrough: "2026-08-21T20:00:00.000Z",
			warnings: [
				"SPY benchmark data are unavailable; relative strength is omitted.",
				"SECRET raw warning that must not be logged",
			],
		},
		disclaimer: "Descriptive market context—not investment advice or a trading signal.",
	};
}

function recursivelyHasKey(value: unknown, prohibited: Set<string>): boolean {
	if (!value || typeof value !== "object") return false;
	if (Array.isArray(value)) {
		return value.some((item) => recursivelyHasKey(item, prohibited));
	}
	return Object.entries(value).some(
		([key, item]) => prohibited.has(key) || recursivelyHasKey(item, prohibited),
	);
}

describe("transparent analysis telemetry", () => {
	it("uses fixed low-cardinality duration buckets", () => {
		assert.equal(transparentAnalysisDurationBucket(0), "under_250ms");
		assert.equal(transparentAnalysisDurationBucket(249), "under_250ms");
		assert.equal(transparentAnalysisDurationBucket(250), "250ms_to_999ms");
		assert.equal(transparentAnalysisDurationBucket(999), "250ms_to_999ms");
		assert.equal(transparentAnalysisDurationBucket(1_000), "1s_to_2_99s");
		assert.equal(transparentAnalysisDurationBucket(3_000), "3s_to_9_99s");
		assert.equal(transparentAnalysisDurationBucket(10_000), "10s_or_more");
	});

	it("reduces a partial response to aggregate reason and warning codes", () => {
		const event = buildTransparentAnalysisRequestTelemetry({
			outcome: "partial",
			httpStatus: 200,
			durationMs: 1_250,
			response: partialResponse(),
		});

		assert.deepEqual(event, {
			version: "1.0.0",
			event: "transparent_analysis_request",
			outcome: "partial",
			httpStatus: 200,
			duration: "1s_to_2_99s",
			partialReasons: [
				"participation_unavailable",
				"relative_strength_unavailable",
				"data_quality_warning",
			],
			warningCodes: ["benchmark_unavailable", "other_data_quality_warning"],
			historyBars: "400_to_499",
		});
		assert.doesNotMatch(JSON.stringify(event), /SECRET|raw warning|AAPL|220\.50|massive/);
	});

	it("records only a closed unavailable reason and no response prose", () => {
		const event = buildTransparentAnalysisRequestTelemetry({
			outcome: "unavailable",
			httpStatus: 503,
			durationMs: 12_000,
			response: {
				version: "1.0.0",
				status: "unavailable",
				reason: "bars_provider_unavailable",
				message: "SECRET provider prose",
				disclaimer: "Descriptive market context—not investment advice or a trading signal.",
			},
		});

		assert.deepEqual(event, {
			version: "1.0.0",
			event: "transparent_analysis_request",
			outcome: "unavailable",
			httpStatus: 503,
			duration: "10s_or_more",
			unavailableReason: "bars_provider_unavailable",
		});
		assert.doesNotMatch(JSON.stringify(event), /SECRET|provider prose/);
	});

	it("keeps operational failures anonymous and categorical", () => {
		assert.deepEqual(
			buildTransparentAnalysisOperationalFailureTelemetry({
				stage: "target_bars",
				category: "timeout_or_network",
			}),
			{
				version: "1.0.0",
				event: "transparent_analysis_operational_failure",
				stage: "target_bars",
				category: "timeout_or_network",
			},
		);
	});

	it("contains no identity, instrument, market-value, or raw-data fields", () => {
		const event = buildTransparentAnalysisRequestTelemetry({
			outcome: "partial",
			httpStatus: 200,
			durationMs: 300,
			response: partialResponse(),
		});
		assert.equal(
			recursivelyHasKey(
				event,
				new Set([
					"userId",
					"canonicalKey",
					"displaySymbol",
					"provider",
					"providerSymbol",
					"price",
					"levels",
					"evidence",
					"counterEvidence",
					"warnings",
					"bars",
				]),
			),
			false,
		);
	});

	it("keeps the production logger server-only", () => {
		const source = readFileSync(
			new URL("./transparent-analysis-telemetry-logger.ts", import.meta.url),
			"utf8",
		);
		assert.match(source, /^import "server-only";/);
		assert.deepEqual(
			[...source.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((match) => match[1]),
			["NODE_ENV"],
		);
		assert.doesNotMatch(source, /canonicalKey|providerSymbol|userId/);
	});

	it("appends privacy-safe local events as permission-restricted JSON lines", () => {
		const rootDirectory = mkdtempSync(join(tmpdir(), "bullwise-telemetry-"));
		try {
			const event = buildTransparentAnalysisOperationalFailureTelemetry({
				stage: "target_bars",
				category: "timeout_or_network",
			});
			appendTransparentAnalysisLocalTelemetry(
				event,
				rootDirectory,
				new Date("2026-08-24T09:16:00.000Z"),
			);
			appendTransparentAnalysisLocalTelemetry(
				event,
				rootDirectory,
				new Date("2026-08-25T23:59:59.000Z"),
			);
			const path = transparentAnalysisLocalTelemetryPath(rootDirectory);
			const lines = readFileSync(path, "utf8").trim().split("\n");

			assert.deepEqual(lines.map((line) => JSON.parse(line)), [
				{ recordedDate: "2026-08-24", ...event },
				{ recordedDate: "2026-08-25", ...event },
			]);
			assert.equal(statSync(path).mode & 0o777, 0o600);
		} finally {
			rmSync(rootDirectory, { recursive: true, force: true });
		}
	});
});
