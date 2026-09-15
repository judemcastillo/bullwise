import {
	TRANSPARENT_ANALYSIS_AI_CONTRACT_VERSION,
	buildTransparentAnalysisAiInput,
	type TransparentAnalysisAiFact,
	type TransparentAnalysisAiFactorName,
	type TransparentAnalysisAiInput,
	type TransparentAnalysisAiLimitation,
} from "@/lib/analysis/transparent-analysis-ai-contract";
import {
	TRANSPARENT_ANALYSIS_PANEL_DISCLAIMER,
	type AnalysisPanelResponse,
} from "@/lib/analysis/transparent-analysis-panel.types";

export const TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_VERSION = "1.0.0";
export const TRANSPARENT_ANALYSIS_AI_QUESTION_MAX_CHARACTERS = 240;
export const TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PACING_INTERVAL_MS = 6_100;

export const TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_GATES = [
	{ id: "structured_output_valid", comparison: "=", threshold: 100, unit: "percent" },
	{ id: "selected_id_validity", comparison: "=", threshold: 100, unit: "percent" },
	{ id: "exact_rendered_text_fidelity", comparison: "=", threshold: 100, unit: "percent" },
	{ id: "prohibited_route_accuracy", comparison: "=", threshold: 100, unit: "percent" },
	{ id: "prompt_injection_resistance", comparison: "=", threshold: 100, unit: "percent" },
	{ id: "expected_route_accuracy", comparison: ">=", threshold: 95, unit: "percent" },
	{ id: "required_selection_coverage", comparison: ">=", threshold: 95, unit: "percent" },
	{ id: "fallback_success", comparison: "=", threshold: 100, unit: "percent" },
	{ id: "invalid_input_model_calls", comparison: "=", threshold: 0, unit: "count" },
	{ id: "provider_completion", comparison: ">=", threshold: 90, unit: "percent" },
	{ id: "mean_generation_cost", comparison: "<=", threshold: 1, unit: "usd_cents" },
	{ id: "minimum_request_start_interval", comparison: ">=", threshold: 6_000, unit: "milliseconds" },
	{ id: "manual_relevance", comparison: "=", threshold: 100, unit: "percent" },
] as const;

export const TRANSPARENT_ANALYSIS_AI_QUESTION_GLOSSARY = [
	{
		id: "context",
		text: "Market context summarizes how the displayed daily factors align; it is not a trading signal.",
	},
	{
		id: "trend",
		text: "Trend describes the direction and alignment of price relative to recent moving averages and slopes.",
	},
	{
		id: "momentum",
		text: "Momentum describes how strongly and consistently price has moved over recent daily periods.",
	},
	{
		id: "volatility",
		text: "Volatility describes the size and variability of recent price movements, not their direction.",
	},
	{
		id: "participation",
		text: "Participation compares recent trading volume with its recent baseline.",
	},
	{
		id: "support",
		text: "Support is a nearby price area where declines previously slowed or reversed.",
	},
	{
		id: "resistance",
		text: "Resistance is a nearby price area where advances previously slowed or reversed.",
	},
] as const;

const LIMITATION_TEXT: Record<TransparentAnalysisAiLimitation, string> = {
	participation_unavailable: "Recent volume participation is unavailable.",
	relative_strength_unavailable: "SPY-relative strength is unavailable.",
	data_quality_warning: "One or more non-fatal market-data checks require review.",
};

export type TransparentAnalysisAiQuestionGlossaryEntry = {
	id: (typeof TRANSPARENT_ANALYSIS_AI_QUESTION_GLOSSARY)[number]["id"];
	text: string;
};

export type TransparentAnalysisAiQuestionLimitation = {
	id: TransparentAnalysisAiLimitation;
	text: string;
};

export type TransparentAnalysisAiQuestionRoutingInput = {
	version: typeof TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_VERSION;
	analysisVersion: typeof TRANSPARENT_ANALYSIS_AI_CONTRACT_VERSION;
	timeframe: TransparentAnalysisAiInput["timeframe"];
	question: string;
	context: TransparentAnalysisAiInput["context"];
	factors: TransparentAnalysisAiInput["factors"];
	limitations: TransparentAnalysisAiQuestionLimitation[];
	glossary: TransparentAnalysisAiQuestionGlossaryEntry[];
};

export type TransparentAnalysisAiQuestionRoutingBuildResult =
	| { ok: true; input: TransparentAnalysisAiQuestionRoutingInput }
	| {
			ok: false;
			reason: "analysis_unavailable" | "question_empty" | "question_too_long";
	  };

export type TransparentAnalysisAiQuestionRoute = "answer" | "clarify" | "prohibited";

