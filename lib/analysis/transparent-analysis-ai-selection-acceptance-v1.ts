import { buildTransparentAnalysisAiInput } from "@/lib/analysis/transparent-analysis-ai-contract";
import {
	TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_FIXTURES,
	type TransparentAnalysisAiSelectionAcceptanceV1Mutation,
} from "@/lib/analysis/transparent-analysis-ai-selection-acceptance-v1-fixtures";
import type {
	TransparentAnalysisAiMeasuredGeneration,
	TransparentAnalysisAiProvider,
	TransparentAnalysisAiProviderRequest,
} from "@/lib/analysis/transparent-analysis-ai-provider";
import {
	renderedSelectionPreservesExactFacts,
	renderTransparentAnalysisAiSelection,
	type TransparentAnalysisAiSelection,
	validateTransparentAnalysisAiSelection,
} from "@/lib/analysis/transparent-analysis-ai-selection-contract";
import { completeTransparentAnalysisAiSelectionV16 } from "@/lib/analysis/transparent-analysis-ai-selection-evaluation-v1-6";
import {
	buildTransparentAnalysisAiSelectionV16Input,
	TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_GATES,
	TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROTOCOL,
	type TransparentAnalysisAiSelectionV16Input,
	validateTransparentAnalysisAiSelectionV16,
} from "@/lib/analysis/transparent-analysis-ai-selection-v1-6";
import type { AnalysisPanelResponse } from "@/lib/analysis/transparent-analysis-panel.types";

export const TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_VERSION = "1.0.0";

export type TransparentAnalysisAiSelectionAcceptanceV1Generator = (
	request: TransparentAnalysisAiProviderRequest,
) => Promise<TransparentAnalysisAiMeasuredGeneration>;

type GenerationResult = {
	fixtureId: string;
	input: TransparentAnalysisAiSelectionV16Input;
	startedAfterPreviousMs: number | null;
	generation: TransparentAnalysisAiMeasuredGeneration | null;
	baseValidation: ReturnType<typeof validateTransparentAnalysisAiSelection>;
	validation: ReturnType<typeof validateTransparentAnalysisAiSelectionV16>;
};

function request(input: TransparentAnalysisAiSelectionV16Input) {
	return {
		promptVersion: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROTOCOL.promptVersion,
		promptSha256: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROTOCOL.promptSha256,
		systemPrompt: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROTOCOL.systemPrompt,
		outputSchema: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROTOCOL.outputSchema,
		input,
		signal: new AbortController().signal,
	} satisfies TransparentAnalysisAiProviderRequest;
}

function invalidSelection(
	input: TransparentAnalysisAiSelectionV16Input,
	mutation: TransparentAnalysisAiSelectionAcceptanceV1Mutation,
): unknown {
	if (mutation === "malformed_or_truncated") return '{"version":';
	const selection = completeTransparentAnalysisAiSelectionV16(input) as
		TransparentAnalysisAiSelection & Record<string, unknown>;
	if (mutation === "extra_field") selection.extra = true;
	else if (mutation === "wrong_version") selection.version = "9.9.9" as "1.0.0";
	else if (mutation === "unknown_overview_id") {
		selection.overviewFactIds = ["trend.evidence.999"];
	} else if (mutation === "different_overview_membership") {
		const knownIds = Object.values(input.factors).flatMap(({ facts }) =>
			facts.map(({ id }) => id));
		const replacement = knownIds.find((id) => !selection.overviewFactIds.includes(id));
		if (!replacement) throw new Error("Acceptance fixture lacks replacement overview fact");
		selection.overviewFactIds[selection.overviewFactIds.length - 1] = replacement;
	} else if (mutation === "cross_factor_id") {
		selection.factors[0].factIds = [input.factors.momentum.facts[0].id];
	} else if (mutation === "missing_factor_fact") {
		selection.factors[0].factIds = selection.factors[0].factIds.slice(0, -1);
	} else if (mutation === "duplicate_factor_fact") {
		selection.factors[0].factIds.push(selection.factors[0].factIds[0]);
	}
	return selection;
}

