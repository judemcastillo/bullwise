import {
	buildTransparentAnalysisAiInput,
	TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES,
	type TransparentAnalysisAiInput,
} from "@/lib/analysis/transparent-analysis-ai-contract";
import { TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES } from "@/lib/analysis/transparent-analysis-ai-fixtures";
import type {
	TransparentAnalysisAiMeasuredGeneration,
	TransparentAnalysisAiProvider,
	TransparentAnalysisAiProviderRequest,
} from "@/lib/analysis/transparent-analysis-ai-provider";
import {
	renderedSelectionPreservesExactFacts,
	renderTransparentAnalysisAiSelection,
	type TransparentAnalysisAiSelection,
	type TransparentAnalysisAiSelectionValidationResult,
	validateTransparentAnalysisAiSelection,
} from "@/lib/analysis/transparent-analysis-ai-selection-contract";
import { generateTransparentAnalysisAiSelectedExplanation } from "@/lib/analysis/transparent-analysis-ai-selection-provider";
import {
	TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_GATES,
	TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROTOCOL,
} from "@/lib/analysis/transparent-analysis-ai-selection-v1-5";

export type TransparentAnalysisAiSelectionEvaluationGenerator = (
	request: TransparentAnalysisAiProviderRequest,
) => Promise<TransparentAnalysisAiMeasuredGeneration>;

type GenerationResult = {
	fixtureId: string;
	input: TransparentAnalysisAiInput;
	startedAfterPreviousMs: number | null;
	latencyMs: number;
	generation: TransparentAnalysisAiMeasuredGeneration | null;
	validation: TransparentAnalysisAiSelectionValidationResult;
};

export function completeTransparentAnalysisAiSelection(
	input: TransparentAnalysisAiInput,
): TransparentAnalysisAiSelection {
	const overviewFactIds = TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES
		.flatMap((factor) => input.factors[factor].facts.map(({ id }) => id))
		.slice(0, 4);
	return {
		version: "1.0.0",
		overviewFactIds,
		factors: TRANSPARENT_ANALYSIS_AI_FACTOR_NAMES.map((factor) => ({
			factor,
			factIds: input.factors[factor].facts.map(({ id }) => id),
		})),
	};
}

function invalidSelection(input: TransparentAnalysisAiInput, mutation?: string): unknown {
	if (mutation === "malformed_or_truncated") return '{"version":';
	const selection = completeTransparentAnalysisAiSelection(input) as
		TransparentAnalysisAiSelection & Record<string, unknown>;
	if (mutation === "extra_field") selection.extra = true;
	else if (mutation === "fake_citation") selection.overviewFactIds = ["trend.evidence.999"];
	else if (mutation === "cross_factor_citation") {
		selection.factors[0].factIds = [input.factors.momentum.facts[0].id];
	} else if (mutation === "context_and_state_drift") selection.version = "9.9.9" as "1.0.0";
	else if (mutation === "limitations_and_disclaimer_drift") selection.extra = [];
	else if (mutation === "invented_number") selection.overviewFactIds = ["99"];
	else if (mutation === "advice_and_unsupported_domain") selection.extra = "buy";
	return selection;
}

async function boundaryMetrics() {
	let unavailableCalls = 0;
	for (const fixture of TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES.filter(
		({ kind }) => kind === "unavailable_input")) {
		await generateTransparentAnalysisAiSelectedExplanation({
			panel: fixture.panel,
			provider: { generate: async () => { unavailableCalls += 1; } },
		});
	}

	const fallbackFixtures = TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES.filter(
		({ kind }) => kind === "provider_failure" || kind === "invalid_output");
	let fallbackSuccesses = 0;
	for (const fixture of fallbackFixtures) {
		const modelInput = buildTransparentAnalysisAiInput(fixture.panel);
		if (!modelInput) throw new Error("Frozen fallback fixture unexpectedly unavailable");
		const provider: TransparentAnalysisAiProvider = fixture.kind === "provider_failure"
			? { generate: async () => { throw new Error("synthetic provider failure"); } }
			: { generate: async () => invalidSelection(modelInput, fixture.mutation) };
		const result = await generateTransparentAnalysisAiSelectedExplanation({
			panel: fixture.panel,
			provider,
			timeoutMs: 25,
		});
		if (result.kind === "fallback" && result.panel === fixture.panel) fallbackSuccesses += 1;
	}
	return {
		unavailableCalls,
		fallbackPercent: (fallbackSuccesses / fallbackFixtures.length) * 100,
	};
}

