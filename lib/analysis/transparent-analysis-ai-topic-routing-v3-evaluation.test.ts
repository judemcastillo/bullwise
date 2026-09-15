import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
	continueTransparentAnalysisAiTopicRoutingV3Run,
	initializeTransparentAnalysisAiTopicRoutingV3Run,
	inspectTransparentAnalysisAiTopicRoutingV3Run,
	type TransparentAnalysisAiTopicRoutingV3RunConfig,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v3-durable-run";
import {
	evaluateTransparentAnalysisAiTopicRoutingV3,
	finalizeTransparentAnalysisAiTopicRoutingV3,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v3-evaluation";
import {
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FIXTURES_SHA256,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FIXTURES_VERSION,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v3-fixtures";
import { TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL } from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2-prompt";

function config(rootDirectory: string): TransparentAnalysisAiTopicRoutingV3RunConfig {
	return {
		rootDirectory,
		runId: "v3-evaluation-fake-run",
		model: "fake-topic-router",
		promptVersion: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL.promptVersion,
		promptSha256: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL.promptSha256,
		fixturesVersion: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FIXTURES_VERSION,
		fixturesSha256: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FIXTURES_SHA256,
		fixtureIds: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES.map(({ id }) => id),
		minimumStartIntervalMs:
			TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL.minimumStartIntervalMs,
	};
}

const fixtures = TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES.map((fixture) => ({
	id: fixture.id,
	request: { expected: fixture.expected },
}));

async function temporaryRun(test: (root: string) => Promise<void>) {
	const root = await mkdtemp(join(tmpdir(), "bullwise-topic-v3-evaluation-"));
	try {
		await test(root);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
}

describe("transparent analysis AI topic routing v3 evaluator and finalizer", () => {
	it("passes every automated gate with a complete ideal fake run", async () => {
		await temporaryRun(async (root) => {
			const frozen = config(root);
			let clock = 1_000;
			await initializeTransparentAnalysisAiTopicRoutingV3Run({ config: frozen, now: () => clock });
			await continueTransparentAnalysisAiTopicRoutingV3Run({
				config: frozen,
				fixtures,
				now: () => clock,
				wait: async (milliseconds) => { clock += milliseconds; },
				generate: async ({ expected }) => {
					clock += 18;
					return {
						kind: "completed_valid",
						output: { version: "2.0.0", ...expected },
						usage: { inputTokens: 75, outputTokens: 9, estimatedCostUsd: 0 },
					};
				},
			});
			const report = await evaluateTransparentAnalysisAiTopicRoutingV3(
				await inspectTransparentAnalysisAiTopicRoutingV3Run(frozen),
			);
			assert.equal(report.decision, "manual_review_required");
			assert.equal(report.automatedPassed, 14);
			assert.equal(report.automatedFailed, 0);
			assert.equal(report.observations.providerCompleted, 62);
			assert.equal(report.observations.remaining, 0);
			assert.equal(report.observations.minimumRequestStartIntervalMs, 6_100);
			assert.ok(report.gates.filter(({ passed }) => passed !== null).every(({ passed }) => passed));

			const finalized = await finalizeTransparentAnalysisAiTopicRoutingV3({
				config: frozen,
				createdAtEpochMs: 500_000,
			});
			assert.equal((await stat(finalized.reportPath)).mode & 0o777, 0o600);
			const contents = await readFile(finalized.reportPath, "utf8");
			for (const { question } of TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES) {
				assert.equal(contents.includes(question), false);
			}
			assert.equal(contents.includes("secretQuestion"), false);
			assert.equal(finalized.sha256.length, 64);
			await assert.rejects(
				finalizeTransparentAnalysisAiTopicRoutingV3({ config: frozen }),
				(error: NodeJS.ErrnoException) => error.code === "EEXIST",
			);
		});
	});

	it("rejects a completed fake run with a bounded invalid-topic result", async () => {
		await temporaryRun(async (root) => {
			const frozen = config(root);
			let clock = 2_000;
			await initializeTransparentAnalysisAiTopicRoutingV3Run({ config: frozen, now: () => clock });
			await continueTransparentAnalysisAiTopicRoutingV3Run({
				config: frozen,
				fixtures,
				now: () => clock,
				wait: async (milliseconds) => { clock += milliseconds; },
				generate: async ({ fixtureId, expected }) => {
					clock += 15;
					return fixtureId === frozen.fixtureIds[0]
						? {
							kind: "completed_invalid",
							issueCodes: ["topic_id"],
							usage: { inputTokens: 70, outputTokens: 8, estimatedCostUsd: 0.005 },
						} as const
						: {
							kind: "completed_valid",
							output: { version: "2.0.0", ...expected },
							usage: { inputTokens: 70, outputTokens: 8, estimatedCostUsd: 0 },
						} as const;
				},
			});
			const report = await evaluateTransparentAnalysisAiTopicRoutingV3(
				await inspectTransparentAnalysisAiTopicRoutingV3Run(frozen),
			);
			assert.equal(report.decision, "reject_candidate");
			assert.equal(
				report.gates.find(({ id }) => id === "structured_output_valid")?.passed,
				false,
			);
			assert.equal(
				report.gates.find(({ id }) => id === "selected_topic_validity")?.passed,
				false,
			);
			assert.equal(report.observations.inputTokens, 62 * 70);
			assert.equal(report.observations.outputTokens, 62 * 8);
			assert.equal(report.observations.estimatedCostUsd, 0.005);
			const serialized = JSON.stringify(report);
			assert.equal(serialized.includes("private_topic"), false);
			assert.equal(serialized.includes("What evidence sets the panel"), false);
		});
	});

	it("marks an unfinished run inconclusive and closes it after finalization", async () => {
		await temporaryRun(async (root) => {
			const frozen = config(root);
			await initializeTransparentAnalysisAiTopicRoutingV3Run({ config: frozen, now: () => 3_000 });
			const finalized = await finalizeTransparentAnalysisAiTopicRoutingV3({
				config: frozen,
				createdAtEpochMs: 4_000,
			});
			assert.equal(finalized.report.evaluation.decision, "operationally_inconclusive");
			assert.equal(finalized.report.evaluation.observations.remaining, 62);
			await assert.rejects(
				continueTransparentAnalysisAiTopicRoutingV3Run({
					config: frozen,
					fixtures,
					generate: async ({ expected }) => ({
						kind: "completed_valid",
						output: { version: "2.0.0", ...expected },
						usage: { inputTokens: 1, outputTokens: 1, estimatedCostUsd: 0 },
					}),
				}),
				/finalized and cannot continue/,
			);
		});
	});

	it("refuses any non-frozen fixture or prompt identity", async () => {
		await temporaryRun(async (root) => {
			const frozen = config(root);
			await initializeTransparentAnalysisAiTopicRoutingV3Run({ config: frozen, now: () => 5_000 });
			await assert.rejects(
				finalizeTransparentAnalysisAiTopicRoutingV3({
					config: { ...frozen, fixtureIds: [...frozen.fixtureIds].reverse() },
				}),
				/exact frozen v3 fixture order/,
			);
			await assert.rejects(
				finalizeTransparentAnalysisAiTopicRoutingV3({
					config: { ...frozen, promptSha256: "d".repeat(64) },
				}),
				/does not match the frozen configuration/,
			);
		});
	});
});
