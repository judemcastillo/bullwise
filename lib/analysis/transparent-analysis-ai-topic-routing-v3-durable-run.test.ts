import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
	TransparentAnalysisAiTopicRoutingV3SimulatedInterruption,
	continueTransparentAnalysisAiTopicRoutingV3Run,
	initializeTransparentAnalysisAiTopicRoutingV3Run,
	inspectTransparentAnalysisAiTopicRoutingV3Run,
	type TransparentAnalysisAiTopicRoutingV3RunConfig,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v3-durable-run";

function config(rootDirectory: string): TransparentAnalysisAiTopicRoutingV3RunConfig {
	return {
		rootDirectory,
		runId: "v3-fake-run",
		model: "fake-topic-router",
		promptVersion: "topic-routing-v2-prompt",
		promptSha256: "a".repeat(64),
		fixturesVersion: "topic-routing-v3-fixtures",
		fixturesSha256: "b".repeat(64),
		fixtureIds: ["v3-fixture-one", "v3-fixture-two", "v3-fixture-three"],
		minimumStartIntervalMs: 6_100,
	};
}

const fixtures: readonly { id: string; request: { secretQuestion: string } }[] = [
	{ id: "v3-fixture-one", request: { secretQuestion: "first private synthetic question" } },
	{ id: "v3-fixture-two", request: { secretQuestion: "second private synthetic question" } },
	{ id: "v3-fixture-three", request: { secretQuestion: "third private synthetic question" } },
];

