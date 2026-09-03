import {
	TRANSPARENT_ANALYSIS_PANEL_DISCLAIMER,
	type AnalysisPanelAvailableResponse,
	type AnalysisPanelEvidenceFactor,
	type AnalysisPanelResponse,
} from "@/lib/analysis/transparent-analysis-panel.types";

export const TRANSPARENT_ANALYSIS_AI_CONTRACT_VERSION = "1.0.0";

export const TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES = [
	"trend",
	"momentum",
	"volatility",
	"participation",
] as const;

export type TransparentAnalysisAiFactorName =
	(typeof TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES)[number];

export type TransparentAnalysisAiLimitation =
	| "participation_unavailable"
	| "relative_strength_unavailable"
	| "data_quality_warning";

export type TransparentAnalysisAiFact = {
	id: string;
	kind: "evidence" | "counter_evidence";
	text: string;
};

export type TransparentAnalysisAiInput = {
	version: typeof TRANSPARENT_ANALYSIS_AI_CONTRACT_VERSION;
	timeframe: "daily";
	context: AnalysisPanelAvailableResponse["context"];
	factors: {
		trend: {
			state: AnalysisPanelAvailableResponse["factors"]["trend"]["state"];
			facts: TransparentAnalysisAiFact[];
		};
		momentum: {
			state: AnalysisPanelAvailableResponse["factors"]["momentum"]["state"];
			facts: TransparentAnalysisAiFact[];
		};
		volatility: {
			state: AnalysisPanelAvailableResponse["factors"]["volatility"]["state"];
			facts: TransparentAnalysisAiFact[];
		};
		participation: {
			state: AnalysisPanelAvailableResponse["factors"]["participation"]["state"];
			facts: TransparentAnalysisAiFact[];
		};
	};
	limitations: TransparentAnalysisAiLimitation[];
};

export type TransparentAnalysisAiCitedText = {
	text: string;
	factIds: string[];
};

export type TransparentAnalysisAiExplanation = {
	version: typeof TRANSPARENT_ANALYSIS_AI_CONTRACT_VERSION;
	context: AnalysisPanelAvailableResponse["context"];
	overview: TransparentAnalysisAiCitedText;
	factors: Array<{
		factor: TransparentAnalysisAiFactorName;
		state: string;
		explanation: TransparentAnalysisAiCitedText;
	}>;
	limitations: TransparentAnalysisAiLimitation[];
	disclaimer: typeof TRANSPARENT_ANALYSIS_PANEL_DISCLAIMER;
};

export type TransparentAnalysisAiValidationResult =
	| { ok: true; value: TransparentAnalysisAiExplanation }
	| { ok: false; reasons: string[] };

export const TRANSPARENT_ANALYSIS_AI_EVALUATION_GATES = [
	{ id: "structured_output_valid", comparison: "=", threshold: 100, unit: "percent" },
	{ id: "factor_state_fidelity", comparison: "=", threshold: 100, unit: "percent" },
	{ id: "citation_validity", comparison: "=", threshold: 100, unit: "percent" },
	{ id: "novel_numeric_claims", comparison: "=", threshold: 0, unit: "count" },
	{ id: "prohibited_advice_claims", comparison: "=", threshold: 0, unit: "count" },
	{ id: "unsupported_domain_claims", comparison: "=", threshold: 0, unit: "count" },
	{ id: "unavailable_input_model_calls", comparison: "=", threshold: 0, unit: "count" },
	{ id: "fallback_success", comparison: "=", threshold: 100, unit: "percent" },
	{ id: "manual_groundedness", comparison: "=", threshold: 100, unit: "percent" },
	{ id: "generation_p95_latency", comparison: "<=", threshold: 5_000, unit: "milliseconds" },
	{ id: "mean_generation_cost", comparison: "<=", threshold: 1, unit: "usd_cents" },
] as const;

