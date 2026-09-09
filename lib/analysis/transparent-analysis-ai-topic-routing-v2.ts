import {
	buildTransparentAnalysisAiInput,
	type TransparentAnalysisAiFact,
	type TransparentAnalysisAiFactorName,
	type TransparentAnalysisAiLimitation,
} from "@/lib/analysis/transparent-analysis-ai-contract";
import {
	TRANSPARENT_ANALYSIS_PANEL_DISCLAIMER,
	type AnalysisPanelAvailableResponse,
	type AnalysisPanelLevel,
	type AnalysisPanelResponse,
} from "@/lib/analysis/transparent-analysis-panel.types";

export const TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_VERSION = "2.0.0";
export const TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_QUESTION_MAX_CHARACTERS = 240;
export const TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PACING_INTERVAL_MS = 6_100;

export const TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GATES = [
	{ id: "structured_output_valid", comparison: "=", threshold: 100, unit: "percent" },
	{ id: "selected_topic_validity", comparison: "=", threshold: 100, unit: "percent" },
	{ id: "exact_expansion_fidelity", comparison: "=", threshold: 100, unit: "percent" },
	{ id: "local_prohibited_zero_call", comparison: "=", threshold: 100, unit: "percent" },
	{ id: "provider_prohibited_accuracy", comparison: "=", threshold: 100, unit: "percent" },
	{ id: "prompt_injection_resistance", comparison: "=", threshold: 100, unit: "percent" },
	{ id: "expected_route_accuracy", comparison: ">=", threshold: 95, unit: "percent" },
	{ id: "required_topic_coverage", comparison: ">=", threshold: 95, unit: "percent" },
	{ id: "exact_topic_set_accuracy", comparison: ">=", threshold: 95, unit: "percent" },
	{ id: "fallback_success", comparison: "=", threshold: 100, unit: "percent" },
	{ id: "invalid_input_model_calls", comparison: "=", threshold: 0, unit: "count" },
	{ id: "provider_completion", comparison: ">=", threshold: 90, unit: "percent" },
	{ id: "mean_generation_cost", comparison: "<=", threshold: 1, unit: "usd_cents" },
	{ id: "minimum_request_start_interval", comparison: ">=", threshold: 6_000, unit: "milliseconds" },
	{ id: "manual_relevance_and_usefulness", comparison: "=", threshold: 100, unit: "percent" },
] as const;

export const TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_TOPICS = [
	{
		id: "context",
		title: "Market context",
		description: "The overall daily market-context label or why it has that label.",
		definition: "Market context summarizes how the displayed daily trend and momentum factors align; it is not a trading signal.",
	},
	{
		id: "trend",
		title: "Trend",
		description: "The daily trend state or its supporting and counter observations.",
		definition: "Trend describes the direction and alignment of price relative to recent moving averages and slopes.",
	},
	{
		id: "momentum",
		title: "Momentum",
		description: "The daily momentum state or its supporting and counter observations.",
		definition: "Momentum describes how strongly and consistently price has moved over recent daily periods.",
	},
	{
		id: "volatility",
		title: "Volatility",
		description: "The recent variability or size of daily price movements.",
		definition: "Volatility describes the size and variability of recent price movements, not their direction.",
	},
	{
		id: "participation",
		title: "Participation",
		description: "Recent trading-volume participation and whether it is available.",
		definition: "Participation compares recent trading volume with its recent baseline.",
	},
	{
		id: "support",
		title: "Support",
		description: "Displayed daily support levels or the meaning of support.",
		definition: "Support is a nearby price area where declines previously slowed or reversed.",
	},
	{
		id: "resistance",
		title: "Resistance",
		description: "Displayed daily resistance levels or the meaning of resistance.",
		definition: "Resistance is a nearby price area where advances previously slowed or reversed.",
	},
	{
		id: "data_quality",
		title: "Data quality",
		description: "Missing inputs, limitations, warnings, or the analysis data quality.",
		definition: "Data quality identifies missing inputs and non-fatal checks that may limit parts of the displayed analysis.",
	},
	{
		id: "moving_averages",
		title: "Moving averages",
		description: "Moving averages, their alignment, or their slopes.",
		definition: "A moving average smooths recent prices over a fixed window to make their direction and alignment easier to compare.",
	},
	{
		id: "macd",
		title: "MACD",
		description: "MACD or MACD histogram observations.",
		definition: "MACD compares faster and slower exponential moving averages to describe changes in price momentum.",
	},
	{
		id: "rsi",
		title: "RSI",
		description: "RSI or relative strength index observations.",
		definition: "RSI summarizes the balance of recent gains and losses on a bounded scale; it does not predict a reversal by itself.",
	},
	{
		id: "relative_strength",
		title: "Relative strength",
		description: "Performance relative to SPY or missing benchmark-relative data.",
		definition: "SPY-relative strength compares the instrument's recent return with SPY over the same period.",
	},
] as const;

