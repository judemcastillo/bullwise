import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { evaluateTransparentAnalysisAiSelectionV15 } from "@/lib/analysis/transparent-analysis-ai-selection-evaluation-v1-5";
import { TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROTOCOL } from "@/lib/analysis/transparent-analysis-ai-selection-v1-5";
import {
	GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE,
	GoogleTransparentAnalysisAiProvider,
} from "@/lib/analysis/google-transparent-analysis-ai-provider";

const OUTPUT = "artifacts/analysis/transparent-analysis-ai-selection-evaluation-v1-5.json";
const USAGE = `Usage: npm run evaluate:transparent-analysis-ai-selection-v1-5

Runs the preregistered Gemini 3.5 Flash-Lite v1.5 fact-selection development
evaluation once, with at least 6.1 seconds between request starts. Gemini returns
fact IDs only; Bullwise renders exact deterministic fact text. Requires
GEMINI_API_KEY. It does not authorize or connect AI to production.`;

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
	console.error(`Evaluating fact-selection ${GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE.model}...`);
	const candidate = await evaluateTransparentAnalysisAiSelectionV15({
		model: GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE.model,
		generate: (request) => provider.generateForEvaluation(request),
	});
	const report = {
		version: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROTOCOL.version,
		createdAt: new Date().toISOString(),
		scope: "frozen_development_fixtures_only",
		provider: "google",
		freeTierAssumed: true,
		interaction: "explicit_user_request",
		bullwiseTimeout: null,
		requestStartIntervalMs:
			TRANSPARENT_ANALYSIS_AI_SELECTION_V1_5_PROTOCOL.minimumStartIntervalMs,
		retryEnabled: false,
		productionIntegrationAuthorized: false,
		candidate,
	};
	const output = `${JSON.stringify(report, null, 2)}\n`;
	const outputPath = resolve(OUTPUT);
	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, output, { encoding: "utf8", flag: "wx", mode: 0o600 });
	console.log(`AI fact-selection evaluation: ${outputPath}`);
	console.log(`SHA-256: ${createHash("sha256").update(output).digest("hex")}`);
	console.log(
		`${candidate.model}: ${candidate.decision} | ${candidate.automatedPassed}/11 automated gates | ${candidate.observations.providerCompleted}/${candidate.generationFixtureCount} completed`,
	);
}

main().catch((error: unknown) => {
	if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
		console.error("The v1.5 fact-selection report already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
