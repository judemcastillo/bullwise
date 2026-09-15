import type { AnalysisPanelResponse } from "@/lib/analysis/transparent-analysis-panel.types";

export type TransparentAnalysisAiSelectionAcceptanceV1Mutation =
	| "malformed_or_truncated"
	| "extra_field"
	| "wrong_version"
	| "unknown_overview_id"
	| "different_overview_membership"
	| "cross_factor_id"
	| "missing_factor_fact"
	| "duplicate_factor_fact";

export type TransparentAnalysisAiSelectionAcceptanceV1Fixture = {
	id: string;
	kind: "generation" | "unavailable_input" | "provider_failure" | "invalid_output";
	panel: AnalysisPanelResponse;
	mutation?: TransparentAnalysisAiSelectionAcceptanceV1Mutation;
};

type TrendState = "bullish" | "mixed" | "bearish";
type MomentumState = "bullish" | "mixed" | "bearish";
type VolatilityState = "low" | "normal" | "high";
type ParticipationState = "weak" | "normal" | "strong" | "unavailable";

const DISCLAIMER = "Descriptive market context—not investment advice or a trading signal.";

function context(trend: TrendState, momentum: MomentumState) {
	if (trend === "bullish" && momentum === "bullish") return "constructive" as const;
	if (trend === "bearish" && momentum === "bearish") return "defensive" as const;
	return "mixed" as const;
}

function trendFacts(state: TrendState, index: number) {
	if (state === "bullish") {
		return {
			evidence: [`Closing price is above its ${140 + index}-day trend average.`],
			counterEvidence: ["The faster trend average has flattened recently."],
		};
	}
	if (state === "mixed") {
		return {
			evidence: [`Closing price is above its ${45 + index}-day average.`],
			counterEvidence: [`Closing price remains below its ${170 + index}-day average.`],
		};
	}
	return {
		evidence: ["The shortest trend slope turned slightly positive."],
		counterEvidence: [`Closing price is below its ${160 + index}-day trend average.`],
	};
}

function momentumFacts(state: MomentumState, index: number) {
	if (state === "bullish") {
		return {
			evidence: [`The 15-day return is ${(2 + index / 10).toFixed(1)}%.`],
			counterEvidence: ["The latest session finished below its opening level."],
		};
	}
	if (state === "mixed") {
		return {
			evidence: [`The 7-day return is ${(1 + index / 20).toFixed(2)}%.`],
			counterEvidence: [`The 21-day return is -${(1 + index / 15).toFixed(2)}%.`],
		};
	}
	return {
		evidence: [`The latest session return is ${(index / 25).toFixed(2)}%.`],
		counterEvidence: [`The 21-day return is -${(2 + index / 10).toFixed(1)}%.`],
	};
}

function volatilityFacts(state: VolatilityState, index: number) {
	const realized = state === "low" ? 9 + index / 20 : state === "normal" ? 18 + index / 10 : 35 + index / 5;
	const percentile = state === "low" ? 18 + index : state === "normal" ? 46 + index : 76 + index;
	return {
		evidence: [
			`Twenty-day realized volatility is ${realized.toFixed(1)}%.`,
			`Current volatility is in the ${percentile}th percentile of this synthetic history.`,
		],
		counterEvidence: state === "high"
			? ["Recent daily returns have dispersed more widely than their usual range."]
			: [],
	};
}

function participationFacts(state: ParticipationState, index: number) {
	if (state === "unavailable") {
		return {
			evidence: [],
			counterEvidence: ["Recent participation could not be measured from the supplied volume history."],
		};
	}
	if (state === "weak") {
		return {
			evidence: [`Latest volume is ${(0.5 + index / 100).toFixed(2)} standard deviations below its 30-day baseline.`],
			counterEvidence: ["Participation has remained below its usual range."],
		};
	}
	if (state === "strong") {
		return {
			evidence: [`Latest volume is ${(1.3 + index / 50).toFixed(2)} standard deviations above its 30-day baseline.`],
			counterEvidence: [],
		};
	}
	return {
		evidence: [`Latest volume is ${(0.1 + index / 200).toFixed(3)} standard deviations from its 30-day baseline.`],
		counterEvidence: [],
	};
}

