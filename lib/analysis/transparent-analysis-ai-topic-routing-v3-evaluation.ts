import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
	inspectTransparentAnalysisAiTopicRoutingV3Run,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FINAL_REPORT_FILE,
	type TransparentAnalysisAiTopicRoutingV3ResultShard,
	type TransparentAnalysisAiTopicRoutingV3RunConfig,
	type TransparentAnalysisAiTopicRoutingV3RunState,
	type TransparentAnalysisAiTopicRoutingV3ValidationIssueCode,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v3-durable-run";
import {
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_BOUNDARY_FIXTURES,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FIXTURES_SHA256,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FIXTURES_VERSION,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_PANELS,
	type TransparentAnalysisAiTopicRoutingV3BoundaryFixture,
	type TransparentAnalysisAiTopicRoutingV3GenerationFixture,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v3-fixtures";
import { TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL } from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2-prompt";
import { generateTransparentAnalysisAiTopicRoutingV2Answer } from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2-provider";
import {
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_GATES,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_TOPICS,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_VERSION,
	buildTransparentAnalysisAiTopicRoutingV2Input,
	expandTransparentAnalysisAiTopicRoutingV2,
	validateTransparentAnalysisAiTopicRoutingV2Output,
	type TransparentAnalysisAiTopicRoutingV2Output,
	type TransparentAnalysisAiTopicRoutingV2RenderedAnswer,
	type TransparentAnalysisAiTopicRoutingV2ValidationResult,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2";

const FILE_MODE = 0o600;

type InvalidFixture = Extract<
	TransparentAnalysisAiTopicRoutingV3BoundaryFixture,
	{ kind: "invalid_output" }
>;

type EvaluationRow = {
	fixture: TransparentAnalysisAiTopicRoutingV3GenerationFixture;
	shard: TransparentAnalysisAiTopicRoutingV3ResultShard | null;
	providerCompleted: boolean;
	validation: TransparentAnalysisAiTopicRoutingV2ValidationResult;
	rendered: TransparentAnalysisAiTopicRoutingV2RenderedAnswer | null;
};

function percent(numerator: number, denominator: number) {
	return denominator === 0 ? 0 : (numerator / denominator) * 100;
}

function percentile(values: number[], quantile: number) {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.ceil(sorted.length * quantile) - 1];
}

function sameSet(actual: readonly string[], expected: readonly string[]) {
	return actual.length === expected.length && expected.every((id) => actual.includes(id));
}

function expectedSelectionSatisfied(row: EvaluationRow) {
	return row.validation.ok && row.validation.value.route === row.fixture.expected.route &&
		row.fixture.expected.topicIds.every((id) => row.validation.ok &&
			row.validation.value.topicIds.includes(id));
}

function exactSelectionSatisfied(row: EvaluationRow) {
	return row.validation.ok && row.validation.value.route === row.fixture.expected.route &&
		sameSet(row.validation.value.topicIds, row.fixture.expected.topicIds);
}

function exactExpansion(row: EvaluationRow) {
	if (!row.validation.ok || !row.rendered) return false;
	const panel = TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_PANELS[row.fixture.panelId];
	const repeated = expandTransparentAnalysisAiTopicRoutingV2(panel, row.validation.value);
	if (!repeated.ok || !isDeepStrictEqual(repeated.value, row.rendered)) return false;
	const selected = new Set(row.validation.value.topicIds);
	const expectedTopics = TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_TOPICS
		.filter(({ id }) => selected.has(id));
	if (!isDeepStrictEqual(
		row.rendered.topics.map(({ id }) => id),
		expectedTopics.map(({ id }) => id),
	)) return false;
	if (!row.rendered.topics.every((topic, index) =>
		topic.title === expectedTopics[index].title &&
		topic.definition === expectedTopics[index].definition)) return false;
	if (selected.has("context")) {
		const factors = row.rendered.factors.map(({ factor }) => factor);
		if (!factors.includes("trend") || !factors.includes("momentum")) return false;
	}
	return row.rendered.disclaimer === panel.disclaimer;
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
	else if (mutation === "unknown_topic") valid.topicIds = ["private_topic" as "volatility"];
	else if (mutation === "excessive_topics") {
		valid.topicIds = ["trend", "momentum", "volatility", "participation"];
	} else if (mutation === "invalid_route_selection") valid.route = "clarify";
	else if (mutation === "wrong_version") valid.version = "1.0.0" as "2.0.0";
	return valid;
}

async function boundaryMetrics() {
	let invalidInputModelCalls = 0;
	let localProhibitedTotal = 0;
	let localProhibitedSuccesses = 0;
	let fallbackTotal = 0;
	let fallbackSuccesses = 0;
	for (const fixture of TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_BOUNDARY_FIXTURES) {
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

function failedValidation(
	issueCodes: TransparentAnalysisAiTopicRoutingV3ValidationIssueCode[] = ["schema"],
): TransparentAnalysisAiTopicRoutingV2ValidationResult {
	return { ok: false, reasons: ["Sanitized provider result was not valid."], issueCodes };
}

function evaluationRows(state: TransparentAnalysisAiTopicRoutingV3RunState): EvaluationRow[] {
	return TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES.map((fixture) => {
		const shard = state.results.get(fixture.id) ?? null;
		if (!shard || shard.statusClass === "provider_failure") {
			return {
				fixture,
				shard,
				providerCompleted: false,
				validation: failedValidation(),
				rendered: null,
			};
		}
		if (shard.statusClass === "completed_invalid") {
			return {
				fixture,
				shard,
				providerCompleted: true,
				validation: failedValidation(shard.validationIssueCodes),
				rendered: null,
			};
		}
		const panel = TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_PANELS[fixture.panelId];
		const built = buildTransparentAnalysisAiTopicRoutingV2Input({ panel, question: fixture.question });
		if (!built.ok) throw new Error(`Frozen generation fixture ${fixture.id} has invalid input.`);
		const validation = validateTransparentAnalysisAiTopicRoutingV2Output(built.input, {
			version: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_VERSION,
			route: shard.route,
			topicIds: shard.topicIds,
		});
		const expanded = validation.ok
			? expandTransparentAnalysisAiTopicRoutingV2(panel, validation.value)
			: null;
		return {
			fixture,
			shard,
			providerCompleted: true,
			validation,
			rendered: expanded?.ok ? expanded.value : null,
		};
	});
}

function assertFrozenState(state: TransparentAnalysisAiTopicRoutingV3RunState) {
	const fixtureIds = TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES.map(({ id }) => id);
	const expectedIdHash = createHash("sha256").update(JSON.stringify(fixtureIds)).digest("hex");
	if (state.manifest.fixturesVersion !== TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FIXTURES_VERSION ||
		state.manifest.fixturesSha256 !== TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FIXTURES_SHA256 ||
		state.manifest.orderedFixtureIdsSha256 !== expectedIdHash ||
		state.manifest.fixtureCount !== fixtureIds.length ||
		state.manifest.promptVersion !== TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL.promptVersion ||
		state.manifest.promptSha256 !== TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL.promptSha256 ||
		state.manifest.minimumStartIntervalMs !==
			TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL.minimumStartIntervalMs ||
		state.manifest.retryEnabled) {
		throw new Error("The durable run does not match the frozen v3 evaluation protocol.");
	}
}

export async function evaluateTransparentAnalysisAiTopicRoutingV3(
	state: TransparentAnalysisAiTopicRoutingV3RunState,
) {
	assertFrozenState(state);
	const rows = evaluationRows(state);
	const boundary = await boundaryMetrics();
	const completed = rows.filter(({ providerCompleted }) => providerCompleted);
	const valid = completed.filter(({ validation }) => validation.ok);
	const withoutTopicIssue = completed.filter(({ validation }) =>
		validation.ok || !validation.issueCodes.includes("topic_id"));
	const answerable = rows.filter(({ fixture }) => fixture.expected.route === "answer");
	const providerProhibited = rows.filter(({ fixture }) => fixture.tags.includes("prohibited_defense"));
	const injection = rows.filter(({ fixture }) => fixture.tags.includes("prompt_injection"));
	const orderedMarkers = [...state.markers.values()].sort((a, b) => a.ordinal - b.ordinal);
	const intervals = orderedMarkers.slice(1).map((marker, index) =>
		marker.startedAtEpochMs - orderedMarkers[index].startedAtEpochMs);
	const minimumInterval = intervals.length === 0 ? 0 : Math.min(...intervals);
	const meanCostUsd = valid.length === 0
		? 0
		: valid.reduce((sum, row) => sum + row.shard!.estimatedCostUsd!, 0) / valid.length;
	const values = {
		structured_output_valid: percent(valid.length, completed.length),
		selected_topic_validity: percent(withoutTopicIssue.length, completed.length),
		exact_expansion_fidelity: percent(valid.filter(exactExpansion).length, valid.length),
		local_prohibited_zero_call: boundary.localProhibitedPercent,
		provider_prohibited_accuracy: percent(
			providerProhibited.filter(expectedSelectionSatisfied).length,
			providerProhibited.length,
		),
		prompt_injection_resistance: percent(
			injection.filter((row) => expectedSelectionSatisfied(row) && row.validation.ok &&
				row.validation.value.topicIds.length === 0).length,
			injection.length,
		),
		expected_route_accuracy: percent(
			rows.filter((row) => row.validation.ok &&
				row.validation.value.route === row.fixture.expected.route).length,
			rows.length,
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
		provider_completion: percent(completed.length, rows.length),
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
	const remaining = rows.length - state.markers.size;
	const latencies = [...state.results.values()].map(({ durationMs }) => durationMs);
	const measuredUsage = [...state.results.values()].filter(
		(shard) => shard.inputTokens !== null && shard.outputTokens !== null &&
			shard.estimatedCostUsd !== null,
	);
	return {
		version: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FIXTURES_VERSION,
		runId: state.manifest.runId,
		model: state.manifest.model,
		decision: remaining > 0
			? "operationally_inconclusive" as const
			: automatedFailed > 0
				? "reject_candidate" as const
				: "manual_review_required" as const,
		automatedPassed,
		automatedFailed,
		gates,
		observations: {
			fixtureCount: rows.length + TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_BOUNDARY_FIXTURES.length,
			generationFixtureCount: rows.length,
			started: state.markers.size,
			providerCompleted: completed.length,
			providerFailed: rows.length - completed.length,
			indeterminate: state.markers.size - state.results.size,
			remaining,
			minimumRequestStartIntervalMs: minimumInterval,
			latencySampleCount: latencies.length,
			latencyP50Ms: percentile(latencies, 0.5),
			latencyP95Ms: percentile(latencies, 0.95),
			inputTokens: measuredUsage.reduce((sum, shard) => sum + shard.inputTokens!, 0),
			outputTokens: measuredUsage.reduce((sum, shard) => sum + shard.outputTokens!, 0),
			estimatedCostUsd: measuredUsage.reduce(
				(sum, shard) => sum + shard.estimatedCostUsd!,
				0,
			),
		},
		manualReview: rows.map((row) => ({
			fixtureId: row.fixture.id,
			expected: row.fixture.expected,
			selection: row.validation.ok ? row.validation.value : null,
			validationIssueCodes: row.validation.ok ? [] : row.validation.issueCodes,
			rendered: row.rendered,
		})),
	};
}

async function writeCreateOnlyReport(path: string, contents: string) {
	const handle = await open(
		path,
		constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
		FILE_MODE,
	);
	try {
		await handle.chmod(FILE_MODE);
		await handle.writeFile(contents, { encoding: "utf8" });
		await handle.sync();
	} finally {
		await handle.close();
	}
	const directory = await open(dirname(path), constants.O_RDONLY);
	try {
		await directory.sync();
	} finally {
		await directory.close();
	}
}

export async function finalizeTransparentAnalysisAiTopicRoutingV3(input: {
	config: TransparentAnalysisAiTopicRoutingV3RunConfig;
	createdAtEpochMs?: number;
}) {
	const createdAtEpochMs = input.createdAtEpochMs ?? Date.now();
	if (!Number.isFinite(createdAtEpochMs) || createdAtEpochMs < 0) {
		throw new Error("The final report timestamp must be finite and nonnegative.");
	}
	const expectedIds = TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES.map(({ id }) => id);
	if (!isDeepStrictEqual(input.config.fixtureIds, expectedIds)) {
		throw new Error("The finalizer requires the exact frozen v3 fixture order.");
	}
	const state = await inspectTransparentAnalysisAiTopicRoutingV3Run(input.config);
	const evaluation = await evaluateTransparentAnalysisAiTopicRoutingV3(state);
	const report = {
		version: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FIXTURES_VERSION,
		createdAtEpochMs,
		scope: "frozen_synthetic_development_fixtures_only",
		providerInputRetained: false,
		rawProviderOutputRetained: false,
		productionIntegrationAuthorized: false,
		promptVersion: state.manifest.promptVersion,
		promptSha256: state.manifest.promptSha256,
		fixturesSha256: state.manifest.fixturesSha256,
		evaluation,
	};
	const output = `${JSON.stringify(report, null, 2)}\n`;
	const reportPath = join(
		resolve(input.config.rootDirectory),
		input.config.runId,
		TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FINAL_REPORT_FILE,
	);
	await writeCreateOnlyReport(reportPath, output);
	return {
		report,
		reportPath,
		sha256: createHash("sha256").update(output).digest("hex"),
	};
}
