import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import {
	evaluateTransparentAnalysisAiSelectionAcceptanceV1,
	TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_VERSION,
} from "@/lib/analysis/transparent-analysis-ai-selection-acceptance-v1";
import { TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_FIXTURES_SHA256 } from "@/lib/analysis/transparent-analysis-ai-selection-acceptance-v1-fixtures";
import { TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROTOCOL } from "@/lib/analysis/transparent-analysis-ai-selection-v1-6";
import {
	GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE,
	GoogleTransparentAnalysisAiProvider,
} from "@/lib/analysis/google-transparent-analysis-ai-provider";

const OUTPUT = "artifacts/analysis/transparent-analysis-ai-selection-acceptance-v1.json";
const USAGE = `Usage: npm run accept:transparent-analysis-ai-selection-v1-6

Runs the preregistered one-shot v1.6 acceptance evaluation against 20 new
synthetic generation fixtures. It uses the frozen v1.6 model, prompt, contract,
renderer, 6.1-second pacing, no Bullwise timeout, and no retries. Requires
GEMINI_API_KEY. It does not connect AI to the application or production.`;

async function main() {
	const arguments_ = process.argv.slice(2);
	if (arguments_.length === 1 && arguments_[0] === "--help") {
		console.log(USAGE);
		return;
	}
	if (arguments_.length > 0) throw new Error("This acceptance evaluation accepts no overrides");

	loadEnvConfig(process.cwd());
	const apiKey = process.env.GEMINI_API_KEY?.trim();
	if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
	const provider = new GoogleTransparentAnalysisAiProvider({ apiKey });
	console.error(`Evaluating v1.6 acceptance with ${GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE.model}...`);
	const candidate = await evaluateTransparentAnalysisAiSelectionAcceptanceV1({
		model: GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE.model,
		generate: (request) => provider.generateForEvaluation(request),
	});
	const report = {
		version: TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_VERSION,
		createdAt: new Date().toISOString(),
		scope: "sealed_synthetic_acceptance_fixtures_only",
		candidateVersion: TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROTOCOL.version,
		fixtureSha256: TRANSPARENT_ANALYSIS_AI_SELECTION_ACCEPTANCE_V1_FIXTURES_SHA256,
		provider: "google",
		freeTierAssumed: true,
		interaction: "explicit_user_request",
		bullwiseTimeout: null,
		requestStartIntervalMs:
			TRANSPARENT_ANALYSIS_AI_SELECTION_V1_6_PROTOCOL.minimumStartIntervalMs,
		retryEnabled: false,
		productionIntegrationAuthorized: false,
		candidate,
	};
	const output = `${JSON.stringify(report, null, 2)}\n`;
	const outputPath = resolve(OUTPUT);
	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, output, { encoding: "utf8", flag: "wx", mode: 0o600 });
	console.log(`AI acceptance evaluation: ${outputPath}`);
	console.log(`SHA-256: ${createHash("sha256").update(output).digest("hex")}`);
	console.log(
		`${candidate.model}: ${candidate.decision} | ${candidate.automatedPassed}/11 automated gates | ${candidate.observations.providerCompleted}/${candidate.generationFixtureCount} completed`,
	);
}

main().catch((error: unknown) => {
	if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
		console.error("The v1.6 acceptance report already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