function availablePanel(input: {
	index: number;
	trend: TrendState;
	momentum: MomentumState;
	volatility: VolatilityState;
	participation: ParticipationState;
	warnings?: string[];
}): AnalysisPanelResponse {
	const warnings = input.warnings ?? [];
	return {
		version: "1.0.0",
		status: warnings.length > 0 || input.participation === "unavailable" ? "partial" : "ready",
		instrument: {
			canonicalKey: `equity:xnas:acceptance-${input.index}`,
			displaySymbol: `AC${input.index.toString().padStart(2, "0")}`,
			name: `Synthetic Acceptance ${input.index}`,
			currency: "USD",
		},
		asOf: "2026-09-04T20:00:00.000Z",
		timeframe: { interval: "1d", description: "Daily context" },
		context: context(input.trend, input.momentum),
		factors: {
			trend: { state: input.trend, ...trendFacts(input.trend, input.index) },
			momentum: { state: input.momentum, ...momentumFacts(input.momentum, input.index) },
			volatility: { state: input.volatility, ...volatilityFacts(input.volatility, input.index) },
			participation: {
				state: input.participation,
				...participationFacts(input.participation, input.index),
			},
		},
		levels: { support: [], resistance: [] },
		dataQuality: {
			provider: "synthetic_acceptance_v1",
			interval: "1d",
			adjusted: true,
			barsUsed: 420 + input.index,
			firstBarAt: "2025-01-02T05:00:00.000Z",
			lastBarAt: "2026-09-04T04:00:00.000Z",
			completedThrough: "2026-09-04T20:00:00.000Z",
			warnings,
		},
		disclaimer: DISCLAIMER,
	};
}

function unavailablePanel(reason: "bars_provider_unavailable" | "insufficient_history" | "stale_market_data"):
	AnalysisPanelResponse {
	return {
		version: "1.0.0",
		status: "unavailable",
		reason,
		message: "Synthetic acceptance input is unavailable.",
		disclaimer: DISCLAIMER,
	};
}

const generationSpecifications = [
	["bullish", "bullish", "normal", "normal", []],
	["bullish", "mixed", "low", "strong", []],
	["bullish", "bearish", "high", "weak", []],
	["mixed", "bullish", "normal", "unavailable", ["Recent volume history is incomplete."]],
	["mixed", "mixed", "high", "normal", []],
	["mixed", "bearish", "low", "strong", []],
	["bearish", "bullish", "high", "weak", []],
	["bearish", "mixed", "normal", "normal", []],
	["bearish", "bearish", "low", "unavailable", ["Recent volume history is incomplete."]],
	["bullish", "bullish", "high", "strong", ["Additional synthetic quality review is required."]],
	["bullish", "mixed", "normal", "weak", ["SPY benchmark history is unavailable."]],
	["bullish", "bearish", "low", "normal", []],
	["mixed", "bullish", "high", "unavailable", ["SPY benchmark and volume history are unavailable."]],
	["mixed", "mixed", "low", "weak", []],
	["mixed", "bearish", "normal", "strong", ["Additional synthetic quality review is required."]],
	["bearish", "bullish", "low", "normal", []],
	["bearish", "mixed", "high", "strong", []],
	["bearish", "bearish", "normal", "weak", ["SPY benchmark history is unavailable."]],
	["bullish", "bullish", "low", "unavailable", ["Recent volume history is incomplete."]],
	["bearish", "bearish", "high", "normal", []],
] as const satisfies readonly (readonly [
	TrendState,
	MomentumState,
	VolatilityState,
	ParticipationState,
	readonly string[],
])[];

const generationFixtures = generationSpecifications.map(
	([trend, momentum, volatility, participation, warnings], zeroIndex) => ({
		id: `acceptance-generation-${(zeroIndex + 1).toString().padStart(2, "0")}`,
		kind: "generation" as const,
		panel: availablePanel({
			index: zeroIndex + 1,
			trend,
			momentum,
			volatility,
			participation,
			warnings: [...warnings],
		}),
	}),
);

const boundaryPanel = availablePanel({
	index: 21,
	trend: "mixed",
	momentum: "mixed",
	volatility: "normal",
	participation: "normal",
});

export const TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_FIXTURES = [
	...generationFixtures,
	...(["bars_provider_unavailable", "insufficient_history", "stale_market_data"] as const).map(
		(reason) => ({
			id: `acceptance-unavailable-${reason}`,
			kind: "unavailable_input" as const,
			panel: unavailablePanel(reason),
		})),
	{
		id: "acceptance-provider-failure",
		kind: "provider_failure",
		panel: boundaryPanel,
	},
	...([
		"malformed_or_truncated",
		"extra_field",
		"wrong_version",
		"unknown_overview_id",
		"different_overview_membership",
		"cross_factor_id",
		"missing_factor_fact",
		"duplicate_factor_fact",
	] as const).map((mutation) => ({
		id: `acceptance-invalid-${mutation}`,
		kind: "invalid_output" as const,
		panel: boundaryPanel,
		mutation,
	})),
] as const satisfies readonly TransparentAnalysisAiSelectionAcceptanceV1Fixture[];

export const TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_FIXTURES_SHA256 =
	"1db7f16b9eb1c8ad204932c29ebfe69901a3190df30bc25c3085f4125c0999db";
