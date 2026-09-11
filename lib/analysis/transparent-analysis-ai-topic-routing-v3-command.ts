import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import {
	GOOGLE_TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_CANDIDATE,
	GoogleTransparentAnalysisAiTopicRoutingV2Provider,
} from "@/lib/analysis/google-transparent-analysis-ai-topic-routing-v2-provider";
import {
	GoogleTransparentAnalysisAiProviderError,
	type GoogleTransparentAnalysisAiFetchImplementation,
} from "@/lib/analysis/google-transparent-analysis-ai-provider";
import {
	continueTransparentAnalysisAiTopicRoutingV3Run,
	initializeTransparentAnalysisAiTopicRoutingV3Run,
	type TransparentAnalysisAiTopicRoutingV3ProviderResult,
	type TransparentAnalysisAiTopicRoutingV3RunConfig,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v3-durable-run";
import { finalizeTransparentAnalysisAiTopicRoutingV3 } from "@/lib/analysis/transparent-analysis-ai-topic-routing-v3-evaluation";
import {
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FIXTURES_SHA256,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FIXTURES_VERSION,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_PANELS,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v3-fixtures";
import { TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL } from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2-prompt";
import {
	buildTransparentAnalysisAiTopicRoutingV2Input,
	validateTransparentAnalysisAiTopicRoutingV2Output,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2";

export const TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_RUN_ROOT =
	"artifacts/analysis/transparent-analysis-ai-topic-routing-v3-runs";
export const TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_START_CONFIRMATION =
	"--confirm-frozen-v3-initial-run";
export const TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_CONTINUE_CONFIRMATION =
	"--confirm-frozen-v3-continuation";
export const TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FINALIZE_CONFIRMATION =
	"--confirm-frozen-v3-finalization";

export const TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_COMMAND_USAGE = `Usage:
  npm run evaluate:transparent-analysis-ai-topic-routing-v3 -- start ${TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_START_CONFIRMATION}
  npm run evaluate:transparent-analysis-ai-topic-routing-v3 -- continue <run-id> ${TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_CONTINUE_CONFIRMATION}
  npm run evaluate:transparent-analysis-ai-topic-routing-v3 -- finalize <run-id> ${TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FINALIZE_CONFIRMATION}

Start and continue make sequential Gemini requests against frozen synthetic fixtures only.
They have no Bullwise timeout or retry and preserve at least 6.1 seconds between starts.
Finalize is deterministic and makes no provider request. Existing runs and reports are never replaced.`;

type CommandDependencies = {
	apiKey?: string;
	rootDirectory?: string;
	fetchImplementation?: GoogleTransparentAnalysisAiFetchImplementation;
	now?: () => number;
	wait?: (milliseconds: number) => Promise<void>;
	createRunId?: () => string;
	log?: (message: string) => void;
};

function runConfig(rootDirectory: string, runId: string): TransparentAnalysisAiTopicRoutingV3RunConfig {
	return {
		rootDirectory,
		runId,
		model: GOOGLE_TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_CANDIDATE.model,
		promptVersion: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL.promptVersion,
		promptSha256: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL.promptSha256,
		fixturesVersion: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FIXTURES_VERSION,
		fixturesSha256: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FIXTURES_SHA256,
		fixtureIds: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES.map(({ id }) => id),
		minimumStartIntervalMs:
			TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL.minimumStartIntervalMs,
	};
}

function assertArguments(args: readonly string[]) {
	if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
		return { action: "help" as const };
	}
	if (args[0] === "start" && args.length === 2 &&
		args[1] === TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_START_CONFIRMATION) {
		return { action: "start" as const };
	}
	if (args[0] === "continue" && args.length === 3 &&
		args[2] === TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_CONTINUE_CONFIRMATION) {
		return { action: "continue" as const, runId: args[1] };
	}
	if (args[0] === "finalize" && args.length === 3 &&
		args[2] === TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FINALIZE_CONFIRMATION) {
		return { action: "finalize" as const, runId: args[1] };
	}
	throw new Error(`The exact action and confirmation flag are required.\n\n${TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_COMMAND_USAGE}`);
}

function defaultRunId() {
	return `v3-${randomBytes(16).toString("hex")}`;
}

function requireApiKey(apiKey: string | undefined) {
	const value = apiKey?.trim();
	if (!value) throw new Error("GEMINI_API_KEY is not configured");
	return value;
}

export async function runTransparentAnalysisAiTopicRoutingV3Command(
	args: readonly string[],
	dependencies: CommandDependencies = {},
) {
	const parsed = assertArguments(args);
	const log = dependencies.log ?? console.log;
	if (parsed.action === "help") {
		log(TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_COMMAND_USAGE);
		return { action: "help" as const };
	}
	const rootDirectory = resolve(
		dependencies.rootDirectory ?? TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_RUN_ROOT,
	);
	const runId = parsed.action === "start"
		? (dependencies.createRunId ?? defaultRunId)()
		: parsed.runId;
	const config = runConfig(rootDirectory, runId);
	if (parsed.action === "finalize") {
		const finalized = await finalizeTransparentAnalysisAiTopicRoutingV3({
			config,
			createdAtEpochMs: dependencies.now?.(),
		});
		log(`Final report: ${finalized.reportPath}`);
		log(`SHA-256: ${finalized.sha256}`);
		log(`Decision: ${finalized.report.evaluation.decision}`);
		return { action: "finalize" as const, runId, ...finalized };
	}
	const provider = new GoogleTransparentAnalysisAiTopicRoutingV2Provider({
		apiKey: requireApiKey(dependencies.apiKey),
		fetchImplementation: dependencies.fetchImplementation,
	});
	if (parsed.action === "start") {
		await initializeTransparentAnalysisAiTopicRoutingV3Run({ config, now: dependencies.now });
		log(`Durable run ID: ${runId}`);
		log(`Durable run directory: ${resolve(rootDirectory, runId)}`);
	}
	const fixtures = TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES.map((fixture) => ({
		id: fixture.id,
		request: { fixture },
	}));
	const progress = await continueTransparentAnalysisAiTopicRoutingV3Run({
		config,
		fixtures,
		now: dependencies.now,
		wait: dependencies.wait,
		generate: async ({ fixture }): Promise<TransparentAnalysisAiTopicRoutingV3ProviderResult> => {
			const built = buildTransparentAnalysisAiTopicRoutingV2Input({
				panel: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_PANELS[fixture.panelId],
				question: fixture.question,
			});
			if (!built.ok) throw new Error(`Frozen generation fixture ${fixture.id} is invalid.`);
			let measured: Awaited<ReturnType<typeof provider.generateForEvaluation>>;
			try {
				measured = await provider.generateForEvaluation({
					input: built.input,
					signal: new AbortController().signal,
				});
			} catch (error) {
				if (error instanceof GoogleTransparentAnalysisAiProviderError && error.usage &&
					(error.category === "missing_output" || error.category === "output_not_json")) {
					return {
						kind: "completed_invalid",
						issueCodes: ["schema"],
						usage: {
							inputTokens: error.usage.inputTokens,
							outputTokens: error.usage.outputTokens,
							estimatedCostUsd: error.usage.costUsd,
						},
					};
				}
				throw error;
			}
			const validation = validateTransparentAnalysisAiTopicRoutingV2Output(
				built.input,
				measured.output,
			);
			const usage = {
				inputTokens: measured.usage.inputTokens,
				outputTokens: measured.usage.outputTokens,
				estimatedCostUsd: measured.usage.costUsd,
			};
			return validation.ok
				? { kind: "completed_valid", output: validation.value, usage }
				: { kind: "completed_invalid", issueCodes: validation.issueCodes, usage };
		},
	});
	log(
		`Run ${runId}: ${progress.completed} completed, ${progress.indeterminate} indeterminate, ${progress.remaining} remaining.`,
	);
	return { action: parsed.action, runId, progress };
}
