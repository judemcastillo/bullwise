import { RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL } from "@/lib/analysis/risk-controlled-momentum-v3-development";

export const RISK_CONTROLLED_MOMENTUM_V3_CLOSURE_VERSION = "1.0.0";
export const RISK_CONTROLLED_MOMENTUM_V3_CLOSURE_STATUS =
	"source_infeasible_without_complete_valuation_data";

export const RISK_CONTROLLED_MOMENTUM_V3_CLOSURE = {
	closureVersion: RISK_CONTROLLED_MOMENTUM_V3_CLOSURE_VERSION,
	developmentId: RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL.developmentId,
	recordedAt: "2026-08-21",
	registeredHistory: {
		sha256: RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL.sources.history.sha256,
		bytes: RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL.sources.history.bytes,
	},
	status: RISK_CONTROLLED_MOMENTUM_V3_CLOSURE_STATUS,
	failureStage: "development_execution_before_report",
	observedFailure: "held instrument lacks a valuation bar",
	sourceDiagnostics: {
		portfolioBenchmarkSessions: 1_762,
		allManifestCommonSessions: 1_761,
		incompleteBenchmarkSessions: 1,
		affectedInstruments: 2,
		maximumMissingSessionsPerInstrument: 1,
		incompleteSession: "2010-05-06T00:00:00.000Z",
	},
	outcomes: {
		reportWritten: false,
		completedPerformanceEvaluation: false,
		gateDecisionProduced: false,
		protected2016PlusFeaturesOrLabelsRead: false,
		validationFeaturesOrLabelsRead: false,
		testFeaturesOrLabelsRead: false,
	},
	authorizations: {
		rerunExactV3: false,
		imputeOrDeleteMissingSessions: false,
		excludeAffectedInstruments: false,
		mixDataProviders: false,
		validationOrHoldoutEvaluation: false,
		customerSignalsOrLiveTrading: false,
		newStrategyExperiment: false,
	},
	nextDirection:
		"transparent_market_analysis_and_risk_context_without_authoritative_trade_signals",
} as const;

export function assertRiskControlledMomentumV3IsOpen(): never {
	throw new Error(
		`The v3 experiment is closed: ${RISK_CONTROLLED_MOMENTUM_V3_CLOSURE.status}. Rerun is prohibited.`,
	);
}
