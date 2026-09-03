import {
	buildTransparentAnalysisAiInput,
	TRANSPARENT_ANALYSIS_AI_CONTRACT_VERSION,
	TRANSPARENT_ANALYSIS_AI_EVALUATION_GATES,
	type TransparentAnalysisAiInput,
	type TransparentAnalysisAiValidationResult,
	validateTransparentAnalysisAiExplanation,
} from "@/lib/analysis/transparent-analysis-ai-contract";
import { TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES } from "@/lib/analysis/transparent-analysis-ai-fixtures";
import {
	TRANSPARENT_ANALYSIS_AI_PROMPT_SHA256,
	TRANSPARENT_ANALYSIS_AI_PROMPT_VERSION,
	TRANSPARENT_ANALYSIS_AI_SYSTEM_PROMPT,
	TRANSPARENT_ANALYSIS_AI_OUTPUT_SCHEMA,
} from "@/lib/analysis/transparent-analysis-ai-prompt";
import {
	generateTransparentAnalysisAiExplanation,
	type TransparentAnalysisAiProvider,
	type TransparentAnalysisAiProviderRequest,
	type TransparentAnalysisAiMeasuredGeneration,
} from "@/lib/analysis/transparent-analysis-ai-provider";

const DISCLAIMER = "Descriptive market context—not investment advice or a trading signal.";

export type TransparentAnalysisAiEvaluationGenerator = (
	request: TransparentAnalysisAiProviderRequest,
) => Promise<TransparentAnalysisAiMeasuredGeneration>;

export type TransparentAnalysisAiEvaluationProtocol = {
	version: string;
	promptVersion: string;
	promptSha256: string;
	systemPrompt: string;
	outputSchema: Record<string, unknown>;
	gates: readonly (typeof TRANSPARENT_ANALYSIS_AI_EVALUATION_GATES)[number][];
	requestSignal: () => AbortSignal;
};

type GenerationEvaluationResult = {
	fixtureId: string;
	input: TransparentAnalysisAiInput;
	latencyMs: number;
	generation: TransparentAnalysisAiMeasuredGeneration | null;
	validation: TransparentAnalysisAiValidationResult;
};

const DEFAULT_PROTOCOL: TransparentAnalysisAiEvaluationProtocol = {
	version: TRANSPARENT_ANALYSIS_AI_CONTRACT_VERSION,
	promptVersion: TRANSPARENT_ANALYSIS_AI_PROMPT_VERSION,
	promptSha256: TRANSPARENT_ANALYSIS_AI_PROMPT_SHA256,
	systemPrompt: TRANSPARENT_ANALYSIS_AI_SYSTEM_PROMPT,
	outputSchema: TRANSPARENT_ANALYSIS_AI_OUTPUT_SCHEMA,
	gates: TRANSPARENT_ANALYSIS_AI_EVALUATION_GATES,
	requestSignal: () => AbortSignal.timeout(5_000),
};

function providerRequest(
	input: TransparentAnalysisAiInput,
	protocol: TransparentAnalysisAiEvaluationProtocol,
) {
	return {
		promptVersion: protocol.promptVersion,
		promptSha256: protocol.promptSha256,
		systemPrompt: protocol.systemPrompt,
		outputSchema: protocol.outputSchema,
		input,
		signal: protocol.requestSignal(),
	} satisfies TransparentAnalysisAiProviderRequest;
}

function validOutput(input: TransparentAnalysisAiInput): Record<string, unknown> {
	const factors = (["trend", "momentum", "volatility", "participation"] as const).map(
		(factor) => ({
			factor,
			state: input.factors[factor].state,
			explanation: {
				text: input.factors[factor].facts[0].text,
				factIds: [input.factors[factor].facts[0].id],
			},
		}),
	);
	return {
		version: TRANSPARENT_ANALYSIS_AI_CONTRACT_VERSION,
		context: input.context,
		overview: {
			text: input.factors.trend.facts[0].text,
			factIds: [input.factors.trend.facts[0].id],
		},
		factors,
		limitations: [...input.limitations],
		disclaimer: DISCLAIMER,
	};
}

function invalidOutput(
	input: TransparentAnalysisAiInput,
	mutation: NonNullable<(typeof TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES)[number]["mutation"]>,
): unknown {
	if (mutation === "malformed_or_truncated") return '{"version":';
	const output = validOutput(input);
	const overview = output.overview as { text: string; factIds: string[] };
	const factors = output.factors as Array<{
		state: string;
		explanation: { text: string; factIds: string[] };
	}>;
	if (mutation === "extra_field") output.extra = true;
	if (mutation === "context_and_state_drift") {
		output.context = input.context === "defensive" ? "constructive" : "defensive";
		factors[0].state = input.factors.trend.state === "bearish" ? "bullish" : "bearish";
	}
	if (mutation === "limitations_and_disclaimer_drift") {
		output.limitations = [];
		output.disclaimer = "Changed";
	}
	if (mutation === "fake_citation") overview.factIds = ["trend.evidence.999"];
	if (mutation === "cross_factor_citation") {
		factors[0].explanation.factIds = [input.factors.momentum.facts[0].id];
	}
	if (mutation === "invented_number") overview.text = "The context has a 99% reading.";
	if (mutation === "advice_and_unsupported_domain") {
		overview.text = "Buy because news and liquidity support the trade.";
	}
	return output;
}

