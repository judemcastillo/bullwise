import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_CONTINUE_CONFIRMATION,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FINALIZE_CONFIRMATION,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_START_CONFIRMATION,
	runTransparentAnalysisAiTopicRoutingV3Command,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v3-command";
import {
	TransparentAnalysisAiTopicRoutingV3SimulatedInterruption,
	continueTransparentAnalysisAiTopicRoutingV3Run,
	initializeTransparentAnalysisAiTopicRoutingV3Run,
	inspectTransparentAnalysisAiTopicRoutingV3Run,
	type TransparentAnalysisAiTopicRoutingV3RunConfig,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v3-durable-run";
import {
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FIXTURES_SHA256,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FIXTURES_VERSION,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v3-fixtures";
import {
	GOOGLE_TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_CANDIDATE,
} from "@/lib/analysis/google-transparent-analysis-ai-topic-routing-v2-provider";
import { TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_PROTOCOL } from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2-prompt";

async function temporaryRoot(test: (root: string) => Promise<void>) {
	const root = await mkdtemp(join(tmpdir(), "bullwise-topic-v3-command-"));
	try {
		await test(root);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
}

function frozenConfig(rootDirectory: string, runId: string): TransparentAnalysisAiTopicRoutingV3RunConfig {
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

function successfulTransport(onCall?: () => void, startIndex = 0) {
	let index = startIndex;
	return async (_input: string | URL | Request, init?: RequestInit) => {
		onCall?.();
		assert.equal(init?.signal?.aborted, false);
		const expected = TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES[index++].expected;
		return new Response(JSON.stringify({
			candidates: [{ content: { parts: [{ text: JSON.stringify({ version: "2.0.0", ...expected }) }] } }],
			usageMetadata: { promptTokenCount: 81, candidatesTokenCount: 7 },
		}), { status: 200, headers: { "Content-Type": "application/json" } });
	};
}

describe("transparent analysis AI topic routing v3 command", () => {
	it("requires the exact action-specific confirmation flags", async () => {
		let calls = 0;
		await assert.rejects(
			runTransparentAnalysisAiTopicRoutingV3Command(["start"], {
				apiKey: "synthetic-key",
				fetchImplementation: successfulTransport(() => { calls += 1; }),
			}),
			/exact action and confirmation flag/,
		);
		await assert.rejects(
			runTransparentAnalysisAiTopicRoutingV3Command([
				"continue", "v3-test", TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_START_CONFIRMATION,
			], { apiKey: "synthetic-key" }),
			/exact action and confirmation flag/,
		);
		assert.equal(calls, 0);
	});

	it("starts through synthetic Google transport and finalizes without another provider call", async () => {
		await temporaryRoot(async (root) => {
			let calls = 0;
			let clock = 10_000;
			const messages: string[] = [];
			const started = await runTransparentAnalysisAiTopicRoutingV3Command([
				"start", TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_START_CONFIRMATION,
			], {
				apiKey: "synthetic-key",
				rootDirectory: root,
				createRunId: () => "v3-synthetic-start",
				now: () => clock,
				wait: async (milliseconds) => { clock += milliseconds; },
				fetchImplementation: successfulTransport(() => { calls += 1; clock += 11; }),
				log: (message) => { messages.push(message); },
			});
			assert.equal(started.action, "start");
			assert.equal(started.progress.completed, 62);
			assert.equal(calls, 62);
			assert.ok(messages.some((message) => message.includes("v3-synthetic-start")));

			const finalized = await runTransparentAnalysisAiTopicRoutingV3Command([
				"finalize", "v3-synthetic-start",
				TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FINALIZE_CONFIRMATION,
			], { rootDirectory: root, now: () => clock, log: () => undefined });
			assert.equal(finalized.action, "finalize");
			assert.equal(calls, 62);
			assert.equal(finalized.report.evaluation.decision, "manual_review_required");
			const report = await readFile(finalized.reportPath, "utf8");
			assert.equal(report.includes("synthetic-key"), false);
			for (const fixture of TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES) {
				assert.equal(report.includes(fixture.question), false);
			}
		});
	});

	it("continues only fixtures without a durable start marker", async () => {
		await temporaryRoot(async (root) => {
			const runId = "v3-synthetic-continuation";
			const config = frozenConfig(root, runId);
			let clock = 20_000;
			await initializeTransparentAnalysisAiTopicRoutingV3Run({ config, now: () => clock });
			await assert.rejects(
				continueTransparentAnalysisAiTopicRoutingV3Run({
					config,
					fixtures: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES.map((fixture) => ({
						id: fixture.id,
						request: { fixture },
					})),
					now: () => clock,
					generate: async () => {
						clock += 9;
						throw new TransparentAnalysisAiTopicRoutingV3SimulatedInterruption();
					},
				}),
				TransparentAnalysisAiTopicRoutingV3SimulatedInterruption,
			);

			let calls = 0;
			const continued = await runTransparentAnalysisAiTopicRoutingV3Command([
				"continue", runId, TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_CONTINUE_CONFIRMATION,
			], {
				apiKey: "synthetic-key",
				rootDirectory: root,
				now: () => clock,
				wait: async (milliseconds) => { clock += milliseconds; },
				fetchImplementation: successfulTransport(() => { calls += 1; clock += 10; }, 1),
				log: () => undefined,
			});
			assert.equal(continued.action, "continue");
			assert.equal(calls, 61);
			assert.equal(continued.progress.completed, 61);
			assert.equal(continued.progress.indeterminate, 1);
			assert.equal(continued.progress.remaining, 0);
		});
	});

	it("records malformed completed Google output as invalid without retaining it", async () => {
		await temporaryRoot(async (root) => {
			let index = 0;
			let clock = 30_000;
			await runTransparentAnalysisAiTopicRoutingV3Command([
				"start", TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_START_CONFIRMATION,
			], {
				apiKey: "synthetic-key",
				rootDirectory: root,
				createRunId: () => "v3-invalid-transport-output",
				now: () => clock,
				wait: async (milliseconds) => { clock += milliseconds; },
				fetchImplementation: async () => {
					const fixture = TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES[index++];
					clock += 8;
					const text = index === 1
						? "SECRET INVALID RAW OUTPUT"
						: JSON.stringify({ version: "2.0.0", ...fixture.expected });
					return new Response(JSON.stringify({
						candidates: [{ content: { parts: [{ text }] } }],
						usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 3 },
					}), { status: 200, headers: { "Content-Type": "application/json" } });
				},
				log: () => undefined,
			});
			const state = await inspectTransparentAnalysisAiTopicRoutingV3Run(
				frozenConfig(root, "v3-invalid-transport-output"),
			);
			const first = state.results.get(
				TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_GENERATION_FIXTURES[0].id,
			);
			assert.equal(first?.statusClass, "completed_invalid");
			assert.deepEqual(first?.validationIssueCodes, ["schema"]);
			assert.equal(first?.inputTokens, 12);
			const stored = await readFile(
				join(root, "v3-invalid-transport-output", "operations.jsonl"),
				"utf8",
			);
			assert.equal(stored.includes("SECRET INVALID RAW OUTPUT"), false);
		});
	});
});
