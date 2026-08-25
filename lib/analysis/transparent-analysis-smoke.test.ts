import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AnalysisPanelResponse } from "@/lib/analysis/transparent-analysis-panel.types";
import {
	buildTransparentAnalysisSmokeFailure,
	buildTransparentAnalysisSmokeSummary,
	validateTransparentAnalysisSmokeArguments,
} from "@/lib/analysis/transparent-analysis-smoke";

const DISCLAIMER = "Descriptive market context—not investment advice or a trading signal.";

describe("transparent analysis operational smoke", () => {
	it("accepts only the fixed contract and help flags", () => {
		assert.deepEqual(validateTransparentAnalysisSmokeArguments([]), { help: false });
		assert.deepEqual(validateTransparentAnalysisSmokeArguments(["--help"]), {
			help: true,
		});
		assert.throws(
			() => validateTransparentAnalysisSmokeArguments(["--symbol=MSFT"]),
			/The smoke-test contract is fixed/,
		);
	});

	it("reduces an available panel to operational counts and status", () => {
		const response = {
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
				trend: { state: "mixed", evidence: ["SECRET evidence"], counterEvidence: [] },
				momentum: { state: "mixed", evidence: [], counterEvidence: [] },
				volatility: { state: "normal", evidence: [], counterEvidence: [] },
				participation: { state: "unavailable", evidence: [], counterEvidence: [] },
			},
			levels: { support: [], resistance: [] },
			dataQuality: {
				provider: "massive",
				interval: "1d",
				adjusted: true,
				barsUsed: 420,
				firstBarAt: "2025-01-01T00:00:00.000Z",
				lastBarAt: "2026-08-21T00:00:00.000Z",
				completedThrough: "2026-08-21T20:00:00.000Z",
				warnings: ["SECRET provider warning"],
			},
			disclaimer: DISCLAIMER,
		} satisfies AnalysisPanelResponse;

		const summary = buildTransparentAnalysisSmokeSummary({
			completedThrough: new Date("2026-08-21T20:00:00.000Z"),
			targetBars: 490,
			benchmarkBars: 491,
			response,
		});

		assert.deepEqual(summary, {
			version: "1.0.0",
			status: "pass",
			completedThrough: "2026-08-21T20:00:00.000Z",
			targetBars: 490,
			benchmarkBars: 491,
			panelStatus: "partial",
			warningCount: 1,
		});
		assert.doesNotMatch(
			JSON.stringify(summary),
			/AAPL|Apple|massive|SECRET|private evidence|provider warning/,
		);
	});

	it("returns only a closed failure category", () => {
		const summary = buildTransparentAnalysisSmokeFailure("authorization");
		assert.deepEqual(summary, {
			version: "1.0.0",
			status: "fail",
			category: "authorization",
		});
	});
});