async function boundaryMetrics() {
	let unavailableCalls = 0;
	const unavailable = TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES.filter(
		({ kind }) => kind === "unavailable_input",
	);
	for (const fixture of unavailable) {
		await generateTransparentAnalysisAiExplanation({
			panel: fixture.panel,
			provider: { generate: async () => { unavailableCalls += 1; } },
		});
	}

	const fallbackFixtures = TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES.filter(
		({ kind }) => kind === "provider_failure" || kind === "invalid_output",
	);
	let fallbackSuccesses = 0;
	for (const fixture of fallbackFixtures) {
		const modelInput = buildTransparentAnalysisAiInput(fixture.panel);
		if (!modelInput) throw new Error("Frozen fallback fixture unexpectedly unavailable");
		const provider: TransparentAnalysisAiProvider = fixture.kind === "provider_failure"
			? { generate: async () => { throw new Error("synthetic failure"); } }
			: { generate: async () => invalidOutput(modelInput, fixture.mutation!) };
		const result = await generateTransparentAnalysisAiExplanation({
			panel: fixture.panel,
			provider,
			timeoutMs: 25,
		});
		if (result.kind === "fallback" && result.panel === fixture.panel) {
			fallbackSuccesses += 1;
		}
	}
	return {
		unavailableCalls,
		fallbackPercent: (fallbackSuccesses / fallbackFixtures.length) * 100,
	};
}

function percent(numerator: number, denominator: number) {
	return denominator === 0 ? 0 : (numerator / denominator) * 100;
}

function p95(values: number[]) {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.ceil(sorted.length * 0.95) - 1];
}

export async function evaluateTransparentAnalysisAiCandidate(input: {
	model: string;
	generate: TransparentAnalysisAiEvaluationGenerator;
	protocol?: TransparentAnalysisAiEvaluationProtocol;
}) {
	const protocol = input.protocol ?? DEFAULT_PROTOCOL;
	const generationFixtures = TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES.filter(
		({ kind }) => kind === "generation",
	);
	const results: GenerationEvaluationResult[] = [];
	for (const fixture of generationFixtures) {
		const modelInput = buildTransparentAnalysisAiInput(fixture.panel);
		if (!modelInput) throw new Error("Frozen generation fixture unexpectedly unavailable");
		const startedAt = performance.now();
		try {
			const generation = await input.generate(providerRequest(modelInput, protocol));
			const latencyMs = performance.now() - startedAt;
			const validation = validateTransparentAnalysisAiExplanation(
				modelInput,
				generation.output,
			);
			results.push({ fixtureId: fixture.id, input: modelInput, latencyMs, generation, validation });
		} catch {
			results.push({
				fixtureId: fixture.id,
				input: modelInput,
				latencyMs: performance.now() - startedAt,
				generation: null,
				validation: { ok: false as const, reasons: ["Provider failure."], issueCodes: ["schema" as const] },
			});
		}
	}

	const boundary = await boundaryMetrics();
	const issueCount = (code: string) => results.filter(({ validation }) =>
		!validation.ok && validation.issueCodes.includes(code as never)).length;
	const dimensionPercent = (code: string) => percent(
		results.filter(({ generation, validation }) =>
			generation !== null &&
			(validation.ok || !validation.issueCodes.includes(code as never)),
		).length,
		results.length,
	);
	const successful = results.filter(({ validation }) => validation.ok);
	const meanCostUsd = successful.length === 0
		? 0
		: successful.reduce((sum, result) => sum + result.generation!.usage.costUsd, 0) /
			successful.length;
	const values = {
		structured_output_valid: percent(successful.length, results.length),
		factor_state_fidelity: dimensionPercent("state_fidelity"),
		citation_validity: dimensionPercent("citation"),
		novel_numeric_claims: issueCount("novel_numeric"),
		prohibited_advice_claims: issueCount("prohibited_advice"),
		unsupported_domain_claims: issueCount("unsupported_domain"),
		unavailable_input_model_calls: boundary.unavailableCalls,
		fallback_success: boundary.fallbackPercent,
		manual_groundedness: null,
		generation_p95_latency: p95(results.map(({ latencyMs }) => latencyMs)),
		mean_generation_cost: meanCostUsd * 100,
	} as const;
	const gates = protocol.gates.map((gate) => {
		const value = values[gate.id];
		const passed = value === null
			? null
			: gate.comparison === "="
				? value === gate.threshold
				: value <= gate.threshold;
		return { ...gate, value, passed };
	});
	const automatedPassed = gates.filter(({ passed }) => passed === true).length;
	const automatedFailed = gates.filter(({ passed }) => passed === false).length;
	return {
		version: protocol.version,
		contractVersion: TRANSPARENT_ANALYSIS_AI_CONTRACT_VERSION,
		model: input.model,
		promptVersion: protocol.promptVersion,
		promptSha256: protocol.promptSha256,
		fixtureCount: TRANSPARENT_ANALYSIS_AI_EVALUATION_FIXTURES.length,
		generationFixtureCount: generationFixtures.length,
		decision: automatedFailed > 0 ? "reject_candidate" : "manual_review_required",
		automatedPassed,
		automatedFailed,
		gates,
		observations: {
			generationP95LatencyMs: values.generation_p95_latency,
		},
		manualReview: results.map(({ fixtureId, input: modelInput, generation, validation }) => ({
			fixtureId,
			input: modelInput,
			output: generation?.output ?? null,
			validation,
		})),
	};
}
