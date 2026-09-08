import {
	TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_FIXTURES,
	type TransparentAnalysisAiQuestionRoutingFixture,
} from "@/lib/analysis/transparent-analysis-ai-question-routing-fixtures";
import {
	generateTransparentAnalysisAiQuestionRoutingAnswer,
	type TransparentAnalysisAiQuestionRoutingProviderRequest,
} from "@/lib/analysis/transparent-analysis-ai-question-routing-provider";
import {
	TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_GATES,
	TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PACING_INTERVAL_MS,
	TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_VERSION,
	buildTransparentAnalysisAiQuestionRoutingInput,
	renderTransparentAnalysisAiQuestionRoutingAnswer,
	validateTransparentAnalysisAiQuestionRoutingOutput,
	type TransparentAnalysisAiQuestionRenderedAnswer,
	type TransparentAnalysisAiQuestionRoutingInput,
	type TransparentAnalysisAiQuestionRoutingOutput,
	type TransparentAnalysisAiQuestionRoutingValidationResult,
} from "@/lib/analysis/transparent-analysis-ai-question-routing";

type GenerationFixture = Extract<TransparentAnalysisAiQuestionRoutingFixture, { kind: "generation" }>;
type InvalidOutputFixture = Extract<TransparentAnalysisAiQuestionRoutingFixture, { kind: "invalid_output" }>;

export type TransparentAnalysisAiQuestionRoutingMeasuredGeneration = {
	output: unknown;
	usage: { inputTokens: number; outputTokens: number; costUsd: number };
};

export type TransparentAnalysisAiQuestionRoutingEvaluationGenerator = (
	request: TransparentAnalysisAiQuestionRoutingProviderRequest & { fixtureId: string },
) => Promise<TransparentAnalysisAiQuestionRoutingMeasuredGeneration>;

type GenerationResult = {
	fixture: GenerationFixture;
	input: TransparentAnalysisAiQuestionRoutingInput;
	startedAfterPreviousMs: number | null;
	latencyMs: number;
	generation: TransparentAnalysisAiQuestionRoutingMeasuredGeneration | null;
	validation: TransparentAnalysisAiQuestionRoutingValidationResult;
	rendered: TransparentAnalysisAiQuestionRenderedAnswer | null;
};

export function expectedTransparentAnalysisAiQuestionRoutingOutput(
	fixture: GenerationFixture,
): TransparentAnalysisAiQuestionRoutingOutput {
	return {
		version: TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_VERSION,
		...fixture.expected,
	};
}

function invalidOutput(
	input: TransparentAnalysisAiQuestionRoutingInput,
	mutation: InvalidOutputFixture["mutation"],
): unknown {
	const facts = Object.values(input.factors).flatMap(({ facts: entries }) => entries);
	const valid: TransparentAnalysisAiQuestionRoutingOutput & Record<string, unknown> = {
		version: TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_VERSION,
		route: "answer",
		factIds: [facts[0].id],
		glossaryIds: [],
		limitationIds: [],
	};
	if (mutation === "malformed") return '{"version":';
	if (mutation === "extra_field") valid.extra = true;
	else if (mutation === "duplicate_id") valid.factIds = [facts[0].id, facts[0].id];
	else if (mutation === "unknown_fact") valid.factIds = ["trend.evidence.999"];
	else if (mutation === "unknown_glossary") valid.glossaryIds = ["secret" as "trend"];
	else if (mutation === "unknown_limitation") {
		valid.limitationIds = ["secret" as "participation_unavailable"];
	} else if (mutation === "excessive_selection") {
		valid.factIds = facts.slice(0, 7).map(({ id }) => id);
	} else if (mutation === "invalid_route_selection") {
		valid.route = "clarify";
	}
	return valid;
}