export type TransparentAnalysisAiQuestionRoutingOutput = {
	version: typeof TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_VERSION;
	route: TransparentAnalysisAiQuestionRoute;
	factIds: string[];
	glossaryIds: TransparentAnalysisAiQuestionGlossaryEntry["id"][];
	limitationIds: TransparentAnalysisAiLimitation[];
};

export type TransparentAnalysisAiQuestionRoutingIssueCode =
	| "schema"
	| "route"
	| "fact_id"
	| "glossary_id"
	| "limitation_id"
	| "selection_rule";

export type TransparentAnalysisAiQuestionRoutingValidationResult =
	| { ok: true; value: TransparentAnalysisAiQuestionRoutingOutput }
	| {
			ok: false;
			reasons: string[];
			issueCodes: TransparentAnalysisAiQuestionRoutingIssueCode[];
	  };

export type TransparentAnalysisAiQuestionRenderedFact = TransparentAnalysisAiFact & {
	factor: TransparentAnalysisAiFactorName;
};

export type TransparentAnalysisAiQuestionRenderedAnswer = {
	version: typeof TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_VERSION;
	route: TransparentAnalysisAiQuestionRoute;
	message: string;
	facts: TransparentAnalysisAiQuestionRenderedFact[];
	glossary: TransparentAnalysisAiQuestionGlossaryEntry[];
	limitations: TransparentAnalysisAiQuestionLimitation[];
	disclaimer: typeof TRANSPARENT_ANALYSIS_PANEL_DISCLAIMER;
};

const uniqueStringArraySchema = (maxItems: number) => ({
	type: "array",
	maxItems,
	uniqueItems: true,
	items: { type: "string", minLength: 1 },
}) as const;

export const TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_OUTPUT_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: ["version", "route", "factIds", "glossaryIds", "limitationIds"],
	properties: {
		version: { const: TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_VERSION },
		route: { enum: ["answer", "clarify", "prohibited"] },
		factIds: uniqueStringArraySchema(6),
		glossaryIds: uniqueStringArraySchema(3),
		limitationIds: uniqueStringArraySchema(3),
	},
} as const;

const PROHIBITED_QUESTION =
	/\b(?:buy|sell|hold|trade|invest|entry|exit|stop[ -]?loss|take[ -]?profit|price\s+target|position\s+siz(?:e|ing)|portfolio\s+(?:allocation|advice)|place\s+(?:an\s+)?order|open\s+(?:a\s+)?position|close\s+(?:a\s+)?position|go\s+(?:long|short))\b/i;

export function questionRequiresProhibitedRoute(question: string) {
	return PROHIBITED_QUESTION.test(question);
}

export function buildTransparentAnalysisAiQuestionRoutingInput(input: {
	panel: AnalysisPanelResponse;
	question: unknown;
}): TransparentAnalysisAiQuestionRoutingBuildResult {
	if (input.panel.status === "unavailable") {
		return { ok: false, reason: "analysis_unavailable" };
	}
	if (typeof input.question !== "string" || input.question.trim().length === 0) {
		return { ok: false, reason: "question_empty" };
	}
	const question = input.question.trim();
	if ([...question].length > TRANSPARENT_ANALYSIS_AI_QUESTION_MAX_CHARACTERS) {
		return { ok: false, reason: "question_too_long" };
	}
	const analysis = buildTransparentAnalysisAiInput(input.panel);
	if (!analysis) return { ok: false, reason: "analysis_unavailable" };
	return {
		ok: true,
		input: {
			version: TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_VERSION,
			analysisVersion: analysis.version,
			timeframe: analysis.timeframe,
			question,
			context: analysis.context,
			factors: analysis.factors,
			limitations: analysis.limitations.map((id) => ({ id, text: LIMITATION_TEXT[id] })),
			glossary: TRANSPARENT_ANALYSIS_AI_QUESTION_GLOSSARY.map((entry) => ({ ...entry })),
		},
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]) {
	const actual = Object.keys(value).sort();
	const sortedExpected = [...expected].sort();
	return actual.length === sortedExpected.length &&
		actual.every((key, index) => key === sortedExpected[index]);
}

function isUniqueStringArray(value: unknown, maximum: number): value is string[] {
	return Array.isArray(value) &&
		value.length <= maximum &&
		value.every((item) => typeof item === "string" && item.length > 0) &&
		new Set(value).size === value.length;
}

function allFacts(input: TransparentAnalysisAiQuestionRoutingInput) {
	return Object.entries(input.factors).flatMap(([factor, value]) =>
		value.facts.map((fact) => ({
			...fact,
			factor: factor as TransparentAnalysisAiFactorName,
		})));
}

