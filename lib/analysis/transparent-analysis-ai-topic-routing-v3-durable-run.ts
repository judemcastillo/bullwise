import { createHash } from "node:crypto";
import { constants } from "node:fs";
import {
	chmod,
	lstat,
	mkdir,
	open,
	readFile,
	readdir,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_TOPICS,
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_VERSION,
	type TransparentAnalysisAiTopicRoutingV2Output,
	type TransparentAnalysisAiTopicRoutingV2Route,
	type TransparentAnalysisAiTopicRoutingV2TopicId,
} from "@/lib/analysis/transparent-analysis-ai-topic-routing-v2";

export const TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_RUN_VERSION = "1.0.0";
export const TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_RECOVERY_POLICY_VERSION = "1.0.0";
export const TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FINAL_REPORT_FILE = "report.json";

const FILE_MODE = 0o600;
const DIRECTORY_MODE = 0o700;
const SAFE_ID = /^[a-z0-9][a-z0-9_-]{0,100}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const TOPIC_IDS = new Set<string>(
	TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_TOPICS.map(({ id }) => id),
);

type Usage = {
	inputTokens: number;
	outputTokens: number;
	estimatedCostUsd: number;
};

export type TransparentAnalysisAiTopicRoutingV3ValidationIssueCode =
	| "schema"
	| "route"
	| "topic_id"
	| "selection_rule";

export type TransparentAnalysisAiTopicRoutingV3ProviderResult =
	| {
			kind: "completed_valid";
			output: TransparentAnalysisAiTopicRoutingV2Output;
			usage: Usage;
	  }
	| {
			kind: "completed_invalid";
			issueCodes: TransparentAnalysisAiTopicRoutingV3ValidationIssueCode[];
			usage: Usage;
	  };

export type TransparentAnalysisAiTopicRoutingV3RunConfig = {
	rootDirectory: string;
	runId: string;
	model: string;
	promptVersion: string;
	promptSha256: string;
	fixturesVersion: string;
	fixturesSha256: string;
	fixtureIds: readonly string[];
	minimumStartIntervalMs: number;
};

export type TransparentAnalysisAiTopicRoutingV3RunManifest = {
	version: typeof TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_RUN_VERSION;
	recoveryPolicyVersion: typeof TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_RECOVERY_POLICY_VERSION;
	runId: string;
	model: string;
	promptVersion: string;
	promptSha256: string;
	fixturesVersion: string;
	fixturesSha256: string;
	orderedFixtureIdsSha256: string;
	fixtureCount: number;
	minimumStartIntervalMs: number;
	retryEnabled: false;
	createdAtEpochMs: number;
};

export type TransparentAnalysisAiTopicRoutingV3StartMarker = {
	version: typeof TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_RUN_VERSION;
	runId: string;
	fixtureId: string;
	ordinal: number;
	model: string;
	startedAtEpochMs: number;
};

export type TransparentAnalysisAiTopicRoutingV3ResultShard = {
	version: typeof TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_RUN_VERSION;
	runId: string;
	fixtureId: string;
	ordinal: number;
	providerCompleted: boolean;
	statusClass: "completed_valid" | "completed_invalid" | "provider_failure";
	schemaValid: boolean | null;
	validationOutcome: "valid" | "invalid" | "not_available";
	validationIssueCodes: TransparentAnalysisAiTopicRoutingV3ValidationIssueCode[];
	route: TransparentAnalysisAiTopicRoutingV2Route | null;
	topicIds: TransparentAnalysisAiTopicRoutingV2TopicId[];
	errorCategory: "invalid_output" | "provider_failure" | null;
	durationMs: number;
	inputTokens: number | null;
	outputTokens: number | null;
	estimatedCostUsd: number | null;
};

type Manifest = TransparentAnalysisAiTopicRoutingV3RunManifest;
type StartMarker = TransparentAnalysisAiTopicRoutingV3StartMarker;
type ResultShard = TransparentAnalysisAiTopicRoutingV3ResultShard;

type OperationalEvent = {
	version: typeof TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_RUN_VERSION;
	runId: string;
	fixtureId: string;
	ordinal: number;
	event: "request_started" | "request_completed" | "request_failed";
	timestampEpochMs: number;
	durationMs: number | null;
	providerCompleted: boolean | null;
	statusClass: "started" | ResultShard["statusClass"];
	schemaValid: boolean | null;
	inputTokens: number | null;
	outputTokens: number | null;
	estimatedCostUsd: number | null;
};