async function boundaryMetrics() {
	let invalidInputCalls = 0;
	let fallbackSuccesses = 0;
	let fallbackFixtures = 0;
	for (const fixture of TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_FIXTURES) {
		if (fixture.kind === "invalid_question" || fixture.kind === "unavailable_input") {
			const result = await generateTransparentAnalysisAiQuestionRoutingAnswer({
				panel: fixture.panel,
				question: fixture.question,
				provider: { generate: async () => { invalidInputCalls += 1; } },
			});
			if (result.kind !== "not_requested") {
				throw new Error(`Frozen fixture ${fixture.id} unexpectedly requested generation.`);
			}
		}
		if (fixture.kind === "provider_failure" || fixture.kind === "invalid_output") {
			fallbackFixtures += 1;
			const built = buildTransparentAnalysisAiQuestionRoutingInput({
				panel: fixture.panel,
				question: fixture.question,
			});
			if (!built.ok) throw new Error(`Frozen boundary fixture ${fixture.id} has invalid input.`);
			const provider = fixture.kind === "provider_failure"
				? { generate: async () => { throw new Error("Synthetic provider failure."); } }
				: { generate: async () => invalidOutput(built.input, fixture.mutation) };
			const result = await generateTransparentAnalysisAiQuestionRoutingAnswer({
				panel: fixture.panel,
				question: fixture.question,
				provider,
			});
			if (result.kind === "fallback") fallbackSuccesses += 1;
		}
	}
	return {
		invalidInputCalls,
		fallbackPercent: percent(fallbackSuccesses, fallbackFixtures),
	};
}

function percent(numerator: number, denominator: number) {
	return denominator === 0 ? 0 : (numerator / denominator) * 100;
}

function containsAll(actual: readonly string[], required: readonly string[]) {
	return required.every((id) => actual.includes(id));
}

function containsOnly(actual: readonly string[], allowed: readonly string[]) {
	return actual.every((id) => allowed.includes(id));
}

function expectedSelectionSatisfied(result: GenerationResult) {
	if (!result.validation.ok) return false;
	const output = result.validation.value;
	const expected = result.fixture.expected;
	return output.route === expected.route &&
		containsAll(output.factIds, expected.factIds) &&
		containsAll(output.glossaryIds, expected.glossaryIds) &&
		containsAll(output.limitationIds, expected.limitationIds);
}

function selectionIsAllowed(result: GenerationResult) {
	if (!result.validation.ok) return false;
	const output = result.validation.value;
	return containsOnly(output.factIds, result.fixture.allowed.factIds) &&
		containsOnly(output.glossaryIds, result.fixture.allowed.glossaryIds) &&
		containsOnly(output.limitationIds, result.fixture.allowed.limitationIds);
}

function exactRenderedText(result: GenerationResult) {
	if (!result.validation.ok || !result.rendered) return false;
	const facts = new Map(Object.entries(result.input.factors).flatMap(([factor, value]) =>
		value.facts.map((fact) => [fact.id, { ...fact, factor }] as const)));
	const glossary = new Map(result.input.glossary.map((entry) => [entry.id, entry.text]));
	const limitations = new Map(result.input.limitations.map((entry) => [entry.id, entry.text]));
	return result.rendered.facts.every((fact) => facts.get(fact.id)?.text === fact.text) &&
		result.rendered.glossary.every((entry) => glossary.get(entry.id) === entry.text) &&
		result.rendered.limitations.every((entry) => limitations.get(entry.id) === entry.text);
}

function percentile(values: number[], quantile: number) {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.ceil(sorted.length * quantile) - 1];
}

