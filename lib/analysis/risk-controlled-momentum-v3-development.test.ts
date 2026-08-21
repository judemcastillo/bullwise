import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL } from "@/lib/analysis/risk-controlled-momentum-v2-development";
import { RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL } from "@/lib/analysis/risk-controlled-momentum-v3-development";
import { RISK_CONTROLLED_MOMENTUM_V2_MANIFEST_SHA256 } from "@/lib/analysis/risk-controlled-momentum-v2-universe";

describe("risk-controlled momentum v3 Tiingo preregistration", () => {
	it("changes only the source contract and versioned outputs", () => {
		const protocol = RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL;
		assert.equal(protocol.sources.universeManifestSha256, RISK_CONTROLLED_MOMENTUM_V2_MANIFEST_SHA256);
		assert.equal(protocol.sources.history.provider, "tiingo");
		assert.equal(protocol.sources.history.feed, "eod_composite");
		assert.equal(protocol.sources.history.sha256Status, "registered_before_outcomes");
		assert.equal(
			protocol.sources.history.sha256,
			"4d128a2e7782f6554f1f274aa92485064df97cda495ea5566c73b734206000f2",
		);
		assert.equal(protocol.sources.history.bytes, 27_239_858);
		assert.equal(protocol.sources.infeasiblePredecessorSource.decision, "source_infeasible_without_strategy_outcomes");
		assert.deepEqual(protocol.signal, RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL.signal);
		assert.deepEqual(protocol.portfolio, RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL.portfolio);
		assert.deepEqual(protocol.riskControl, RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL.riskControl);
		assert.deepEqual(protocol.costs, RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL.costs);
		assert.deepEqual(protocol.comparators, RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL.comparators);
		assert.deepEqual(protocol.developmentGates, RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL.developmentGates);
	});

	it("preserves the untouched period and coverage gates", () => {
		const protocol = RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL;
		assert.equal(protocol.dataAccess.expectedMonthlyHoldingPeriods, 84);
		assert.equal(protocol.dataAccess.protected2016PlusDataRead, false);
		assert.equal(protocol.dataAccess.tiingoHistoryRead, true);
		assert.equal(protocol.coverage.manifestCandidates, 48);
		assert.equal(protocol.coverage.minimumEligibleInstruments, 40);
		assert.equal(protocol.coverage.minimumEligibleInstrumentsPerSleeve, 10);
	});

	it("keeps all-gates, aggregate-only, no-overwrite safeguards", () => {
		const protocol = RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL;
		assert.equal(protocol.developmentGates.length, 19);
		assert.equal(protocol.decisionPolicy.requiresEveryGate, true);
		assert.equal(protocol.report.instrumentLevelOutput, false);
		assert.equal(protocol.report.selectedSymbolsOutput, false);
		assert.equal(protocol.report.overwrite, false);
		assert.match(protocol.report.outputPath, /v3/);
		assert.ok(protocol.prohibitions.includes("Do not combine Alpaca and Tiingo bars within this experiment."));
	});
});