async function temporaryRun(test: (root: string) => Promise<void>) {
	const root = await mkdtemp(join(tmpdir(), "bullwise-topic-v3-"));
	try {
		await test(root);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
}

describe("transparent analysis AI topic routing v3 durable run", () => {
	it("writes owner-only create-once state without request or raw response content", async () => {
		await temporaryRun(async (root) => {
			const frozen = config(root);
			let clock = 1_000;
			await initializeTransparentAnalysisAiTopicRoutingV3Run({ config: frozen, now: () => clock });
			const result = await continueTransparentAnalysisAiTopicRoutingV3Run({
				config: frozen,
				fixtures,
				now: () => clock,
				wait: async (milliseconds) => { clock += milliseconds; },
				generate: async ({ fixtureId }) => {
					clock += 25;
					return {
						kind: "completed_valid",
						output: { version: "2.0.0", route: "answer", topicIds: [
							fixtureId === "v3-fixture-two" ? "momentum" : "trend",
						] },
						usage: { inputTokens: 70, outputTokens: 9, estimatedCostUsd: 0 },
					};
				},
			});
			assert.deepEqual(result, {
				providerCalls: 3,
				started: 3,
				completed: 3,
				indeterminate: 0,
				remaining: 0,
			});
			const run = join(root, frozen.runId);
			for (const directory of [run, join(run, "starts"), join(run, "results")]) {
				assert.equal((await stat(directory)).mode & 0o777, 0o700);
			}
			const files = [
				join(run, "manifest.json"),
				join(run, "operations.jsonl"),
				...frozen.fixtureIds.flatMap((id) => [
					join(run, "starts", `${id}.json`),
					join(run, "results", `${id}.json`),
				]),
			];
			const contents: string[] = [];
			for (const file of files) {
				assert.equal((await stat(file)).mode & 0o777, 0o600);
				contents.push(await readFile(file, "utf8"));
			}
			const serialized = contents.join("\n");
			assert.equal(serialized.includes("private synthetic question"), false);
			assert.equal(serialized.includes("rawResponse"), false);
			const repeated = await continueTransparentAnalysisAiTopicRoutingV3Run({
				config: frozen,
				fixtures,
				generate: async () => {
					throw new Error("A completed fixture must never be called again.");
				},
			});
			assert.equal(repeated.providerCalls, 0);
			assert.equal(repeated.completed, 3);
			await assert.rejects(
				initializeTransparentAnalysisAiTopicRoutingV3Run({ config: frozen }),
				(error: NodeJS.ErrnoException) => error.code === "EEXIST",
			);
		});
	});

	it("recovers by skipping every fixture that already has a start marker", async () => {
		await temporaryRun(async (root) => {
			const frozen = config(root);
			let clock = 2_000;
			const calls = new Map<string, number>();
			await initializeTransparentAnalysisAiTopicRoutingV3Run({ config: frozen, now: () => clock });
			await assert.rejects(
				continueTransparentAnalysisAiTopicRoutingV3Run({
					config: frozen,
					fixtures,
					now: () => clock,
					wait: async (milliseconds) => { clock += milliseconds; },
					generate: async ({ fixtureId }) => {
						calls.set(fixtureId, (calls.get(fixtureId) ?? 0) + 1);
						clock += 20;
						if (fixtureId === "v3-fixture-two") {
							throw new TransparentAnalysisAiTopicRoutingV3SimulatedInterruption();
						}
						return {
							kind: "completed_valid",
							output: { version: "2.0.0", route: "answer", topicIds: ["trend"] },
							usage: { inputTokens: 60, outputTokens: 8, estimatedCostUsd: 0 },
						};
					},
				}),
				TransparentAnalysisAiTopicRoutingV3SimulatedInterruption,
			);
			let state = await inspectTransparentAnalysisAiTopicRoutingV3Run(frozen);
			assert.equal(state.markers.size, 2);
			assert.equal(state.results.size, 1);

			const recovered = await continueTransparentAnalysisAiTopicRoutingV3Run({
				config: frozen,
				fixtures,
				now: () => clock,
				wait: async (milliseconds) => { clock += milliseconds; },
				generate: async ({ fixtureId }) => {
					calls.set(fixtureId, (calls.get(fixtureId) ?? 0) + 1);
					clock += 20;
					return {
						kind: "completed_valid",
						output: { version: "2.0.0", route: "answer", topicIds: ["trend"] },
						usage: { inputTokens: 60, outputTokens: 8, estimatedCostUsd: 0 },
					};
				},
			});
			assert.deepEqual(recovered, {
				providerCalls: 1,
				started: 3,
				completed: 2,
				indeterminate: 1,
				remaining: 0,
			});
			assert.deepEqual(Object.fromEntries(calls), {
				"v3-fixture-one": 1,
				"v3-fixture-two": 1,
				"v3-fixture-three": 1,
			});
			state = await inspectTransparentAnalysisAiTopicRoutingV3Run(frozen);
			const starts = [...state.markers.values()].map(({ startedAtEpochMs }) => startedAtEpochMs);
			assert.ok(starts.slice(1).every((start, index) => start - starts[index] >= 6_100));
		});
	});

	it("stores only bounded failure metadata", async () => {
		await temporaryRun(async (root) => {
			const frozen = { ...config(root), fixtureIds: ["v3-fixture-one"] };
			await initializeTransparentAnalysisAiTopicRoutingV3Run({ config: frozen, now: () => 10_000 });
			const result = await continueTransparentAnalysisAiTopicRoutingV3Run({
				config: frozen,
				fixtures: fixtures.slice(0, 1),
				now: () => 10_100,
				generate: async () => {
					throw new Error("SENSITIVE PROVIDER BODY WITH CREDENTIAL");
				},
			});
			assert.equal(result.completed, 1);
			const run = join(root, frozen.runId);
			const stored = [
				await readFile(join(run, "operations.jsonl"), "utf8"),
				await readFile(join(run, "results", "v3-fixture-one.json"), "utf8"),
			].join("\n");
			assert.equal(stored.includes("SENSITIVE PROVIDER BODY"), false);
			assert.equal(stored.includes("credential"), false);
			assert.ok(stored.includes("provider_failure"));
		});
	});

	it("refuses hash or permission changes before continuation", async () => {
		await temporaryRun(async (root) => {
			const frozen = config(root);
			await initializeTransparentAnalysisAiTopicRoutingV3Run({ config: frozen, now: () => 5_000 });
			await assert.rejects(
				inspectTransparentAnalysisAiTopicRoutingV3Run({
					...frozen,
					fixturesSha256: "c".repeat(64),
				}),
				/does not match the frozen configuration/,
			);
			await chmod(join(root, frozen.runId, "manifest.json"), 0o644);
			await assert.rejects(
				inspectTransparentAnalysisAiTopicRoutingV3Run(frozen),
				/permissions are invalid/,
			);
		});
	});
});
