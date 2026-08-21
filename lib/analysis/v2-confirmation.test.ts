import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DailySwingBatchDiagnosticReport } from "@/lib/analysis/batch-diagnostics.types";
import { evaluateDailySwingV2Confirmation } from "@/lib/analysis/v2-confirmation";

function report(
	overrides: {
		trades?: number;
		averageR?: number;
		profitFactor?: number;
		profitable?: number;
		drawdown?: number;
		stressedProfitFactor?: number;
		strategyVersion?: string;
	} = {},
) {
	return {
		coverage: { researchReady: true },
		aggregate: {
			instrumentsTested: 15,
			totalTrades: overrides.trades ?? 200,
			pooledAverageRMultiple: overrides.averageR ?? 0.1,
			pooledProfitFactor: overrides.profitFactor ?? 1.2,
			profitableInstrumentCount: overrides.profitable ?? 10,
			averageMaximumDrawdownPercent: overrides.drawdown ?? 8,
		},
		diagnostics: {
			frictionSensitivity: [
				{
					scenario: "stressed",
					pooledProfitFactor: overrides.stressedProfitFactor ?? 0.95,
				},
			],
		},
		reports: [
			{
				strategyVersion:
					overrides.strategyVersion ?? "daily-swing-v2-confirmation",
			},
		],
	} as unknown as DailySwingBatchDiagnosticReport;
}

describe("daily swing v2 confirmation criteria", () => {
	it("passes only when every frozen threshold and coverage gate pass", () => {
		const result = evaluateDailySwingV2Confirmation(report());
		assert.equal(result.passed, true);
		assert.ok(result.criteria.every((criterion) => criterion.passed));

		const failed = evaluateDailySwingV2Confirmation(
			report({ stressedProfitFactor: 0.89 }),
		);
		assert.equal(failed.passed, false);
		assert.equal(failed.criteria.at(-1)?.passed, false);
	});

	it("rejects reports produced by another strategy version", () => {
		assert.throws(
			() =>
				evaluateDailySwingV2Confirmation(
					report({ strategyVersion: "daily-swing-v1-draft" }),
				),
			/only daily-swing v2 reports/,
		);
	});
});