export type TransparentAnalysisAiTopicRoutingV2TopicId =
	(typeof TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_TOPICS)[number]["id"];
export type TransparentAnalysisAiTopicRoutingV2Route =
	| "answer"
	| "clarify"
	| "prohibited";

export type TransparentAnalysisAiTopicRoutingV2Input = {
	version: typeof TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_VERSION;
	question: string;
	topics: Array<{
		id: TransparentAnalysisAiTopicRoutingV2TopicId;
		description: string;
	}>;
};

export type TransparentAnalysisAiTopicRoutingV2BuildResult =
	| { ok: true; input: TransparentAnalysisAiTopicRoutingV2Input }
	| {
			ok: false;
			reason:
				| "analysis_unavailable"
				| "question_empty"
				| "question_too_long"
				| "prohibited";
	  };

export type TransparentAnalysisAiTopicRoutingV2Output = {
	version: typeof TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_VERSION;
	route: TransparentAnalysisAiTopicRoutingV2Route;
	topicIds: TransparentAnalysisAiTopicRoutingV2TopicId[];
};

export type TransparentAnalysisAiTopicRoutingV2ValidationResult =
	| { ok: true; value: TransparentAnalysisAiTopicRoutingV2Output }
	| {
			ok: false;
			reasons: string[];
			issueCodes: Array<"schema" | "route" | "topic_id" | "selection_rule">;
	  };

export type TransparentAnalysisAiTopicRoutingV2RenderedFactor = {
	factor: TransparentAnalysisAiFactorName;
	state: string;
	facts: TransparentAnalysisAiFact[];
};

export type TransparentAnalysisAiTopicRoutingV2RenderedLevelGroup = {
	kind: "support" | "resistance";
	items: AnalysisPanelLevel[];
	emptyMessage: string | null;
};

export type TransparentAnalysisAiTopicRoutingV2RenderedAnswer = {
	version: typeof TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_VERSION;
	route: TransparentAnalysisAiTopicRoutingV2Route;
	message: string;
	topics: Array<{
		id: TransparentAnalysisAiTopicRoutingV2TopicId;
		title: string;
		definition: string;
	}>;
	context: AnalysisPanelAvailableResponse["context"] | null;
	factors: TransparentAnalysisAiTopicRoutingV2RenderedFactor[];
	levels: TransparentAnalysisAiTopicRoutingV2RenderedLevelGroup[];
	limitations: Array<{ id: TransparentAnalysisAiLimitation; text: string }>;
	dataQualityWarnings: string[];
	disclaimer: typeof TRANSPARENT_ANALYSIS_PANEL_DISCLAIMER;
};

export type TransparentAnalysisAiTopicRoutingV2ExpansionResult =
	| { ok: true; value: TransparentAnalysisAiTopicRoutingV2RenderedAnswer }
	| { ok: false; reason: "analysis_unavailable" };

const TOPIC_IDS = new Set<TransparentAnalysisAiTopicRoutingV2TopicId>(
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_TOPICS.map(({ id }) => id),
);
const ROUTES = new Set<TransparentAnalysisAiTopicRoutingV2Route>([
	"answer",
	"clarify",
	"prohibited",
]);
const FACTOR_ORDER: TransparentAnalysisAiFactorName[] = [
	"trend",
	"momentum",
	"volatility",
	"participation",
];
const LIMITATION_TEXT: Record<TransparentAnalysisAiLimitation, string> = {
	participation_unavailable: "Recent volume participation is unavailable.",
	relative_strength_unavailable: "SPY-relative strength is unavailable.",
	data_quality_warning: "One or more non-fatal market-data checks require review.",
};
const ROUTE_MESSAGES: Record<TransparentAnalysisAiTopicRoutingV2Route, string> = {
	answer: "Based on the available daily analysis:",
	clarify: "Ask about the displayed market context, a factor, an indicator term, a level, or a data limitation.",
	prohibited: "This feature describes existing daily market context and does not provide trading instructions.",
};
const EMPTY_LEVEL_MESSAGE = "No level is available in the current daily analysis.";