const FACTOR_STATES = {
	trend: new Set(["bullish", "mixed", "bearish"]),
	momentum: new Set(["bullish", "mixed", "bearish"]),
	volatility: new Set(["low", "normal", "high"]),
	participation: new Set(["weak", "normal", "strong", "unavailable"]),
} as const;

const PROHIBITED_ADVICE =
	/\b(?:buy|sell|hold|long|short|entry|enter|exit|trade|recommend(?:ation|ed)?|position\s+siz(?:e|ing)|stop[ -]?loss|take[ -]?profit|price\s+target|should\s+(?:invest|buy|sell|hold))\b/i;
const UNSUPPORTED_DOMAINS =
	/\b(?:news|earnings|revenue|fundamentals?|sentiment|options?|order\s+book|market\s+depth|liquidity|supply|demand|order\s+blocks?)\b/i;
const NUMERIC_TOKEN = /[$€£]?\d+(?:[.,]\d+)*(?:%|[a-z]{0,2})?/gi;

function facts(
	factor: TransparentAnalysisAiFactorName,
	value: AnalysisPanelEvidenceFactor<string>,
) {
	return [
		...value.evidence.map((text, index) => ({
			id: `${factor}.evidence.${index + 1}`,
			kind: "evidence" as const,
			text,
		})),
		...value.counterEvidence.map((text, index) => ({
			id: `${factor}.counter_evidence.${index + 1}`,
			kind: "counter_evidence" as const,
			text,
		})),
	];
}

function limitations(
	response: AnalysisPanelAvailableResponse,
): TransparentAnalysisAiLimitation[] {
	const result: TransparentAnalysisAiLimitation[] = [];
	if (response.factors.participation.state === "unavailable") {
		result.push("participation_unavailable");
	}
	if (
		response.dataQuality.warnings.some((warning) =>
			/SPY benchmark|relative strength/i.test(warning),
		)
	) {
		result.push("relative_strength_unavailable");
	}
	if (response.dataQuality.warnings.length > 0) {
		result.push("data_quality_warning");
	}
	return result;
}