export class TransparentAnalysisAiTopicRoutingV3SimulatedInterruption extends Error {
	constructor() {
		super("Simulated durable-run interruption");
		this.name = "TransparentAnalysisAiTopicRoutingV3SimulatedInterruption";
	}
}

function canonicalJson(value: unknown) {
	return `${JSON.stringify(value)}\n`;
}

function orderedFixtureIdsSha256(fixtureIds: readonly string[]) {
	return createHash("sha256").update(JSON.stringify(fixtureIds)).digest("hex");
}

function assertFiniteNonnegative(value: number, label: string) {
	if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be finite and nonnegative.`);
}

function assertConfig(config: TransparentAnalysisAiTopicRoutingV3RunConfig) {
	if (!SAFE_ID.test(config.runId)) throw new Error("The durable run ID is invalid.");
	if (!config.model.trim()) throw new Error("The durable run model is required.");
	if (!config.promptVersion.trim() || !config.fixturesVersion.trim()) {
		throw new Error("The durable run versions are required.");
	}
	if (!SHA256.test(config.promptSha256) || !SHA256.test(config.fixturesSha256)) {
		throw new Error("The durable run checksums must be lowercase SHA-256 values.");
	}
	if (config.fixtureIds.length === 0) throw new Error("The durable run requires fixtures.");
	if (new Set(config.fixtureIds).size !== config.fixtureIds.length) {
		throw new Error("The durable run fixture IDs must be unique.");
	}
	if (config.fixtureIds.some((id) => !SAFE_ID.test(id))) {
		throw new Error("A durable run fixture ID is invalid.");
	}
	assertFiniteNonnegative(config.minimumStartIntervalMs, "minimumStartIntervalMs");
}

function runDirectory(config: TransparentAnalysisAiTopicRoutingV3RunConfig) {
	const root = resolve(config.rootDirectory);
	const run = resolve(root, config.runId);
	if (dirname(run) !== root) throw new Error("The durable run path escapes its root.");
	return run;
}

async function syncDirectory(path: string) {
	const handle = await open(path, constants.O_RDONLY);
	try {
		await handle.sync();
	} finally {
		await handle.close();
	}
}

async function createOnlyFile(path: string, contents: string) {
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
	await syncDirectory(dirname(path));
}

async function appendDurableLine(path: string, value: unknown) {
	await assertOwnerOnlyFile(path);
	const handle = await open(
		path,
		constants.O_APPEND | constants.O_WRONLY | constants.O_NOFOLLOW,
	);
	try {
		await handle.writeFile(canonicalJson(value), { encoding: "utf8" });
		await handle.sync();
	} finally {
		await handle.close();
	}
}

async function assertOwnerOnlyDirectory(path: string) {
	const metadata = await lstat(path);
	if (!metadata.isDirectory() || (metadata.mode & 0o777) !== DIRECTORY_MODE) {
		throw new Error(`Durable run directory permissions are invalid: ${path}`);
	}
}

async function assertOwnerOnlyFile(path: string) {
	const metadata = await lstat(path);
	if (!metadata.isFile() || (metadata.mode & 0o777) !== FILE_MODE) {
		throw new Error(`Durable run file permissions are invalid: ${path}`);
	}
}

async function readJsonFile(path: string): Promise<unknown> {
	await assertOwnerOnlyFile(path);
	const contents = await readFile(path, "utf8");
	if (Buffer.byteLength(contents) > 64 * 1024) throw new Error(`Durable run file is too large: ${path}`);
	return JSON.parse(contents) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
	return Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
}

function isNonnegativeNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isNullableNonnegativeNumber(value: unknown): value is number | null {
	return value === null || isNonnegativeNumber(value);
}

function isRoute(value: unknown): value is TransparentAnalysisAiTopicRoutingV2Route {
	return value === "answer" || value === "clarify" || value === "prohibited";
}

function isTopicIds(value: unknown): value is TransparentAnalysisAiTopicRoutingV2TopicId[] {
	return Array.isArray(value) && value.length <= 3 &&
		new Set(value).size === value.length &&
		value.every((id) => typeof id === "string" && TOPIC_IDS.has(id));
}

function isValidationIssueCodes(
	value: unknown,
): value is TransparentAnalysisAiTopicRoutingV3ValidationIssueCode[] {
	const allowed = new Set(["schema", "route", "topic_id", "selection_rule"]);
	return Array.isArray(value) && value.length <= allowed.size &&
		new Set(value).size === value.length &&
		value.every((code) => typeof code === "string" && allowed.has(code));
}

function assertStrictOutput(output: TransparentAnalysisAiTopicRoutingV2Output) {
	if (!isRecord(output) || !hasExactKeys(output, ["version", "route", "topicIds"]) ||
		output.version !== TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_VERSION ||
		!isRoute(output.route) || !isTopicIds(output.topicIds) ||
		(output.route === "answer" ? output.topicIds.length === 0 : output.topicIds.length !== 0)) {
		throw new Error("The sanitized provider output is invalid.");
	}
}

function assertUsage(usage: Usage) {
	assertFiniteNonnegative(usage.inputTokens, "inputTokens");
	assertFiniteNonnegative(usage.outputTokens, "outputTokens");
	assertFiniteNonnegative(usage.estimatedCostUsd, "estimatedCostUsd");
}

function manifestFor(
	config: TransparentAnalysisAiTopicRoutingV3RunConfig,
	createdAtEpochMs: number,
): Manifest {
	return {
		version: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_RUN_VERSION,
		recoveryPolicyVersion: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_RECOVERY_POLICY_VERSION,
		runId: config.runId,
		model: config.model,
		promptVersion: config.promptVersion,
		promptSha256: config.promptSha256,
		fixturesVersion: config.fixturesVersion,
		fixturesSha256: config.fixturesSha256,
		orderedFixtureIdsSha256: orderedFixtureIdsSha256(config.fixtureIds),
		fixtureCount: config.fixtureIds.length,
		minimumStartIntervalMs: config.minimumStartIntervalMs,
		retryEnabled: false,
		createdAtEpochMs,
	};
}

export async function initializeTransparentAnalysisAiTopicRoutingV3Run(input: {
	config: TransparentAnalysisAiTopicRoutingV3RunConfig;
	now?: () => number;
}) {
	assertConfig(input.config);
	const path = runDirectory(input.config);
	const root = resolve(input.config.rootDirectory);
	await mkdir(root, { recursive: true, mode: DIRECTORY_MODE });
	await chmod(root, DIRECTORY_MODE);
	await mkdir(path, { mode: DIRECTORY_MODE });
	await chmod(path, DIRECTORY_MODE);
	await mkdir(join(path, "starts"), { mode: DIRECTORY_MODE });
	await chmod(join(path, "starts"), DIRECTORY_MODE);
	await mkdir(join(path, "results"), { mode: DIRECTORY_MODE });
	await chmod(join(path, "results"), DIRECTORY_MODE);
	const createdAtEpochMs = (input.now ?? Date.now)();
	assertFiniteNonnegative(createdAtEpochMs, "createdAtEpochMs");
	await createOnlyFile(join(path, "manifest.json"), canonicalJson(manifestFor(input.config, createdAtEpochMs)));
	await createOnlyFile(join(path, "operations.jsonl"), "");
	await syncDirectory(path);
	return path;
}

function assertManifest(value: unknown, config: TransparentAnalysisAiTopicRoutingV3RunConfig): Manifest {
	if (!isRecord(value) || !hasExactKeys(value, [
		"version", "recoveryPolicyVersion", "runId", "model", "promptVersion", "promptSha256",
		"fixturesVersion", "fixturesSha256", "orderedFixtureIdsSha256", "fixtureCount",
		"minimumStartIntervalMs", "retryEnabled", "createdAtEpochMs",
	])) throw new Error("The durable run manifest is malformed.");
	const expected = manifestFor(config, value.createdAtEpochMs as number);
	if (!isNonnegativeNumber(value.createdAtEpochMs) || JSON.stringify(value) !== JSON.stringify(expected)) {
		throw new Error("The durable run manifest does not match the frozen configuration.");
	}
	return expected;
}

function assertStartMarker(value: unknown, expected: Omit<StartMarker, "startedAtEpochMs">): StartMarker {
	if (!isRecord(value) || !hasExactKeys(value, [
		"version", "runId", "fixtureId", "ordinal", "model", "startedAtEpochMs",
	]) || !isNonnegativeNumber(value.startedAtEpochMs)) {
		throw new Error(`The start marker for ${expected.fixtureId} is malformed.`);
	}
	const marker = value as StartMarker;
	for (const [key, expectedValue] of Object.entries(expected)) {
		if (marker[key as keyof StartMarker] !== expectedValue) {
			throw new Error(`The start marker for ${expected.fixtureId} is inconsistent.`);
		}
	}
	return marker;
}

function assertResultShard(value: unknown, marker: StartMarker): ResultShard {
	if (!isRecord(value) || !hasExactKeys(value, [
		"version", "runId", "fixtureId", "ordinal", "providerCompleted", "statusClass",
		"schemaValid", "validationOutcome", "validationIssueCodes", "route", "topicIds", "errorCategory",
		"durationMs", "inputTokens", "outputTokens", "estimatedCostUsd",
	])) throw new Error(`The result shard for ${marker.fixtureId} is malformed.`);
	const shard = value as ResultShard;
	if (shard.version !== TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_RUN_VERSION ||
		shard.runId !== marker.runId || shard.fixtureId !== marker.fixtureId ||
		shard.ordinal !== marker.ordinal || !isNonnegativeNumber(shard.durationMs) ||
		!isNullableNonnegativeNumber(shard.inputTokens) ||
		!isNullableNonnegativeNumber(shard.outputTokens) ||
		!isNullableNonnegativeNumber(shard.estimatedCostUsd) || !isTopicIds(shard.topicIds) ||
		!isValidationIssueCodes(shard.validationIssueCodes)) {
		throw new Error(`The result shard for ${marker.fixtureId} is inconsistent.`);
	}
	if (shard.statusClass === "completed_valid") {
		if (!shard.providerCompleted || shard.schemaValid !== true || shard.validationOutcome !== "valid" ||
			shard.validationIssueCodes.length !== 0 ||
			!isRoute(shard.route) || shard.errorCategory !== null || shard.inputTokens === null ||
			shard.outputTokens === null || shard.estimatedCostUsd === null) {
			throw new Error(`The valid result shard for ${marker.fixtureId} is inconsistent.`);
		}
		assertStrictOutput({
			version: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V2_VERSION,
			route: shard.route,
			topicIds: shard.topicIds,
		});
	} else if (shard.statusClass === "completed_invalid") {
		if (!shard.providerCompleted || shard.schemaValid !== false || shard.validationOutcome !== "invalid" ||
			shard.validationIssueCodes.length === 0 ||
			shard.route !== null || shard.topicIds.length !== 0 || shard.errorCategory !== "invalid_output" ||
			shard.inputTokens === null || shard.outputTokens === null || shard.estimatedCostUsd === null) {
			throw new Error(`The invalid result shard for ${marker.fixtureId} is inconsistent.`);
		}
	} else if (shard.statusClass === "provider_failure") {
		if (shard.providerCompleted || shard.schemaValid !== null ||
			shard.validationOutcome !== "not_available" || shard.validationIssueCodes.length !== 0 ||
			shard.route !== null ||
			shard.topicIds.length !== 0 || shard.errorCategory !== "provider_failure" ||
			shard.inputTokens !== null || shard.outputTokens !== null ||
			shard.estimatedCostUsd !== null) {
			throw new Error(`The failure result shard for ${marker.fixtureId} is inconsistent.`);
		}
	} else {
		throw new Error(`The result shard for ${marker.fixtureId} has an unknown status.`);
	}
	return shard;
}

function assertOperationalEvent(
	value: unknown,
	config: TransparentAnalysisAiTopicRoutingV3RunConfig,
): OperationalEvent {
	if (!isRecord(value) || !hasExactKeys(value, [
		"version", "runId", "fixtureId", "ordinal", "event", "timestampEpochMs", "durationMs",
		"providerCompleted", "statusClass", "schemaValid", "inputTokens", "outputTokens",
		"estimatedCostUsd",
	]) || value.version !== TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_RUN_VERSION ||
		value.runId !== config.runId || typeof value.fixtureId !== "string" ||
		!config.fixtureIds.includes(value.fixtureId) || !Number.isInteger(value.ordinal) ||
		value.ordinal !== config.fixtureIds.indexOf(value.fixtureId) ||
		!isNonnegativeNumber(value.timestampEpochMs) ||
		!isNullableNonnegativeNumber(value.durationMs) ||
		!isNullableNonnegativeNumber(value.inputTokens) ||
		!isNullableNonnegativeNumber(value.outputTokens) ||
		!isNullableNonnegativeNumber(value.estimatedCostUsd)) {
		throw new Error("The durable operational log is malformed.");
	}
	const validStarted = value.event === "request_started" && value.statusClass === "started" &&
		value.durationMs === null && value.providerCompleted === null && value.schemaValid === null &&
		value.inputTokens === null && value.outputTokens === null && value.estimatedCostUsd === null;
	const validCompleted = value.event === "request_completed" && value.providerCompleted === true &&
		(value.statusClass === "completed_valid" || value.statusClass === "completed_invalid") &&
		typeof value.schemaValid === "boolean" && value.durationMs !== null &&
		value.inputTokens !== null && value.outputTokens !== null && value.estimatedCostUsd !== null;
	const validFailed = value.event === "request_failed" && value.providerCompleted === false &&
		value.statusClass === "provider_failure" && value.schemaValid === null &&
		value.durationMs !== null && value.inputTokens === null && value.outputTokens === null &&
		value.estimatedCostUsd === null;
	if (!validStarted && !validCompleted && !validFailed) {
		throw new Error("The durable operational event is inconsistent.");
	}
	return value as OperationalEvent;
}

export type TransparentAnalysisAiTopicRoutingV3RunState = {
	manifest: Manifest;
	markers: ReadonlyMap<string, StartMarker>;
	results: ReadonlyMap<string, ResultShard>;
};

export async function inspectTransparentAnalysisAiTopicRoutingV3Run(
	config: TransparentAnalysisAiTopicRoutingV3RunConfig,
): Promise<TransparentAnalysisAiTopicRoutingV3RunState> {
	assertConfig(config);
	const path = runDirectory(config);
	await assertOwnerOnlyDirectory(path);
	await assertOwnerOnlyDirectory(join(path, "starts"));
	await assertOwnerOnlyDirectory(join(path, "results"));
	const manifest = assertManifest(await readJsonFile(join(path, "manifest.json")), config);
	const markerNames = await readdir(join(path, "starts"));
	const resultNames = await readdir(join(path, "results"));
	const allowedNames = new Set(config.fixtureIds.map((id) => `${id}.json`));
	if (markerNames.some((name) => !allowedNames.has(name)) || resultNames.some((name) => !allowedNames.has(name))) {
		throw new Error("The durable run contains an unknown fixture file.");
	}
	const markers = new Map<string, StartMarker>();
	for (const [ordinal, fixtureId] of config.fixtureIds.entries()) {
		if (!markerNames.includes(`${fixtureId}.json`)) continue;
		const marker = assertStartMarker(
			await readJsonFile(join(path, "starts", `${fixtureId}.json`)),
			{
				version: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_RUN_VERSION,
				runId: config.runId,
				fixtureId,
				ordinal,
				model: config.model,
			},
		);
		markers.set(fixtureId, marker);
	}
	const results = new Map<string, ResultShard>();
	for (const [ordinal, fixtureId] of config.fixtureIds.entries()) {
		if (!resultNames.includes(`${fixtureId}.json`)) continue;
		const marker = markers.get(fixtureId);
		if (!marker || marker.ordinal !== ordinal) {
			throw new Error(`Result shard ${fixtureId} has no matching start marker.`);
		}
		results.set(
			fixtureId,
			assertResultShard(await readJsonFile(join(path, "results", `${fixtureId}.json`)), marker),
		);
	}
	await assertOwnerOnlyFile(join(path, "operations.jsonl"));
	const operationText = await readFile(join(path, "operations.jsonl"), "utf8");
	if (Buffer.byteLength(operationText) > 1024 * 1024) {
		throw new Error("The durable operational log is too large.");
	}
	const events = operationText.split("\n").filter(Boolean).map((line) =>
		assertOperationalEvent(JSON.parse(line) as unknown, config));
	for (const fixtureId of config.fixtureIds) {
		const marker = markers.get(fixtureId);
		const shard = results.get(fixtureId);
		const fixtureEvents = events.filter((event) => event.fixtureId === fixtureId);
		const startedEvents = fixtureEvents.filter((event) => event.event === "request_started");
		const finishedEvents = fixtureEvents.filter((event) => event.event !== "request_started");
		if (startedEvents.length > 1 || finishedEvents.length > 1 ||
			(fixtureEvents.length > 0 && !marker) || (shard && startedEvents.length !== 1) ||
			(finishedEvents.length > 0 && !shard)) {
			throw new Error(`Operational events for ${fixtureId} are inconsistent.`);
		}
		if (marker && startedEvents.length === 1 &&
			JSON.stringify(startedEvents[0]) !== JSON.stringify(operationalEvent(marker))) {
			throw new Error(`The start event for ${fixtureId} is inconsistent.`);
		}
		if (marker && shard && finishedEvents.length === 1 &&
			JSON.stringify(finishedEvents[0]) !== JSON.stringify(operationalEvent(marker, shard))) {
			throw new Error(`The result event for ${fixtureId} is inconsistent.`);
		}
	}
	return { manifest, markers, results };
}

function operationalEvent(marker: StartMarker, shard?: ResultShard): OperationalEvent {
	if (!shard) {
		return {
			version: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_RUN_VERSION,
			runId: marker.runId,
			fixtureId: marker.fixtureId,
			ordinal: marker.ordinal,
			event: "request_started",
			timestampEpochMs: marker.startedAtEpochMs,
			durationMs: null,
			providerCompleted: null,
			statusClass: "started",
			schemaValid: null,
			inputTokens: null,
			outputTokens: null,
			estimatedCostUsd: null,
		};
	}
	return {
		version: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_RUN_VERSION,
		runId: marker.runId,
		fixtureId: marker.fixtureId,
		ordinal: marker.ordinal,
		event: shard.providerCompleted ? "request_completed" : "request_failed",
		timestampEpochMs: marker.startedAtEpochMs + shard.durationMs,
		durationMs: shard.durationMs,
		providerCompleted: shard.providerCompleted,
		statusClass: shard.statusClass,
		schemaValid: shard.schemaValid,
		inputTokens: shard.inputTokens,
		outputTokens: shard.outputTokens,
		estimatedCostUsd: shard.estimatedCostUsd,
	};
}

function resultShard(input: {
	marker: StartMarker;
	durationMs: number;
	result?: TransparentAnalysisAiTopicRoutingV3ProviderResult;
}): ResultShard {
	assertFiniteNonnegative(input.durationMs, "durationMs");
	if (!input.result) {
		return {
			version: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_RUN_VERSION,
			runId: input.marker.runId,
			fixtureId: input.marker.fixtureId,
			ordinal: input.marker.ordinal,
			providerCompleted: false,
			statusClass: "provider_failure",
			schemaValid: null,
			validationOutcome: "not_available",
			validationIssueCodes: [],
			route: null,
			topicIds: [],
			errorCategory: "provider_failure",
			durationMs: input.durationMs,
			inputTokens: null,
			outputTokens: null,
			estimatedCostUsd: null,
		};
	}
	assertUsage(input.result.usage);
	if (input.result.kind === "completed_valid") {
		assertStrictOutput(input.result.output);
		return {
			version: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_RUN_VERSION,
			runId: input.marker.runId,
			fixtureId: input.marker.fixtureId,
			ordinal: input.marker.ordinal,
			providerCompleted: true,
			statusClass: "completed_valid",
			schemaValid: true,
			validationOutcome: "valid",
			validationIssueCodes: [],
			route: input.result.output.route,
			topicIds: [...input.result.output.topicIds],
			errorCategory: null,
			durationMs: input.durationMs,
			inputTokens: input.result.usage.inputTokens,
			outputTokens: input.result.usage.outputTokens,
			estimatedCostUsd: input.result.usage.estimatedCostUsd,
		};
	}
	if (!isValidationIssueCodes(input.result.issueCodes) || input.result.issueCodes.length === 0) {
		throw new Error("The sanitized validation issue codes are invalid.");
	}
	return {
		version: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_RUN_VERSION,
		runId: input.marker.runId,
		fixtureId: input.marker.fixtureId,
		ordinal: input.marker.ordinal,
		providerCompleted: true,
		statusClass: "completed_invalid",
		schemaValid: false,
		validationOutcome: "invalid",
		validationIssueCodes: [...input.result.issueCodes],
		route: null,
		topicIds: [],
		errorCategory: "invalid_output",
		durationMs: input.durationMs,
		inputTokens: input.result.usage.inputTokens,
		outputTokens: input.result.usage.outputTokens,
		estimatedCostUsd: input.result.usage.estimatedCostUsd,
	};
}

export async function continueTransparentAnalysisAiTopicRoutingV3Run<T extends object>(input: {
	config: TransparentAnalysisAiTopicRoutingV3RunConfig;
	fixtures: readonly { id: string; request: T }[];
	generate: (request: T & { fixtureId: string }) =>
		Promise<TransparentAnalysisAiTopicRoutingV3ProviderResult>;
	now?: () => number;
	wait?: (milliseconds: number) => Promise<void>;
}) {
	if (input.fixtures.length !== input.config.fixtureIds.length ||
		input.fixtures.some((fixture, index) => fixture.id !== input.config.fixtureIds[index])) {
		throw new Error("The durable run fixtures do not match the frozen order.");
	}
	const now = input.now ?? Date.now;
	const wait = input.wait ?? ((milliseconds: number) =>
		new Promise<void>((resolvePromise) => setTimeout(resolvePromise, milliseconds)));
	const path = runDirectory(input.config);
	try {
		await lstat(join(path, TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_FINAL_REPORT_FILE));
		throw new Error("The durable run is finalized and cannot continue.");
	} catch (error) {
		if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
			throw error;
		}
	}
	let state = await inspectTransparentAnalysisAiTopicRoutingV3Run(input.config);
	let previousStartedAt = Math.max(
		...Array.from(state.markers.values(), ({ startedAtEpochMs }) => startedAtEpochMs),
		Number.NEGATIVE_INFINITY,
	);
	let providerCalls = 0;
	for (const [ordinal, fixture] of input.fixtures.entries()) {
		if (state.markers.has(fixture.id)) continue;
		if (Number.isFinite(previousStartedAt)) {
			const remaining = input.config.minimumStartIntervalMs - (now() - previousStartedAt);
			if (remaining > 0) await wait(remaining);
		}
		const startedAtEpochMs = now();
		assertFiniteNonnegative(startedAtEpochMs, "startedAtEpochMs");
		const marker: StartMarker = {
			version: TRANSPARENT_ANALYSIS_AI_TOPIC_ROUTING_V3_RUN_VERSION,
			runId: input.config.runId,
			fixtureId: fixture.id,
			ordinal,
			model: input.config.model,
			startedAtEpochMs,
		};
		await createOnlyFile(join(path, "starts", `${fixture.id}.json`), canonicalJson(marker));
		await appendDurableLine(join(path, "operations.jsonl"), operationalEvent(marker));
		previousStartedAt = startedAtEpochMs;
		providerCalls += 1;
		let shard: ResultShard;
		try {
			const result = await input.generate({ ...fixture.request, fixtureId: fixture.id });
			shard = resultShard({ marker, durationMs: now() - startedAtEpochMs, result });
		} catch (error) {
			if (error instanceof TransparentAnalysisAiTopicRoutingV3SimulatedInterruption) throw error;
			shard = resultShard({ marker, durationMs: now() - startedAtEpochMs });
		}
		await createOnlyFile(join(path, "results", `${fixture.id}.json`), canonicalJson(shard));
		await appendDurableLine(join(path, "operations.jsonl"), operationalEvent(marker, shard));
		state = await inspectTransparentAnalysisAiTopicRoutingV3Run(input.config);
	}
	state = await inspectTransparentAnalysisAiTopicRoutingV3Run(input.config);
	return {
		providerCalls,
		started: state.markers.size,
		completed: state.results.size,
		indeterminate: state.markers.size - state.results.size,
		remaining: input.config.fixtureIds.length - state.markers.size,
	};
}