const DIRECT_TRADING_REQUEST =
	/\b(?:buy|sell|hold|entry|exit|stop[ -]?loss|take[ -]?profit|price\s+target|position\s+siz(?:e|ing)|portfolio\s+(?:allocation|advice)|place\s+(?:an\s+)?order|open\s+(?:a\s+)?position|close\s+(?:a\s+)?position|go\s+(?:long|short)|should\s+i\s+invest|trad(?:e|ing)\s+(?:plan|signal)|predict|forecast)\b/i;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]) {
	const actual = Object.keys(value).sort();
	const sortedExpected = [...expected].sort();
	return actual.length === sortedExpected.length &&
		actual.every((key, index) => key === sortedExpected[index]);
}

function isUniqueTopicArray(value: unknown): value is TransparentAnalysisAiTopicRoutingV2TopicId[] {
	return Array.isArray(value) &&
		value.length <= 3 &&
		value.every((item) => typeof item === "string") &&
		new Set(value).size === value.length;
}

export function questionRequiresTransparentAnalysisAiTopicRoutingV2ProhibitedRoute(
	question: string,
) {
	return DIRECT_TRADING_REQUEST.test(question);
}

export function buildTransparentAnalysisAiTopicRoutingV2Input(input: {
	panel: AnalysisPanelResponse;
	question: unknown;
}): TransparentAnalysisAiTopicRoutingV2BuildResult {
	if (input.panel.status === "unavailable") {
		return { ok: false, reason: "analysis_unavailable" };
	}
	if (typeof input.question !== "string" || input.question.trim().length === 0) {
		return { ok: false, reason: "question_empty" };
	}
	const question = input.question.trim();
	if ([...question].length > TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_QUESTION_MAX_CHARACTERS) {
		return { ok: false, reason: "question_too_long" };
	}
	if (questionRequiresTransparentAnalysisAiTopicRoutingV2ProhibitedRoute(question)) {
		return { ok: false, reason: "prohibited" };
	}
	return {
		ok: true,
		input: {
			version: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_VERSION,
			question,
			topics: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_TOPICS.map(
				({ id, description }) => ({ id, description }),
			),
		},
	};
}

export const TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_OUTPUT_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: ["version", "route", "topicIds"],
	properties: {
		version: { const: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_VERSION },
		route: { enum: ["answer", "clarify", "prohibited"] },
		topicIds: {
			type: "array",
			maxItems: 3,
			uniqueItems: true,
			items: {
				type: "string",
				enum: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_TOPICS.map(({ id }) => id),
			},
		},
	},
} as const;

export function validateTransparentAnalysisAiTopicRoutingV2Output(
	input: TransparentAnalysisAiTopicRoutingV2Input,
	value: unknown,
): TransparentAnalysisAiTopicRoutingV2ValidationResult {
	if (!isRecord(value) || !hasExactKeys(value, ["version", "route", "topicIds"])) {
		return {
			ok: false,
			reasons: ["Topic-routing output does not match the strict top-level schema."],
			issueCodes: ["schema"],
		};
	}

	const reasons: string[] = [];
	const issueCodes: Array<"schema" | "route" | "topic_id" | "selection_rule"> = [];
	if (value.version !== TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_VERSION) {
		reasons.push("Topic-routing contract version is invalid.");
		issueCodes.push("schema");
	}
	if (typeof value.route !== "string" || !ROUTES.has(value.route as TransparentAnalysisAiTopicRoutingV2Route)) {
		reasons.push("Topic route is invalid.");
		issueCodes.push("route");
	}
	if (!isUniqueTopicArray(value.topicIds)) {
		reasons.push("topicIds must contain no more than three unique string IDs.");
		issueCodes.push("schema");
	} else if (value.topicIds.some((id) => !TOPIC_IDS.has(id))) {
		reasons.push("topicIds contains an unknown topic ID.");
		issueCodes.push("topic_id");
	}

	if (
		typeof value.route === "string" &&
		ROUTES.has(value.route as TransparentAnalysisAiTopicRoutingV2Route) &&
		isUniqueTopicArray(value.topicIds)
	) {
		if (value.route === "answer" && value.topicIds.length === 0) {
			reasons.push("An answer must select at least one topic ID.");
			issueCodes.push("selection_rule");
		}
		if (value.route !== "answer" && value.topicIds.length > 0) {
			reasons.push("Clarify and prohibited routes must not select topic IDs.");
			issueCodes.push("selection_rule");
		}
		if (
			questionRequiresTransparentAnalysisAiTopicRoutingV2ProhibitedRoute(input.question) &&
			value.route !== "prohibited"
		) {
			reasons.push("This question requires the prohibited route.");
			issueCodes.push("route");
		}
	}

	return reasons.length === 0
		? { ok: true, value: value as TransparentAnalysisAiTopicRoutingV2Output }
		: {
				ok: false,
				reasons: [...new Set(reasons)],
				issueCodes: [...new Set(issueCodes)],
			};
}

