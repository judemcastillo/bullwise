import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_PROTOCOL } from "@/lib/analysis/symmetric-regime-strategy-development";

describe("symmetric regime strategy development protocol", () => {
	it("freezes one materially different long/short candidate", () => {
		const protocol = DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_PROTOCOL;
		assert.equal(
			protocol.sources.rejectedBenchmarkRiskFilter.sha256,
			"2b82ed55f49bb3b0ff52146a2914bf306ae1f542a1c50db0ba3e7c0e88a698c8",
		);
		assert.equal(
			protocol.sources.rejectedBenchmarkRiskFilter.decision,
			"reject_benchmark_risk_filter",
		);
		assert.equal(protocol.candidate.candidateCount, 1);
		assert.equal(protocol.candidate.allowShortSetups, true);
		assert.equal(protocol.candidate.marketBenchmarkFilter, "none");
		assert.equal(protocol.candidate.model, "none");
		assert.deepEqual(protocol.candidate.directions.short.setupTypes, [
			"breakdown",
			"pullback",
		]);
	});

	it("includes a frozen short-specific borrow stress", () => {
		const protocol = DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_PROTOCOL;
		assert.equal(protocol.candidate.shortBorrowStress.annualRate, 0.05);
		assert.equal(
			protocol.candidate.shortBorrowStress.accrualBasis,
			"elapsed_calendar_days_over_365",
		);
		assert.equal(protocol.candidate.shortBorrowStress.minimumChargedDays, 1);
		assert.equal(protocol.evaluation.outcomeCosts.shortBorrowStressIncluded, true);
		assert.ok(protocol.limitations.some((item) => /borrow availability/.test(item)));
	});

	it("requires every fixed gate while keeping sealed data closed", () => {
		const protocol = DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_PROTOCOL;
		assert.equal(protocol.developmentGates.length, 12);
		assert.equal(
			new Set(protocol.developmentGates.map((gate) => gate.metric)).size,
			protocol.developmentGates.length,
		);
		assert.equal(protocol.decisionPolicy.requiresEveryGate, true);
		assert.equal(protocol.dataAccess.validationFeaturesRead, false);
		assert.equal(protocol.dataAccess.validationLabelsRead, false);
		assert.equal(protocol.dataAccess.testFeaturesRead, false);
		assert.equal(protocol.dataAccess.testLabelsRead, false);
		assert.equal(protocol.decisionPolicy.authorizesValidationAccess, false);
		assert.equal(protocol.decisionPolicy.authorizesProductSignals, false);
		assert.equal(protocol.decisionPolicy.authorizesLiveTrading, false);
		assert.equal(protocol.evaluation.instrumentLevelOutput, false);
		assert.equal(protocol.output.overwrite, false);

		const prohibitions = protocol.prohibitions.join(" ");
		assert.match(prohibitions, /Do not reuse or tune the rejected SPY/);
		assert.match(prohibitions, /Do not tune indicators/);
		assert.match(prohibitions, /Do not change the frozen short-borrow stress/);
		assert.match(prohibitions, /Do not open validation or test/);
	});
});