async function boundaryResult(input: {
	panel: AnalysisPanelResponse;
	provider: TransparentAnalysisAiProvider;
}) {
	const baseInput = buildTransparentAnalysisAiInput(input.panel);
	if (!baseInput) return { kind: "not_requested" as const, panel: input.panel };
	const modelInput = buildTransparentAnalysisAiSelectionV16Input(baseInput);
	let output: unknown;
	try {
		output = await input.provider.generate(request(modelInput));
	} catch {
		return { kind: "fallback" as const, panel: input.panel };
	}
	return validateTransparentAnalysisAiSelectionV16(modelInput, output).ok
		? { kind: "ready" as const, panel: input.panel }
		: { kind: "fallback" as const, panel: input.panel };
}

async function boundaryMetrics() {
	let unavailableCalls = 0;
	for (const fixture of TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_FIXTURES.filter(
		({ kind }) => kind === "unavailable_input")) {
		await boundaryResult({
			panel: fixture.panel,
			provider: { generate: async () => { unavailableCalls += 1; } },
		});
	}
	const fallbackFixtures = TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_FIXTURES.filter(
		({ kind }) => kind === "provider_failure" || kind === "invalid_output");
	let successes = 0;
	for (const fixture of fallbackFixtures) {
		const baseInput = buildTransparentAnalysisAiInput(fixture.panel);
		if (!baseInput) throw new Error("Acceptance fallback fixture unexpectedly unavailable");
		const modelInput = buildTransparentAnalysisAiSelectionV16Input(baseInput);
		let provider: TransparentAnalysisAiProvider;
		if (fixture.kind === "provider_failure") {
			provider = { generate: async () => { throw new Error("synthetic provider failure"); } };
		} else if (fixture.kind === "invalid_output") {
			provider = { generate: async () => invalidSelection(modelInput, fixture.mutation) };
		} else {
			throw new Error("Acceptance fallback fixture kind is invalid");
		}
		const result = await boundaryResult({ panel: fixture.panel, provider });
		if (result.kind === "fallback" && result.panel === fixture.panel) successes += 1;
	}
	return {
		unavailableCalls,
		fallbackPercent: (successes / fallbackFixtures.length) * 100,
	};
}

function percent(numerator: number, denominator: number) {
	return denominator === 0 ? 0 : (numerator / denominator) * 100;
}

function hasRequiredOverviewMembership(output: unknown, requiredIds: readonly string[]) {
	if (typeof output !== "object" || output === null || Array.isArray(output)) return false;
	const ids = (output as Record<string, unknown>).overviewFactIds;
	return Array.isArray(ids) &&
		ids.every((id) => typeof id === "string") &&
		new Set(ids).size === ids.length &&
		ids.length === requiredIds.length &&
		ids.every((id) => requiredIds.includes(id));
}