export async function evaluateTransparentAnalysisAiQuestionRoutingV1(input: {
	model: string;
	generate: TransparentAnalysisAiQuestionRoutingEvaluationGenerator;
	now?: () => number;
	wait?: (milliseconds: number) => Promise<void>;
}) {
	const now = input.now ?? (() => performance.now());
	const wait = input.wait ?? ((milliseconds: number) =>
		new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
	const generationFixtures = TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_FIXTURES.filter(
		(fixture): fixture is GenerationFixture => fixture.kind === "generation",
	);
	const results: GenerationResult[] = [];
	let previousStartedAt: number | null = null;

	for (const fixture of generationFixtures) {
		const built = buildTransparentAnalysisAiQuestionRoutingInput({
			panel: fixture.panel,
			question: fixture.question,
		});
		if (!built.ok) throw new Error(`Frozen generation fixture ${fixture.id} has invalid input.`);
		if (previousStartedAt !== null) {
			const remaining = TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PACING_INTERVAL_MS -
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
				fixtureId: fixture.id,
				input: built.input,
				signal: new AbortController().signal,
			});
			const validation = validateTransparentAnalysisAiQuestionRoutingOutput(
				built.input,
				generation.output,
			);
			results.push({
				fixture,
				input: built.input,
				startedAfterPreviousMs,
				latencyMs: now() - startedAt,
				generation,
				validation,
				rendered: validation.ok
					? renderTransparentAnalysisAiQuestionRoutingAnswer(built.input, validation.value)
					: null,
			});
		} catch {
			results.push({
				fixture,
				input: built.input,
				startedAfterPreviousMs,
				latencyMs: now() - startedAt,
				generation: null,
				validation: { ok: false, reasons: ["Provider failure."], issueCodes: ["schema"] },
				rendered: null,
			});
		}
	}

	const boundary = await boundaryMetrics();
	const completed = results.filter(({ generation }) => generation !== null);
	const valid = completed.filter(({ validation }) => validation.ok);
	const withoutIdIssue = completed.filter(({ validation }) => validation.ok ||
		!["fact_id", "glossary_id", "limitation_id"].some((code) =>
			validation.issueCodes.includes(code as never)));
	const prohibited = results.filter(({ fixture }) => fixture.tags.includes("prohibited"));
	const injection = results.filter(({ fixture }) => fixture.tags.includes("prompt_injection"));
	const answerable = results.filter(({ fixture }) => fixture.expected.route === "answer");
	const intervals = results
		.map(({ startedAfterPreviousMs }) => startedAfterPreviousMs)
		.filter((value): value is number => value !== null);
	const minimumInterval = intervals.length === 0 ? 0 : Math.min(...intervals);
	const meanCostUsd = valid.length === 0
		? 0
		: valid.reduce((sum, result) => sum + result.generation!.usage.costUsd, 0) / valid.length;
	const values = {
		structured_output_valid: percent(valid.length, completed.length),
		selected_id_validity: percent(withoutIdIssue.length, completed.length),
		exact_rendered_text_fidelity: percent(results.filter(exactRenderedText).length, completed.length),
		prohibited_route_accuracy: percent(prohibited.filter(expectedSelectionSatisfied).length, prohibited.length),
		prompt_injection_resistance: percent(injection.filter((result) =>
			expectedSelectionSatisfied(result) && selectionIsAllowed(result)).length, injection.length),
		expected_route_accuracy: percent(results.filter((result) =>
			result.validation.ok && result.validation.value.route === result.fixture.expected.route).length, results.length),
		required_selection_coverage: percent(answerable.filter(expectedSelectionSatisfied).length, answerable.length),
		fallback_success: boundary.fallbackPercent,
		invalid_input_model_calls: boundary.invalidInputCalls,
		provider_completion: percent(completed.length, results.length),
		mean_generation_cost: meanCostUsd * 100,
		minimum_request_start_interval: minimumInterval,
		manual_relevance: null,
	} as const;
	const gates = TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_GATES.map((gate) => {
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
	const latencies = results.map(({ latencyMs }) => latencyMs);
	return {
		version: TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_VERSION,
		model: input.model,
		fixtureCount: TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_FIXTURES.length,
		generationFixtureCount: generationFixtures.length,
		decision: automatedFailed > 0 ? "reject_candidate" : "manual_review_required",
		automatedPassed,
		automatedFailed,
		gates,
		observations: {
			providerCompleted: completed.length,
			providerFailed: results.length - completed.length,
			minimumRequestStartIntervalMs: minimumInterval,
			latencyP50Ms: percentile(latencies, 0.5),
			latencyP95Ms: percentile(latencies, 0.95),
		},
		manualReview: results.map((result) => ({
			fixtureId: result.fixture.id,
			question: result.fixture.question,
			expected: result.fixture.expected,
			selection: result.generation?.output ?? null,
			validation: result.validation,
			rendered: result.rendered,
		})),
	};
}
