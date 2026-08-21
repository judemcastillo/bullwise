import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	assertRiskControlledMomentumV3IsOpen,
	RISK_CONTROLLED_MOMENTUM_V3_CLOSURE,
} from "@/lib/analysis/risk-controlled-momentum-v3-closure";
import { RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL } from "@/lib/analysis/risk-controlled-momentum-v3-development";

describe("risk-controlled momentum v3 closure", () => {
	it("binds the source-infeasible decision to the registered artifact", () => {
		assert.equal(
			RISK_CONTROLLED_MOMENTUM_V3_CLOSURE.developmentId,
			RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL.developmentId,
		);
		assert.deepEqual(RISK_CONTROLLED_MOMENTUM_V3_CLOSURE.registeredHistory, {
			sha256:
				"4d128a2e7782f6554f1f274aa92485064df97cda495ea5566c73b734206000f2",
			bytes: 27_239_858,
		});
		assert.equal(
			RISK_CONTROLLED_MOMENTUM_V3_CLOSURE.status,
			"source_infeasible_without_complete_valuation_data",
		);
	});

	it("records only aggregate diagnostics and no completed outcome", () => {
		assert.deepEqual(RISK_CONTROLLED_MOMENTUM_V3_CLOSURE.sourceDiagnostics, {
			portfolioBenchmarkSessions: 1_762,
			allManifestCommonSessions: 1_761,
			incompleteBenchmarkSessions: 1,
			affectedInstruments: 2,
			maximumMissingSessionsPerInstrument: 1,
			incompleteSession: "2010-05-06T00:00:00.000Z",
		});
		assert.deepEqual(RISK_CONTROLLED_MOMENTUM_V3_CLOSURE.outcomes, {
			reportWritten: false,
			completedPerformanceEvaluation: false,
			gateDecisionProduced: false,
			protected2016PlusFeaturesOrLabelsRead: false,
			validationFeaturesOrLabelsRead: false,
			testFeaturesOrLabelsRead: false,
		});
		const serialized = JSON.stringify(RISK_CONTROLLED_MOMENTUM_V3_CLOSURE);
		assert.doesNotMatch(serialized, /IJJ|selectedIds|instrumentOutcomes/);
	});

	it("prevents rerunning or silently repairing the closed experiment", () => {
		assert.deepEqual(RISK_CONTROLLED_MOMENTUM_V3_CLOSURE.authorizations, {
			rerunExactV3: false,
			imputeOrDeleteMissingSessions: false,
			excludeAffectedInstruments: false,
			mixDataProviders: false,
			validationOrHoldoutEvaluation: false,
			customerSignalsOrLiveTrading: false,
			newStrategyExperiment: false,
		});
		assert.throws(
			assertRiskControlledMomentumV3IsOpen,
			/source_infeasible_without_complete_valuation_data.*Rerun is prohibited/,
		);
	});
});
