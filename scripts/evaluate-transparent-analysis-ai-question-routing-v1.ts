import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import {
	GOOGLE_TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_CANDIDATE,
	GoogleTransparentAnalysisAiQuestionRoutingProvider,
} from "@/lib/analysis/google-transparent-analysis-ai-question-routing-provider";
import { evaluateTransparentAnalysisAiQuestionRoutingV1 } from "@/lib/analysis/transparent-analysis-ai-question-routing-evaluation";
import { TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_FIXTURES_SHA256 } from "@/lib/analysis/transparent-analysis-ai-question-routing-fixtures";
import { TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROTOCOL } from "@/lib/analysis/transparent-analysis-ai-question-routing-prompt";

const OUTPUT = "artifacts/analysis/transparent-analysis-ai-question-routing-development-v1.json";
const CONFIRMATION = "--confirm-frozen-development";
const USAGE = `Usage: npm run evaluate:transparent-analysis-ai-question-routing-v1 -- ${CONFIRMATION}

Runs the frozen Google Gemini question-routing development evaluation once.
It makes 40 sequential requests with at least 6.1 seconds between starts, has no
Bullwise timeout or retry, and writes a new report without replacing an existing
one. It uses synthetic fixtures only and does not authorize production.`;

async function main() {
	const arguments_ = process.argv.slice(2);
	if (arguments_.length === 1 && arguments_[0] === "--help") {
		console.log(USAGE);
		return;
	}
	if (arguments_.length !== 1 || arguments_[0] !== CONFIRMATION) {
		throw new Error(`Frozen development confirmation is required.\n\n${USAGE}`);
	}

	loadEnvConfig(process.cwd());
	const apiKey = process.env.GEMINI_API_KEY?.trim();
	if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
	const provider = new GoogleTransparentAnalysisAiQuestionRoutingProvider({ apiKey });
	console.error(
		`Evaluating grounded question routing with ${GOOGLE_TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_CANDIDATE.model}...`,
	);
	const candidate = await evaluateTransparentAnalysisAiQuestionRoutingV1({
		model: GOOGLE_TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_CANDIDATE.model,
		generate: (request) => provider.generateForEvaluation(request),
	});
	const report = {
		version: TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROTOCOL.version,
		createdAt: new Date().toISOString(),
		scope: "frozen_synthetic_development_fixtures_only",
		provider: "google",
		freeTierAssumed: true,
		interaction: "explicit_user_request",
		bullwiseTimeout: null,
		retryEnabled: false,
		productionIntegrationAuthorized: false,
		promptVersion: TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROTOCOL.promptVersion,
		promptSha256: TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROTOCOL.promptSha256,
		fixturesSha256: TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_FIXTURES_SHA256,
		requestStartIntervalMs:
			TRANSPARENT_ANALYSIS_AI_QUESTION_ROUTING_PROTOCOL.minimumStartIntervalMs,
		candidate,
	};
	const output = `${JSON.stringify(report, null, 2)}\n`;
	const outputPath = resolve(OUTPUT);
	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, output, { encoding: "utf8", flag: "wx", mode: 0o600 });
	console.log(`AI question-routing development evaluation: ${outputPath}`);
	console.log(`SHA-256: ${createHash("sha256").update(output).digest("hex")}`);
	console.log(
		`${candidate.model}: ${candidate.decision} | ${candidate.automatedPassed}/12 automated gates | ${candidate.observations.providerCompleted}/${candidate.generationFixtureCount} completed`,
	);
}

main().catch((error: unknown) => {
	if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
		console.error("The question-routing development report already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
