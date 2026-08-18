import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DailySwingBatchDiagnosticReport } from "@/lib/analysis/batch-diagnostics.types";
import type { DailySwingPortfolioBacktestReport } from "@/lib/analysis/portfolio-backtest.types";
import { evaluateDailySwingV3Confirmation } from "@/lib/analysis/v3-confirmation";

function portfolio(
	policy: "symbol" | "v3_signal_quality",
	overrides: {
		trades?: number;
		averageR?: number;
		profitFactor?: number;
		annualizedReturn?: number;
		drawdown?: number;
	} = {},
) {
	return {
		configuration: { candidateSelectionPolicy: policy },
		candidateTrades: 1_000,
		performance: {
			tradeCount: overrides.trades ?? 400,
			averageRMultiple: overrides.averageR ?? 0.12,
			profitFactor: overrides.profitFactor ?? 1.25,
			annualizedReturnPercent: overrides.annualizedReturn ?? 6,
			maximumDrawdownPercent: overrides.drawdown ?? 12,
		},
	} as unknown as DailySwingPortfolioBacktestReport;
}

describe("daily swing v3 portfolio confirmation", () => {
	it("requires absolute performance and improvement over the same candidates", () => {
		const source = {
			coverage: { researchReady: true },
		} as DailySwingBatchDiagnosticReport;
		const result = evaluateDailySwingV3Confirmation({
			source,
			baseline: portfolio("symbol", {
				averageR: 0.09,
				annualizedReturn: 5,
			}),
			ranked: portfolio("v3_signal_quality"),
		});
		assert.equal(result.passed, true);
		assert.ok(result.criteria.every((criterion) => criterion.passed));

		const failed = evaluateDailySwingV3Confirmation({
			source,
			baseline: portfolio("symbol", {
				averageR: 0.11,
				annualizedReturn: 5.8,
			}),
			ranked: portfolio("v3_signal_quality"),
		});
		assert.equal(failed.passed, false);
	});

	it("rejects mismatched selection policies", () => {
		assert.throws(
			() =>
				evaluateDailySwingV3Confirmation({
					source: {
						coverage: { researchReady: true },
					} as DailySwingBatchDiagnosticReport,
					baseline: portfolio("v3_signal_quality"),
					ranked: portfolio("v3_signal_quality"),
				}),
			/baseline must use symbol selection/,
		);
	});
});
