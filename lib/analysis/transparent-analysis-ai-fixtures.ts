import type { AnalysisPanelResponse } from "@/lib/analysis/transparent-analysis-panel.types";

export type TransparentAnalysisAiFixture = {
	id: string;
	kind: "generation" | "unavailable_input" | "provider_failure" | "invalid_output";
	panel: AnalysisPanelResponse;
	expected: "accept" | "do_not_call" | "fallback";
	tags: string[];
	mutation?:
		| "malformed_or_truncated"
		| "extra_field"
		| "context_and_state_drift"
		| "limitations_and_disclaimer_drift"
		| "fake_citation"
		| "cross_factor_citation"
		| "invented_number"
		| "advice_and_unsupported_domain";
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

function availablePanel(input: {
	trend?: TrendState;
	momentum?: MomentumState;
	volatility?: VolatilityState;
	participation?: ParticipationState;
	warnings?: string[];
	conflictingEvidence?: boolean;
} = {}): AnalysisPanelResponse {
	const trend = input.trend ?? "bullish";
	const momentum = input.momentum ?? "bullish";
	const volatility = input.volatility ?? "normal";
	const participation = input.participation ?? "normal";
	const warnings = input.warnings ?? [];
	return {
		version: "1.0.0",
		status:
			warnings.length > 0 || participation === "unavailable" ? "partial" : "ready",
		instrument: {
			canonicalKey: "equity:xnas:fixture",
			displaySymbol: "FIXTURE",
			name: "Synthetic Fixture",
			currency: "USD",
		},
		asOf: "2026-09-02T20:00:00.000Z",
		timeframe: { interval: "1d", description: "Daily context" },
		context: context(trend, momentum),
		factors: {
			trend: {
				state: trend,
				evidence:
					trend === "bullish" ? ["Price is above its 200-day moving average."] : [],
				counterEvidence: [
					trend === "bearish"
						? "Price is below its 200-day moving average."
						: "The daily moving averages are not fully aligned.",
					...(input.conflictingEvidence
						? ["Short- and medium-term moving-average slopes disagree."]
						: []),
				],
			},
			momentum: {
				state: momentum,
				evidence:
					momentum === "bullish" ? ["The 20-day return is positive."] : [],
				counterEvidence:
					momentum === "bearish"
						? ["The 20-day return is negative."]
						: ["Daily MACD momentum is negative."],
			},
			volatility: {
				state: volatility,
				evidence: ["20-day realized volatility is 24.5%.", "Current volatility is in the 58th percentile of the available history."],
				counterEvidence:
					volatility === "high" ? ["Recent returns have varied more than usual."] : [],
			},
			participation: {
				state: participation,
				evidence:
					participation === "unavailable"
						? []
						: ["Latest volume is 0.8 standard deviations from its 20-day baseline."],
				counterEvidence:
					participation === "unavailable"
						? ["Recent volume participation could not be calculated."]
						: participation === "weak"
							? ["Recent volume participation is below its normal range."]
							: [],
			},
		},
		levels: { support: [], resistance: [] },
		dataQuality: {
			provider: "synthetic",
			interval: "1d",
			adjusted: true,
			barsUsed: 475,
			firstBarAt: "2024-10-01T04:00:00.000Z",
			lastBarAt: "2026-09-02T04:00:00.000Z",
			completedThrough: "2026-09-02T20:00:00.000Z",
			warnings,
		},
		disclaimer: DISCLAIMER,
	};
}

function unavailablePanel(
	reason: Extract<AnalysisPanelResponse, { status: "unavailable" }>["reason"],
): AnalysisPanelResponse {
	return {
		version: "1.0.0",
		status: "unavailable",
		reason,
		message: "Synthetic unavailable fixture.",
		disclaimer: DISCLAIMER,
	};
}

const contextFixtures: TransparentAnalysisAiFixture[] = ([
	"bullish",
	"mixed",
	"bearish",
] as const).flatMap((trend) =>
	(["bullish", "mixed", "bearish"] as const).map((momentum) => ({
		id: `context-${trend}-${momentum}`,
		kind: "generation" as const,
		panel: availablePanel({ trend, momentum }),
		expected: "accept" as const,
		tags: ["context_matrix", `trend_${trend}`, `momentum_${momentum}`],
	})),
);

const stateFixtures: TransparentAnalysisAiFixture[] = [
	...(["low", "normal", "high"] as const).map((volatility) => ({
		id: `volatility-${volatility}`,
		kind: "generation" as const,
		panel: availablePanel({ volatility }),
		expected: "accept" as const,
		tags: ["volatility_state", volatility],
	})),
	...(["weak", "normal", "strong", "unavailable"] as const).map(
		(participation) => ({
			id: `participation-${participation}`,
			kind: "generation" as const,
			panel: availablePanel({ participation }),
			expected: "accept" as const,
			tags: ["participation_state", participation],
		}),
	),
];

const qualityFixtures: TransparentAnalysisAiFixture[] = [
	{
		id: "partial-missing-participation",
		kind: "generation",
		panel: availablePanel({
			participation: "unavailable",
			warnings: ["Recent volume data are incomplete; participation may be unavailable."],
		}),
		expected: "accept",
		tags: ["partial", "missing_participation"],
	},
	{
		id: "partial-missing-relative-strength",
		kind: "generation",
		panel: availablePanel({
			warnings: ["SPY benchmark data are unavailable; relative strength is omitted."],
		}),
		expected: "accept",
		tags: ["partial", "missing_relative_strength"],
	},
	{
		id: "partial-other-warning-and-conflict",
		kind: "generation",
		panel: availablePanel({
			warnings: ["Additional market-data quality checks require review."],
			conflictingEvidence: true,
		}),
		expected: "accept",
		tags: ["partial", "other_warning", "conflicting_evidence", "numeric_evidence"],
	},
	{
		id: "ready-conflicting-numeric-evidence",
		kind: "generation",
		panel: availablePanel({ conflictingEvidence: true }),
		expected: "accept",
		tags: ["conflicting_evidence", "numeric_evidence"],
	},
];

const boundaryFixtures: TransparentAnalysisAiFixture[] = [
	...(["bars_provider_unavailable", "insufficient_history", "stale_market_data"] as const).map(
		(reason) => ({
			id: `unavailable-${reason}`,
			kind: "unavailable_input" as const,
			panel: unavailablePanel(reason),
			expected: "do_not_call" as const,
			tags: ["unavailable_input", reason],
		}),
	),
	{
		id: "provider-failure",
		kind: "provider_failure",
		panel: availablePanel(),
		expected: "fallback",
		tags: ["provider_failure", "timeout"],
	},
	...([
		"malformed_or_truncated",
		"extra_field",
		"context_and_state_drift",
		"limitations_and_disclaimer_drift",
		"fake_citation",
		"cross_factor_citation",
		"invented_number",
		"advice_and_unsupported_domain",
	] as const).map((mutation) => ({
		id: `invalid-${mutation}`,
		kind: "invalid_output" as const,
		panel: availablePanel({
			participation:
				mutation === "limitations_and_disclaimer_drift" ? "unavailable" : "normal",
		}),
		expected: "fallback" as const,
		tags: ["adversarial_output", mutation],
		mutation,
	})),
];

export const TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES = [
	...contextFixtures,
	...stateFixtures,
	...qualityFixtures,
	...boundaryFixtures,
] as const satisfies readonly TransparentAnalysisAiFixture[];
