import { RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL } from "@/lib/analysis/risk-controlled-momentum-v2-development";
import { RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY } from "@/lib/analysis/risk-controlled-momentum-v3-history";

export const RISK_CONTROLLED_MOMENTUM_V3_DEVELOPMENT_VERSION = "1.0.0";
export const RISK_CONTROLLED_MOMENTUM_V3_DEVELOPMENT_ID =
	"etf-risk-controlled-momentum-development-v3";

export const RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL = {
	...RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL,
	protocolVersion: RISK_CONTROLLED_MOMENTUM_V3_DEVELOPMENT_VERSION,
	developmentId: RISK_CONTROLLED_MOMENTUM_V3_DEVELOPMENT_ID,
	registeredAt: "2026-08-21",
	sources: {
		...RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL.sources,
		infeasiblePredecessorSource: {
			developmentId: RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL.developmentId,
			provider: "alpaca",
			requestedFrom: "2007-01-01T00:00:00.000Z",
			requestedTo: "2015-12-31T23:59:59.999Z",
			observedFailure: "SPY returned no daily bars",
			decision: "source_infeasible_without_strategy_outcomes",
		},
		history: {
			path: RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY.outputPath,
			provider: RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY.provider,
			feed: RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY.feed,
			adjustment: RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY.adjustment,
			sha256Status: "registered_before_outcomes",
			sha256:
				"4d128a2e7782f6554f1f274aa92485064df97cda495ea5566c73b734206000f2",
			bytes: 27_239_858,
			registeredAt: "2026-08-21",
		},
	},
	dataAccess: {
		...RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL.dataAccess,
		formationHistoryStartsAt: RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY.requestedFrom,
		alpacaPre2016ResponsesRead: true,
		alpacaPre2016NonemptyBarsRead: false,
		tiingoHistoryRead: true,
	},
	report: {
		...RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL.report,
		outputPath:
			"artifacts/analysis/etf-risk-controlled-momentum-v3-development-report.json",
	},
	decisionPolicy: {
		...RISK_CONTROLLED_MOMENTUM_V2_PROTOCOL.decisionPolicy,
		fail: "reject_exact_v3_without_tuning_or_rerun_on_this_source",
	},
	prohibitions: [
		"Do not fetch Tiingo history until this protocol and the guarded fetcher are reviewed and committed together.",
		"Do not calculate outcomes until the fetched Tiingo history checksum is registered without changing mechanics or gates.",
		"Do not test another volatility target, window, estimator, floor, smoothing rule, trend filter, stop, or target.",
		"Do not substitute symbols or weaken coverage after Tiingo history is retrieved.",
		"Do not combine Alpaca and Tiingo bars within this experiment.",
		"Do not emit selected symbols or instrument-level outcomes.",
		"Do not open or repurpose any existing 2016-plus, validation, or test data.",
	] as const,
} as const;
