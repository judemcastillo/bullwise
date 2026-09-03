import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_4_PROTOCOL } from "@/lib/analysis/transparent-analysis-ai-content-evaluation-v1-4";
import { evaluateTransparentAnalysisAiCandidate } from "@/lib/analysis/transparent-analysis-ai-evaluation";
import {
	GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE,
	GoogleTransparentAnalysisAiProvider,
} from "@/lib/analysis/google-transparent-analysis-ai-provider";

const OUTPUT = "artifacts/analysis/transparent-analysis-ai-content-evaluation-v1-4.json";
const USAGE = `Usage: npm run evaluate:transparent-analysis-ai-content-v1-4

Runs the preregistered Gemini 3.5 Flash-Lite v1.4 development evaluation once,
with at least 6.1 seconds between request starts. It uses the unchanged v1.2
prompt, no Bullwise timeout, and no retries. Requires GEMINI_API_KEY. It does not
authorize or connect AI to production.`;

async function main() {
	const arguments_ = process.argv.slice(2);
	if (arguments_.length === 1 && arguments_[0] === "--help") {
		console.log(USAGE);
		return;
	}
	if (arguments_.length > 0) throw new Error("This evaluation accepts no overrides");

	loadEnvConfig(process.cwd());
	const apiKey = process.env.GEMINI_API_KEY?.trim();
	if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
	const provider = new GoogleTransparentAnalysisAiProvider({ apiKey });
	console.error(`Evaluating paced ${GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE.model}...`);
	const candidate = await evaluateTransparentAnalysisAiCandidate({
		model: GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE.model,
		protocol: TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_4_PROTOCOL,
		generate: (request) => provider.generateForEvaluation(request),
	});
	const report = {
		version: TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_4_PROTOCOL.version,
		createdAt: new Date().toISOString(),
		scope: "frozen_development_fixtures_only",
		provider: "google",
		freeTierAssumed: true,
		interaction: "explicit_user_request",
		bullwiseTimeout: null,
		requestStartIntervalMs:
			TRANSPARENT_ANALYSIS_AI_CONTENT_EVALUATION_V1_4_PROTOCOL.minimumStartIntervalMs,
		retryEnabled: false,
		productionIntegrationAuthorized: false,
		candidate,
	};
	const output = `${JSON.stringify(report, null, 2)}\n`;
	const outputPath = resolve(OUTPUT);
	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, output, { encoding: "utf8", flag: "wx", mode: 0o600 });
	console.log(`AI content evaluation: ${outputPath}`);
	console.log(`SHA-256: ${createHash("sha256").update(output).digest("hex")}`);
	console.log(
		`${candidate.model}: ${candidate.decision} | ${candidate.automatedPassed}/11 automated gates | ${candidate.observations.providerCompleted}/${candidate.generationFixtureCount} completed`,
	);
}

main().catch((error: unknown) => {
	if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
		console.error("The v1.4 content-evaluation report already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