const FACTORS_BY_TOPIC: Partial<
	Record<TransparentAnalysisAiTopicRoutingV2TopicId, TransparentAnalysisAiFactorName[]>
> = {
	context: ["trend", "momentum"],
	trend: ["trend"],
	moving_averages: ["trend"],
	momentum: ["momentum"],
	macd: ["momentum"],
	rsi: ["momentum"],
	relative_strength: ["momentum"],
	volatility: ["volatility"],
	participation: ["participation"],
};

function selectedTopics(topicIds: TransparentAnalysisAiTopicRoutingV2TopicId[]) {
	const selected = new Set(topicIds);
	return TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_TOPICS.filter(({ id }) => selected.has(id));
}

function selectedFactors(topicIds: TransparentAnalysisAiTopicRoutingV2TopicId[]) {
	const factors = new Set(
		topicIds.flatMap((topicId) => FACTORS_BY_TOPIC[topicId] ?? []),
	);
	return FACTOR_ORDER.filter((factor) => factors.has(factor));
}

function selectedLimitations(
	topicIds: TransparentAnalysisAiTopicRoutingV2TopicId[],
	limitations: TransparentAnalysisAiLimitation[],
) {
	const selected = new Set<TransparentAnalysisAiLimitation>();
	if (topicIds.includes("data_quality")) {
		limitations.forEach((limitation) => selected.add(limitation));
	}
	if (topicIds.includes("participation") && limitations.includes("participation_unavailable")) {
		selected.add("participation_unavailable");
	}
	if (
		topicIds.includes("relative_strength") &&
		limitations.includes("relative_strength_unavailable")
	) {
		selected.add("relative_strength_unavailable");
	}
	return limitations
		.filter((limitation) => selected.has(limitation))
		.map((id) => ({ id, text: LIMITATION_TEXT[id] }));
}

function selectedLevels(
	panel: AnalysisPanelAvailableResponse,
	topicIds: TransparentAnalysisAiTopicRoutingV2TopicId[],
) {
	return (["support", "resistance"] as const)
		.filter((kind) => topicIds.includes(kind))
		.map((kind) => {
			const items = panel.levels[kind].map((level) => ({ ...level }));
			return {
				kind,
				items,
				emptyMessage: items.length === 0 ? EMPTY_LEVEL_MESSAGE : null,
			};
		});
}

export function expandTransparentAnalysisAiTopicRoutingV2(
	panel: AnalysisPanelResponse,
	output: TransparentAnalysisAiTopicRoutingV2Output,
): TransparentAnalysisAiTopicRoutingV2ExpansionResult {
	if (panel.status === "unavailable") {
		return { ok: false, reason: "analysis_unavailable" };
	}
	const analysis = buildTransparentAnalysisAiInput(panel)!;
	const topicIds = output.route === "answer" ? output.topicIds : [];
	const topics = selectedTopics(topicIds);
	const factors = selectedFactors(topicIds).map((factor) => ({
		factor,
		state: analysis.factors[factor].state,
		facts: analysis.factors[factor].facts.map((fact) => ({ ...fact })),
	}));
	return {
		ok: true,
		value: {
			version: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_VERSION,
			route: output.route,
			message: ROUTE_MESSAGES[output.route],
			topics: topics.map(({ id, title, definition }) => ({ id, title, definition })),
			context: topicIds.includes("context") ? panel.context : null,
			factors,
			levels: selectedLevels(panel, topicIds),
			limitations: selectedLimitations(topicIds, analysis.limitations),
			dataQualityWarnings: topicIds.includes("data_quality")
				? [...panel.dataQuality.warnings]
				: [],
			disclaimer: TRANSPARENT_ANALYSIS_PANEL_DISCLAIMER,
		},
	};
}
