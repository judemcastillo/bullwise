import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL } from "@/lib/analysis/risk-controlled-momentum-v2-development";
import { RISK_CONTROLLED_MOMENTUM_V2_MANIFEST_SHA256 } from "@/lib/analysis/risk-controlled-momentum-v2-universe";

describe("risk-controlled momentum v2 executable preregistration", () => {
	it("binds the untouched source contract before history retrieval", () => {
		const protocol = RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL;
		assert.equal(protocol.sources.universeManifestSha256, RISK_CONTROLLED_MOMENTUM_V2_MANIFEST_SHA256);
		assert.equal(protocol.sources.history.sha256, null);
		assert.equal(protocol.sources.history.sha256Status, "must_be_registered_after_fetch_before_outcomes");
		assert.equal(protocol.coverage.manifestCandidates, 48);
		assert.equal(protocol.coverage.minimumEligibleInstruments, 40);
		assert.equal(protocol.coverage.minimumEligibleInstrumentsPerSleeve, 10);
	});

	it("freezes one capped volatility rule without a parameter search", () => {
		const risk = RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL.riskControl;
		assert.equal(risk.windowCommonSessions, 20);
		assert.equal(risk.minimumCommonReturns, 19);
		assert.equal(risk.targetAnnualizedVolatility, 0.1);
		assert.equal(risk.maximumMultiplier, 1);
		assert.equal(risk.parameterGridAllowed, false);
		assert.equal(risk.volatilityFloor, null);
		assert.equal(risk.smoothing, null);
		assert.equal(RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL.portfolio.leverageAllowed, false);
	});

	it("requires every unique economic and robustness gate", () => {
		const protocol = RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL;
		assert.equal(protocol.dataAccess.expectedMonthlyHoldingPeriods, 84);
		assert.equal(protocol.developmentGates.length, 19);
		assert.equal(new Set(protocol.developmentGates.map((gate) => gate.metric)).size, 19);
		assert.equal(protocol.decisionPolicy.requiresEveryGate, true);
		assert.equal(protocol.report.instrumentLevelOutput, false);
		assert.equal(protocol.report.selectedSymbolsOutput, false);
		assert.equal(protocol.report.overwrite, false);
		assert.equal(protocol.dataAccess.protected2016PlusDataRead, false);
		assert.equal(protocol.dataAccess.existingValidationFeaturesRead, false);
		assert.equal(protocol.dataAccess.existingTestLabelsRead, false);
	});
});