function percent(numerator: number, denominator: number) {
	return denominator === 0 ? 0 : (numerator / denominator) * 100;
}

export async function evaluateTransparentAnalysisAiSelectionV15(input: {
	model: string;
	generate: TransparentAnalysisAiSelectionEvaluationGenerator;
	now?: () => number;
	wait?: (milliseconds: number) => Promise<void>;
}) {
	const now = input.now ?? (() => performance.now());
	const wait = input.wait ?? ((milliseconds: number) =>
		new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
	const generationFixtures = TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES.filter(
		({ kind }) => kind === "generation");
	const results: GenerationResult[] = [];
	let previousStartedAt: number | null = null;

	for (const fixture of generationFixtures) {
		const modelInput = buildTransparentAnalysisAiInput(fixture.panel);
		if (!modelInput) throw new Error("Frozen generation fixture unexpectedly unavailable");
		if (previousStartedAt !== null) {
			const remaining = TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROTOCOL.minimumStartIntervalMs -
				(now() - previousStartedAt);
			if (remaining > 0) await wait(remaining);
		}
		const startedAt = now();
		const startedAfterPreviousMs = previousStartedAt === null
			? null
			: startedAt - previousStartedAt;
		previousStartedAt = startedAt;
		try {
			const generation = await input.generate({
				promptVersion: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROTOCOL.promptVersion,
				promptSha256: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROTOCOL.promptSha256,
				systemPrompt: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROTOCOL.systemPrompt,
				outputSchema: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROTOCOL.outputSchema,
				input: modelInput,
				signal: new AbortController().signal,
			});
			results.push({
				fixtureId: fixture.id,
				input: modelInput,
				startedAfterPreviousMs,
				latencyMs: now() - startedAt,
				generation,
				validation: validateTransparentAnalysisAiSelection(modelInput, generation.output),
			});
		} catch {
			results.push({
				fixtureId: fixture.id,
				input: modelInput,
				startedAfterPreviousMs,
				latencyMs: now() - startedAt,
				generation: null,
				validation: { ok: false, reasons: ["Provider failure."], issueCodes: ["schema"] },
			});
		}
	}

	const boundary = await boundaryMetrics();
	const completed = results.filter(({ generation }) => generation !== null);
	const valid = completed.filter(({ validation }) => validation.ok);
	const withoutIssue = (code: string) => completed.filter(({ validation }) =>
		validation.ok || !validation.issueCodes.includes(code as never)).length;
	const exactRendered = valid.filter(({ input: modelInput, validation }) => {
		if (!validation.ok) return false;
		const rendered = renderTransparentAnalysisAiSelection(modelInput, validation.value);
		return renderedSelectionPreservesExactFacts(modelInput, validation.value, rendered);
	});
	const intervals = results
		.map(({ startedAfterPreviousMs }) => startedAfterPreviousMs)
		.filter((value): value is number => value !== null);
	const minimumInterval = intervals.length === 0 ? 0 : Math.min(...intervals);
	const meanCostUsd = valid.length === 0
		? 0
		: valid.reduce((sum, result) => sum + result.generation!.usage.costUsd, 0) / valid.length;
	const values = {
		structured_selection_valid: percent(valid.length, completed.length),
		overview_fact_id_validity: percent(withoutIssue("overview_citation"), completed.length),
		overview_evidence_balance: percent(withoutIssue("overview_balance"), completed.length),
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
	const gates = TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_GATES.map((gate) => {
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
		version: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROTOCOL.version,
		contractVersion: "1.0.0",
		model: input.model,
		promptVersion: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROTOCOL.promptVersion,
		promptSha256: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROTOCOL.promptSha256,
		fixtureCount: TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES.length,
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
			rendered: result.validation.ok
				? renderTransparentAnalysisAiSelection(result.input, result.validation.value)
				: null,
		})),
	};
}