export async function evaluateTransparentAnalysisAiSelectionAcceptanceV1(input: {
	model: string;
	generate: TransparentAnalysisAiSelectionAcceptanceV1Generator;
	now?: () => number;
	wait?: (milliseconds: number) => Promise<void>;
}) {
	const now = input.now ?? (() => performance.now());
	const wait = input.wait ?? ((milliseconds: number) =>
		new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
	const generationFixtures = TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_FIXTURES.filter(
		({ kind }) => kind === "generation");
	const results: GenerationResult[] = [];
	let previousStartedAt: number | null = null;

	for (const fixture of generationFixtures) {
		const baseInput = buildTransparentAnalysisAiInput(fixture.panel);
		if (!baseInput) throw new Error("Acceptance generation fixture unexpectedly unavailable");
		const modelInput = buildTransparentAnalysisAiSelectionV16Input(baseInput);
		if (previousStartedAt !== null) {
			const remaining = TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROTOCOL.minimumStartIntervalMs -
				(now() - previousStartedAt);
			if (remaining > 0) await wait(remaining);
		}
		const startedAt = now();
		const startedAfterPreviousMs = previousStartedAt === null
			? null
			: startedAt - previousStartedAt;
		previousStartedAt = startedAt;
		try {
			const generation = await input.generate(request(modelInput));
			results.push({
				fixtureId: fixture.id,
				input: modelInput,
				startedAfterPreviousMs,
				generation,
				baseValidation: validateTransparentAnalysisAiSelection(modelInput, generation.output),
				validation: validateTransparentAnalysisAiSelectionV16(modelInput, generation.output),
			});
		} catch {
			const failure = { ok: false as const, reasons: ["Provider failure."], issueCodes: ["schema" as const] };
			results.push({
				fixtureId: fixture.id,
				input: modelInput,
				startedAfterPreviousMs,
				generation: null,
				baseValidation: failure,
				validation: failure,
			});
		}
	}

	const boundary = await boundaryMetrics();
	const completed = results.filter(({ generation }) => generation !== null);
	const withoutIssue = (code: string) => completed.filter(({ baseValidation }) =>
		baseValidation.ok || !baseValidation.issueCodes.includes(code as never)).length;
	const requiredMembership = completed.filter(({ generation, input: modelInput }) =>
		hasRequiredOverviewMembership(generation!.output, modelInput.requiredOverviewFactIds));
	const renderable = completed.filter(({ baseValidation }) => baseValidation.ok);
	const exactRendered = renderable.filter(({ input: modelInput, baseValidation }) => {
		if (!baseValidation.ok) return false;
		const rendered = renderTransparentAnalysisAiSelection(modelInput, baseValidation.value);
		return renderedSelectionPreservesExactFacts(modelInput, baseValidation.value, rendered);
	});
	const valid = completed.filter(({ validation }) => validation.ok);
	const intervals = results
		.map(({ startedAfterPreviousMs }) => startedAfterPreviousMs)
		.filter((value): value is number => value !== null);
	const minimumInterval = intervals.length === 0 ? 0 : Math.min(...intervals);
	const meanCostUsd = valid.length === 0
		? 0
		: valid.reduce((sum, result) => sum + result.generation!.usage.costUsd, 0) / valid.length;
	const values = {
		selection_schema_valid: percent(withoutIssue("schema"), completed.length),
		overview_fact_id_validity: percent(withoutIssue("overview_citation"), completed.length),
		required_overview_membership: percent(requiredMembership.length, completed.length),
		factor_fact_id_validity: percent(withoutIssue("factor_citation"), completed.length),
		complete_factor_fact_coverage: percent(withoutIssue("factor_coverage"), completed.length),
		exact_rendered_fact_text_fidelity: percent(exactRendered.length, completed.length),
		unavailable_input_model_calls: boundary.unavailableCalls,
		fallback_success: boundary.fallbackPercent,
		mean_generation_cost: meanCostUsd * 100,
		provider_completion: percent(completed.length, results.length),
		minimum_request_start_interval: minimumInterval,
		manual_groundedness: null,
	} as const;
	const gates = TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_GATES.map((gate) => {
		const value = values[gate.id];
		const passed = value === null
			? null
			: gate.comparison === "="
				? value === gate.threshold
				: gate.comparison === "<="
					? value <= gate.threshold
					: value >= gate.threshold;
		return { ...gate, value, passed };
	});
	const automatedPassed = gates.filter(({ passed }) => passed === true).length;
	const automatedFailed = gates.filter(({ passed }) => passed === false).length;
	return {
		version: TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_VERSION,
		candidateVersion: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROTOCOL.version,
		contractVersion: "1.0.0",
		model: input.model,
		promptVersion: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROTOCOL.promptVersion,
		promptSha256: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROTOCOL.promptSha256,
		fixtureCount: TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_FIXTURES.length,
		generationFixtureCount: generationFixtures.length,
		decision: automatedFailed > 0 ? "reject_candidate" : "manual_review_required",
		automatedPassed,
		automatedFailed,
		gates,
		observations: {
			providerCompleted: completed.length,
			providerFailed: results.length - completed.length,
			providerCompletionPercent: values.provider_completion,
			minimumRequestStartIntervalMs: minimumInterval,
		},
		manualReview: results.map((result) => ({
			fixtureId: result.fixtureId,
			input: result.input,
			selection: result.generation?.output ?? null,
			validation: result.validation,
			rendered: result.baseValidation.ok
				? renderTransparentAnalysisAiSelection(result.input, result.baseValidation.value)
				: null,
		})),
	};
}