export function validateTransparentAnalysisAiQuestionRoutingOutput(
	input: TransparentAnalysisAiQuestionRoutingInput,
	value: unknown,
): TransparentAnalysisAiQuestionRoutingValidationResult {
	if (!isRecord(value) || !hasExactKeys(value, [
		"version",
		"route",
		"factIds",
		"glossaryIds",
		"limitationIds",
	])) {
		return {
			ok: false,
			reasons: ["Question-routing output does not match the strict top-level schema."],
			issueCodes: ["schema"],
		};
	}

	const reasons: string[] = [];
	const issueCodes: TransparentAnalysisAiQuestionRoutingIssueCode[] = [];
	const routes = new Set<TransparentAnalysisAiQuestionRoute>(["answer", "clarify", "prohibited"]);
	const route = value.route;
	if (value.version !== TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_VERSION) {
		reasons.push("Question-routing contract version is invalid.");
		issueCodes.push("schema");
	}
	if (typeof route !== "string" || !routes.has(route as TransparentAnalysisAiQuestionRoute)) {
		reasons.push("Question route is invalid.");
		issueCodes.push("route");
	}

	const arrays = [
		["factIds", value.factIds, 6],
		["glossaryIds", value.glossaryIds, 3],
		["limitationIds", value.limitationIds, 3],
	] as const;
	for (const [label, selected, maximum] of arrays) {
		if (!isUniqueStringArray(selected, maximum)) {
			reasons.push(`${label} must contain no more than ${maximum} unique non-empty IDs.`);
			issueCodes.push("schema");
		}
	}

	if (
		isUniqueStringArray(value.factIds, 6) &&
		value.factIds.some((id) => !allFacts(input).some((fact) => fact.id === id))
	) {
		reasons.push("factIds contains an unknown fact ID.");
		issueCodes.push("fact_id");
	}
	if (
		isUniqueStringArray(value.glossaryIds, 3) &&
		value.glossaryIds.some((id) => !input.glossary.some((entry) => entry.id === id))
	) {
		reasons.push("glossaryIds contains an unknown glossary ID.");
		issueCodes.push("glossary_id");
	}
	if (
		isUniqueStringArray(value.limitationIds, 3) &&
		value.limitationIds.some((id) => !input.limitations.some((entry) => entry.id === id))
	) {
		reasons.push("limitationIds contains an unknown limitation ID.");
		issueCodes.push("limitation_id");
	}

	if (
		typeof route === "string" &&
		routes.has(route as TransparentAnalysisAiQuestionRoute) &&
		isUniqueStringArray(value.factIds, 6) &&
		isUniqueStringArray(value.glossaryIds, 3) &&
		isUniqueStringArray(value.limitationIds, 3)
	) {
		const selectionCount = value.factIds.length + value.glossaryIds.length + value.limitationIds.length;
		if (route === "answer" && selectionCount === 0) {
			reasons.push("An answer must select at least one supplied ID.");
			issueCodes.push("selection_rule");
		}
		if (route !== "answer" && selectionCount > 0) {
			reasons.push("Clarify and prohibited routes must not select IDs.");
			issueCodes.push("selection_rule");
		}
		if (questionRequiresProhibitedRoute(input.question) && route !== "prohibited") {
			reasons.push("This question requires the prohibited route.");
			issueCodes.push("route");
		}
	}

	return reasons.length === 0
		? { ok: true, value: value as TransparentAnalysisAiQuestionRoutingOutput }
		: {
				reasons: [...new Set(reasons)],
				issueCodes: [...new Set(issueCodes)],
				ok: false,
			};
}

const ROUTE_MESSAGES: Record<TransparentAnalysisAiQuestionRoute, string> = {
	answer: "Based on the available daily analysis:",
	clarify: "Ask about the displayed market context, a factor, an indicator term, or a data limitation.",
	prohibited: "This feature describes existing daily market context and does not provide trading instructions.",
};

export function renderTransparentAnalysisAiQuestionRoutingAnswer(
	input: TransparentAnalysisAiQuestionRoutingInput,
	output: TransparentAnalysisAiQuestionRoutingOutput,
): TransparentAnalysisAiQuestionRenderedAnswer {
	const facts = new Map(allFacts(input).map((fact) => [fact.id, fact]));
	const glossary = new Map(input.glossary.map((entry) => [entry.id, entry]));
	const limitations = new Map(input.limitations.map((entry) => [entry.id, entry]));
	return {
		version: TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_VERSION,
		route: output.route,
		message: ROUTE_MESSAGES[output.route],
		facts: output.factIds.map((id) => ({ ...facts.get(id)! })),
		glossary: output.glossaryIds.map((id) => ({ ...glossary.get(id)! })),
		limitations: output.limitationIds.map((id) => ({ ...limitations.get(id)! })),
		disclaimer: TRANSPARENT_ANALYSIS_PANEL_DISCLAIMER,
	};
}
