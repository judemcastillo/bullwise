import {
	TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES,
	type TransparentAnalysisAiExplanation,
	type TransparentAnalysisAiFactorName,
	type TransparentAnalysisAiInput,
} from "@/lib/analysis/transparent-analysis-ai-contract";
import { TRANSPARENT_ANALYSIS_PANEL_DISCLAIMER } from "@/lib/analysis/transparent-analysis-panel.types";

export const TRANSPARENT_ANALYSIS_AI_SELECTION_CONTRACT_VERSION = "1.0.0";

export type TransparentAnalysisAiSelection = {
	version: typeof TRANSPARENT_ANALYSIS_AI_SELECTION_CONTRACT_VERSION;
	overviewFactIds: string[];
	factors: Array<{
		factor: TransparentAnalysisAiFactorName;
		factIds: string[];
	}>;
};

export type TransparentAnalysisAiSelectionIssueCode =
	| "schema"
	| "overview_citation"
	| "overview_balance"
	| "factor_citation"
	| "factor_coverage";

export type TransparentAnalysisAiSelectionValidationResult =
	| { ok: true; value: TransparentAnalysisAiSelection }
	| { ok: false; reasons: string[]; issueCodes: TransparentAnalysisAiSelectionIssueCode[] };

const factIdsSchema = {
	type: "array",
	minItems: 1,
	uniqueItems: true,
	items: { type: "string", minLength: 1 },
} as const;

export const TRANSPARENT_ANALYSIS_AI_SELECTION_OUTPUT_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: ["version", "overviewFactIds", "factors"],
	properties: {
		version: { const: TRANSPARENT_ANALYSIS_AI_SELECTION_CONTRACT_VERSION },
		overviewFactIds: { ...factIdsSchema, maxItems: 4 },
		factors: {
			type: "array",
			minItems: 4,
			maxItems: 4,
			items: {
				type: "object",
				additionalProperties: false,
				required: ["factor", "factIds"],
				properties: {
					factor: { enum: TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES },
					factIds: factIdsSchema,
				},
			},
		},
	},
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]) {
	const actual = Object.keys(value).sort();
	const sortedExpected = [...expected].sort();
	return actual.length === sortedExpected.length &&
		actual.every((key, index) => key === sortedExpected[index]);
}

function isUniqueStringArray(value: unknown): value is string[] {
	return Array.isArray(value) &&
		value.length > 0 &&
		value.every((item) => typeof item === "string") &&
		new Set(value).size === value.length;
}

function sameMembers(actual: readonly string[], expected: readonly string[]) {
	return actual.length === expected.length &&
		actual.every((id) => expected.includes(id));
}

export function validateTransparentAnalysisAiSelection(
	input: TransparentAnalysisAiInput,
	value: unknown,
): TransparentAnalysisAiSelectionValidationResult {
	if (!isRecord(value) || !hasExactKeys(value, ["version", "overviewFactIds", "factors"])) {
		return {
			ok: false,
			reasons: ["Selection does not match the strict top-level schema."],
			issueCodes: ["schema"],
		};
	}

	const reasons: string[] = [];
	const issueCodes: TransparentAnalysisAiSelectionIssueCode[] = [];
	const allFactIds = TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES.flatMap((factor) =>
		input.factors[factor].facts.map(({ id }) => id));
	const allFacts = TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES.flatMap((factor) =>
		input.factors[factor].facts);
	if (value.version !== TRANSPARENT_ANALYSIS_AI_SELECTION_CONTRACT_VERSION) {
		reasons.push("Selection contract version is invalid.");
		issueCodes.push("schema");
	}
	if (
		!isUniqueStringArray(value.overviewFactIds) ||
		value.overviewFactIds.length > 4 ||
		value.overviewFactIds.some((id) => !allFactIds.includes(id))
	) {
		reasons.push("Overview fact IDs must contain one to four unique supplied IDs.");
		issueCodes.push("overview_citation");
	} else {
		const selectedKinds = new Set(value.overviewFactIds.map((id) =>
			allFacts.find((fact) => fact.id === id)!.kind));
		const availableKinds = new Set(allFacts.map(({ kind }) => kind));
		if (
			availableKinds.has("evidence") &&
			availableKinds.has("counter_evidence") &&
			(!selectedKinds.has("evidence") || !selectedKinds.has("counter_evidence"))
		) {
			reasons.push("Overview must represent both evidence and counter-evidence when both exist.");
			issueCodes.push("overview_balance");
		}
	}

	if (!Array.isArray(value.factors) || value.factors.length !== 4) {
		reasons.push("Selection must contain exactly four ordered factors.");
		issueCodes.push("schema");
	} else {
		value.factors.forEach((factorValue, index) => {
			const expectedFactor = TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES[index];
			if (!isRecord(factorValue) || !hasExactKeys(factorValue, ["factor", "factIds"])) {
				reasons.push(`Factor ${index + 1} does not match the strict schema.`);
				issueCodes.push("schema");
				return;
			}
			if (factorValue.factor !== expectedFactor || !isUniqueStringArray(factorValue.factIds)) {
				reasons.push(`${expectedFactor} selection is missing, out of order, or duplicated.`);
				issueCodes.push("factor_citation");
				return;
			}
			const expectedIds = input.factors[expectedFactor].facts.map(({ id }) => id);
			if (factorValue.factIds.some((id) => !expectedIds.includes(id))) {
				reasons.push(`${expectedFactor} selection contains an unknown or cross-factor ID.`);
				issueCodes.push("factor_citation");
			}
			if (!sameMembers(factorValue.factIds, expectedIds)) {
				reasons.push(`${expectedFactor} selection must include every supplied factor fact exactly once.`);
				issueCodes.push("factor_coverage");
			}
		});
	}

	return reasons.length === 0
		? { ok: true, value: value as TransparentAnalysisAiSelection }
		: {
				ok: false,
				reasons: [...new Set(reasons)],
				issueCodes: [...new Set(issueCodes)],
			};
}

function exactFactText(input: TransparentAnalysisAiInput, factIds: readonly string[]) {
	const facts = new Map(
		TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES.flatMap((factor) =>
			input.factors[factor].facts.map((fact) => [fact.id, fact.text] as const)),
	);
	return factIds.map((id) => facts.get(id)!).join(" ");
}

export function renderTransparentAnalysisAiSelection(
	input: TransparentAnalysisAiInput,
	selection: TransparentAnalysisAiSelection,
): TransparentAnalysisAiExplanation {
	return {
		version: input.version,
		context: input.context,
		overview: {
			text: exactFactText(input, selection.overviewFactIds),
			factIds: [...selection.overviewFactIds],
		},
		factors: TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES.map((factor, index) => ({
			factor,
			state: input.factors[factor].state,
			explanation: {
				text: exactFactText(input, selection.factors[index].factIds),
				factIds: [...selection.factors[index].factIds],
			},
		})),
		limitations: [...input.limitations],
		disclaimer: TRANSPARENT_ANALYSIS_PANEL_DISCLAIMER,
	};
}

export function renderedSelectionPreservesExactFacts(
	input: TransparentAnalysisAiInput,
	selection: TransparentAnalysisAiSelection,
	rendered: TransparentAnalysisAiExplanation,
) {
	if (rendered.overview.text !== exactFactText(input, selection.overviewFactIds)) return false;
	return TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES.every((factor, index) =>
		rendered.factors[index].explanation.text ===
			exactFactText(input, selection.factors[index].factIds));
}
