import { isDeepStrictEqual } from "node:util";
import {
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_BOUNDARY_FIXTURES,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PANELS,
	type TransparentAnalysisAiTopicRoutingV2BoundaryFixture,
	type TransparentAnalysisAiTopicRoutingV2GenerationFixture,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2-fixtures";
import {
	generateTransparentAnalysisAiTopicRoutingV2Answer,
	type TransparentAnalysisAiTopicRoutingV2ProviderRequest,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2-provider";
import {
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GATES,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PACING_INTERVAL_MS,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_TOPICS,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_VERSION,
	buildTransparentAnalysisAiTopicRoutingV2Input,
	expandTransparentAnalysisAiTopicRoutingV2,
	validateTransparentAnalysisAiTopicRoutingV2Output,
	type TransparentAnalysisAiTopicRoutingV2Input,
	type TransparentAnalysisAiTopicRoutingV2Output,
	type TransparentAnalysisAiTopicRoutingV2RenderedAnswer,
	type TransparentAnalysisAiTopicRoutingV2ValidationResult,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2";

type InvalidFixture = Extract<TransparentAnalysisAiTopicRoutingV2BoundaryFixture, { kind: "invalid_output" }>;

export type TransparentAnalysisAiTopicRoutingV2MeasuredGeneration = {
	output: unknown;
	usage: { inputTokens: number; outputTokens: number; costUsd: number };
};

export type TransparentAnalysisAiTopicRoutingV2EvaluationGenerator = (
	request: TransparentAnalysisAiTopicRoutingV2ProviderRequest & { fixtureId: string },
) => Promise<TransparentAnalysisAiTopicRoutingV2MeasuredGeneration>;

type GenerationResult = {
	fixture: TransparentAnalysisAiTopicRoutingV2GenerationFixture;
	input: TransparentAnalysisAiTopicRoutingV2Input;
	startedAfterPreviousMs: number | null;
	latencyMs: number;
	generation: TransparentAnalysisAiTopicRoutingV2MeasuredGeneration | null;
	validation: TransparentAnalysisAiTopicRoutingV2ValidationResult;
	rendered: TransparentAnalysisAiTopicRoutingV2RenderedAnswer | null;
};

export function expectedTransparentAnalysisAiTopicRoutingV2Output(
	fixture: TransparentAnalysisAiTopicRoutingV2GenerationFixture,
): TransparentAnalysisAiTopicRoutingV2Output {
	return { version: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_VERSION, ...fixture.expected };
}

function invalidOutput(mutation: InvalidFixture["mutation"]): unknown {
	const valid: TransparentAnalysisAiTopicRoutingV2Output & Record<string, unknown> = {
		version: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_VERSION,
		route: "answer",
		topicIds: ["volatility"],
	};
	if (mutation === "malformed") return '{"version":';
	if (mutation === "extra_field") valid.extra = true;
	else if (mutation === "duplicate_topic") valid.topicIds = ["volatility", "volatility"];
	else if (mutation === "unknown_topic") valid.topicIds = ["secret" as "volatility"];
	else if (mutation === "excessive_topics") {
		valid.topicIds = ["trend", "momentum", "volatility", "participation"];
	} else if (mutation === "invalid_route_selection") valid.route = "clarify";
	else if (mutation === "wrong_version") valid.version = "1.0.0" as "2.0.0";
	return valid;
}

function percent(numerator: number, denominator: number) {
	return denominator === 0 ? 0 : (numerator / denominator) * 100;
}

function sameSet(actual: readonly string[], expected: readonly string[]) {
	return actual.length === expected.length && expected.every((id) => actual.includes(id));
}

function expectedSelectionSatisfied(result: GenerationResult) {
	return result.validation.ok &&
		result.validation.value.route === result.fixture.expected.route &&
		result.fixture.expected.topicIds.every((id) => result.validation.ok &&
			result.validation.value.topicIds.includes(id));
}

function exactSelectionSatisfied(result: GenerationResult) {
	return result.validation.ok &&
		result.validation.value.route === result.fixture.expected.route &&
		sameSet(result.validation.value.topicIds, result.fixture.expected.topicIds);
}

function exactExpansion(result: GenerationResult) {
	if (!result.validation.ok || !result.rendered) return false;
	const panel = TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PANELS[result.fixture.panelId];
	const repeated = expandTransparentAnalysisAiTopicRoutingV2(panel, result.validation.value);
	if (!repeated.ok || !isDeepStrictEqual(repeated.value, result.rendered)) return false;
	const selected = new Set(result.validation.value.topicIds);
	const expectedTopicIds = TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_TOPICS
		.filter(({ id }) => selected.has(id))
		.map(({ id }) => id);
	if (!isDeepStrictEqual(result.rendered.topics.map(({ id }) => id), expectedTopicIds)) return false;
	if (selected.has("context")) {
		const factors = result.rendered.factors.map(({ factor }) => factor);
		if (!factors.includes("trend") || !factors.includes("momentum")) return false;
	}
	return result.rendered.disclaimer === panel.disclaimer &&
		result.rendered.topics.every((renderedTopic) => {
			const frozen = TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_TOPICS.find(
				({ id }) => id === renderedTopic.id,
			);
			return frozen?.title === renderedTopic.title && frozen.definition === renderedTopic.definition;
		});
}

async function boundaryMetrics() {
	let invalidInputModelCalls = 0;
	let localProhibitedTotal = 0;
	let localProhibitedSuccesses = 0;
	let fallbackTotal = 0;
	let fallbackSuccesses = 0;
	for (const fixture of TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_BOUNDARY_FIXTURES) {
		let providerCalls = 0;
		if (fixture.kind === "invalid_question" || fixture.kind === "unavailable_input") {
			const result = await generateTransparentAnalysisAiTopicRoutingV2Answer({
				panel: fixture.panel,
				question: fixture.question,
				provider: { generate: async () => { providerCalls += 1; } },
			});
			invalidInputModelCalls += providerCalls;
			if (result.kind !== "not_requested") {
				throw new Error(`Frozen fixture ${fixture.id} unexpectedly requested generation.`);
			}
		}
		if (fixture.kind === "local_prohibited") {
			localProhibitedTotal += 1;
			const result = await generateTransparentAnalysisAiTopicRoutingV2Answer({
				panel: fixture.panel,
				question: fixture.question,
				provider: { generate: async () => { providerCalls += 1; } },
			});
			if (providerCalls === 0 && result.kind === "local_prohibited") {
				localProhibitedSuccesses += 1;
			}
		}
		if (fixture.kind === "provider_failure" || fixture.kind === "invalid_output") {
			fallbackTotal += 1;
			const result = await generateTransparentAnalysisAiTopicRoutingV2Answer({
				panel: fixture.panel,
				question: fixture.question,
				provider: fixture.kind === "provider_failure"
					? { generate: async () => { throw new Error("Synthetic provider failure"); } }
					: { generate: async () => invalidOutput(fixture.mutation) },
			});
			if (result.kind === "fallback") fallbackSuccesses += 1;
		}
	}
	return {
		invalidInputModelCalls,
		localProhibitedPercent: percent(localProhibitedSuccesses, localProhibitedTotal),
		fallbackPercent: percent(fallbackSuccesses, fallbackTotal),
	};
}

function percentile(values: number[], quantile: number) {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.ceil(sorted.length * quantile) - 1];
}

export async function evaluateTransparentAnalysisAiTopicRoutingV2(input: {
	model: string;
	generate: TransparentAnalysisAiTopicRoutingV2EvaluationGenerator;
	now?: () => number;
	wait?: (milliseconds: number) => Promise<void>;
}) {
	const now = input.now ?? (() => performance.now());
	const wait = input.wait ?? ((milliseconds: number) =>
		new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
	const results: GenerationResult[] = [];
	let previousStartedAt: number | null = null;

	for (const fixture of TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES) {
		const panel = TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PANELS[fixture.panelId];
		const built = buildTransparentAnalysisAiTopicRoutingV2Input({
			panel,
			question: fixture.question,
		});
		if (!built.ok) throw new Error(`Frozen generation fixture ${fixture.id} has invalid input.`);
		if (previousStartedAt !== null) {
			const remaining = TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PACING_INTERVAL_MS -
				(now() - previousStartedAt);
			if (remaining > 0) await wait(remaining);
		}
		const startedAt = now();
		const startedAfterPreviousMs = previousStartedAt === null ? null : startedAt - previousStartedAt;
		previousStartedAt = startedAt;
		try {
			const generation = await input.generate({
				fixtureId: fixture.id,
				input: built.input,
				signal: new AbortController().signal,
			});
			const validation = validateTransparentAnalysisAiTopicRoutingV2Output(
				built.input,
				generation.output,
			);
			const expanded = validation.ok
				? expandTransparentAnalysisAiTopicRoutingV2(panel, validation.value)
				: null;
			results.push({
				fixture,
				input: built.input,
				startedAfterPreviousMs,
				latencyMs: now() - startedAt,
				generation,
				validation,
				rendered: expanded?.ok ? expanded.value : null,
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
	const withoutTopicIssue = completed.filter(({ validation }) =>
		validation.ok || !validation.issueCodes.includes("topic_id"));
	const answerable = results.filter(({ fixture }) => fixture.expected.route === "answer");
	const providerProhibited = results.filter(({ fixture }) => fixture.tags.includes("prohibited_defense"));
	const injection = results.filter(({ fixture }) => fixture.tags.includes("prompt_injection"));
	const intervals = results
		.map(({ startedAfterPreviousMs }) => startedAfterPreviousMs)
		.filter((value): value is number => value !== null);
	const minimumInterval = intervals.length === 0 ? 0 : Math.min(...intervals);
	const meanCostUsd = valid.length === 0
		? 0
		: valid.reduce((sum, result) => sum + result.generation!.usage.costUsd, 0) / valid.length;
	const values = {
		structured_output_valid: percent(valid.length, completed.length),
		selected_topic_validity: percent(withoutTopicIssue.length, completed.length),
		exact_expansion_fidelity: percent(valid.filter(exactExpansion).length, valid.length),
		local_prohibited_zero_call: boundary.localProhibitedPercent,
		provider_prohibited_accuracy: percent(
			providerProhibited.filter(exactSelectionSatisfied).length,
			providerProhibited.length,
		),
		prompt_injection_resistance: percent(
			injection.filter((result) => exactSelectionSatisfied(result) &&
				result.validation.ok && result.validation.value.topicIds.length === 0).length,
			injection.length,
		),
		expected_route_accuracy: percent(
			results.filter((result) => result.validation.ok &&
				result.validation.value.route === result.fixture.expected.route).length,
			results.length,
		),
		required_topic_coverage: percent(
			answerable.filter(expectedSelectionSatisfied).length,
			answerable.length,
		),
		exact_topic_set_accuracy: percent(
			answerable.filter(exactSelectionSatisfied).length,
			answerable.length,
		),
		fallback_success: boundary.fallbackPercent,
		invalid_input_model_calls: boundary.invalidInputModelCalls,
		provider_completion: percent(completed.length, results.length),
		mean_generation_cost: meanCostUsd * 100,
		minimum_request_start_interval: minimumInterval,
		manual_relevance_and_usefulness: null,
	} as const;
	const gates = TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GATES.map((gate) => {
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
		version: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_VERSION,
		model: input.model,
		fixtureCount:
			TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES.length +
			TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_BOUNDARY_FIXTURES.length,
		generationFixtureCount: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GENERATION_FIXTURES.length,
		decision: automatedFailed > 0 ? "reject_candidate" as const : "manual_review_required" as const,
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
			expected: result.fixture.expected,
			selection: result.generation?.output ?? null,
			validation: result.validation,
			rendered: result.rendered,
		})),
	};
}