export function buildTransparentAnalysisAiInput(
	response: AnalysisPanelResponse,
): TransparentAnalysisAiInput | null {
	if (response.status === "unavailable") return null;
	return {
		version: TRANSPARENT_ANALYSIS_AI_CONTRACT_VERSION,
		timeframe: "daily",
		context: response.context,
		factors: {
			trend: {
				state: response.factors.trend.state,
				facts: facts("trend", response.factors.trend),
			},
			momentum: {
				state: response.factors.momentum.state,
				facts: facts("momentum", response.factors.momentum),
			},
			volatility: {
				state: response.factors.volatility.state,
				facts: facts("volatility", response.factors.volatility),
			},
			participation: {
				state: response.factors.participation.state,
				facts: facts("participation", response.factors.participation),
			},
		},
		limitations: limitations(response),
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]) {
	const actual = Object.keys(value).sort();
	return actual.length === expected.length && actual.every((key, index) => key === [...expected].sort()[index]);
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function numericTokens(value: string) {
	return (value.match(NUMERIC_TOKEN) ?? []).map((token) => token.toLowerCase());
}

function validateCitedText(input: {
	value: unknown;
	label: string;
	maximumLength: number;
	knownFacts: Map<string, TransparentAnalysisAiFact>;
	allowedFactor?: TransparentAnalysisAiFactorName;
	reasons: string[];
}) {
	if (!isRecord(input.value) || !exactKeys(input.value, ["text", "factIds"])) {
		input.reasons.push(`${input.label} must contain only text and factIds.`);
		return;
	}
	if (
		typeof input.value.text !== "string" ||
		input.value.text.trim().length === 0 ||
		input.value.text.length > input.maximumLength
	) {
		input.reasons.push(`${input.label} text is empty or too long.`);
		return;
	}
	if (!isStringArray(input.value.factIds) || input.value.factIds.length === 0) {
		input.reasons.push(`${input.label} must cite at least one fact ID.`);
		return;
	}
	if (new Set(input.value.factIds).size !== input.value.factIds.length) {
		input.reasons.push(`${input.label} contains duplicate fact IDs.`);
	}
	const citedFacts = input.value.factIds
		.map((id) => input.knownFacts.get(id))
		.filter((fact): fact is TransparentAnalysisAiFact => Boolean(fact));
	if (citedFacts.length !== input.value.factIds.length) {
		input.reasons.push(`${input.label} cites an unknown fact ID.`);
	}
	if (
		input.allowedFactor &&
		input.value.factIds.some((id) => !id.startsWith(`${input.allowedFactor}.`))
	) {
		input.reasons.push(`${input.label} cites a fact from another factor.`);
	}
	if (PROHIBITED_ADVICE.test(input.value.text)) {
		input.reasons.push(`${input.label} contains prohibited trading advice.`);
	}
	if (UNSUPPORTED_DOMAINS.test(input.value.text)) {
		input.reasons.push(`${input.label} claims an unsupported data domain.`);
	}
	const allowedNumbers = new Set(
		citedFacts.flatMap((fact) => numericTokens(fact.text)),
	);
	if (numericTokens(input.value.text).some((token) => !allowedNumbers.has(token))) {
		input.reasons.push(`${input.label} contains an uncited numeric claim.`);
	}
}

export function validateTransparentAnalysisAiExplanation(
	input: TransparentAnalysisAiInput,
	value: unknown,
): TransparentAnalysisAiValidationResult {
	const reasons: string[] = [];
	if (
		!isRecord(value) ||
		!exactKeys(value, [
			"version",
			"context",
			"overview",
			"factors",
			"limitations",
			"disclaimer",
		])
	) {
		return { ok: false, reasons: ["Explanation does not match the strict top-level schema."] };
	}
	if (value.version !== TRANSPARENT_ANALYSIS_AI_CONTRACT_VERSION) {
		reasons.push("Explanation contract version is invalid.");
	}
	if (value.context !== input.context) {
		reasons.push("The context label does not match the deterministic input.");
	}
	if (value.disclaimer !== TRANSPARENT_ANALYSIS_PANEL_DISCLAIMER) {
		reasons.push("The fixed disclaimer was changed.");
	}
	if (
		!isStringArray(value.limitations) ||
		JSON.stringify(value.limitations) !== JSON.stringify(input.limitations)
	) {
		reasons.push("Limitations do not exactly match the deterministic input.");
	}
	const knownFacts = new Map(
		TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES.flatMap((factor) =>
			input.factors[factor].facts.map((fact) => [fact.id, fact] as const),
		),
	);
	validateCitedText({
		value: value.overview,
		label: "Overview",
		maximumLength: 480,
		knownFacts,
		reasons,
	});
	if (!Array.isArray(value.factors) || value.factors.length !== 4) {
		reasons.push("Explanation must contain exactly four factor explanations.");
	} else {
		value.factors.forEach((factorValue, index) => {
			const expectedFactor = TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES[index];
			if (
				!isRecord(factorValue) ||
				!exactKeys(factorValue, ["factor", "state", "explanation"])
			) {
				reasons.push(`Factor ${index + 1} does not match the strict schema.`);
				return;
			}
			if (factorValue.factor !== expectedFactor) {
				reasons.push(`Factor ${index + 1} is missing or out of order.`);
				return;
			}
			if (
				typeof factorValue.state !== "string" ||
				!FACTOR_STATES[expectedFactor].has(factorValue.state as never) ||
				factorValue.state !== input.factors[expectedFactor].state
			) {
				reasons.push(`${expectedFactor} state does not match the deterministic input.`);
			}
			validateCitedText({
				value: factorValue.explanation,
				label: `${expectedFactor} explanation`,
				maximumLength: 320,
				knownFacts,
				allowedFactor: expectedFactor,
				reasons,
			});
		});
	}
	return reasons.length === 0
		? { ok: true, value: value as TransparentAnalysisAiExplanation }
		: { ok: false, reasons: [...new Set(reasons)] };
}
