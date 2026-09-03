import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import {
	GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE,
	GoogleTransparentAnalysisAiProvider,
} from "@/lib/analysis/google-transparent-analysis-ai-provider";
import { evaluateTransparentAnalysisAiCandidate } from "@/lib/analysis/transparent-analysis-ai-evaluation";

const OUTPUT = "artifacts/analysis/transparent-analysis-ai-development-evaluation-v1.json";
const USAGE = `Usage: npm run evaluate:transparent-analysis-ai-candidate

Runs the frozen Gemini 3.5 Flash candidate against the 32 development
fixtures using the Gemini API free tier. It does not connect AI to the application.
Requires GEMINI_API_KEY. No overrides or overwrite flag are accepted.`;

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
	console.error(`Evaluating ${GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE.model}...`);
	const candidate = await evaluateTransparentAnalysisAiCandidate({
		model: GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE.model,
		generate: (request) => provider.generateForEvaluation(request),
	});
	const report = {
		version: "1.0.0",
		createdAt: new Date().toISOString(),
		scope: "frozen_development_fixtures_only",
		provider: "google",
		freeTierAssumed: true,
		productionIntegrationAuthorized: false,
		candidate,
	};
	const output = `${JSON.stringify(report, null, 2)}\n`;
	const outputPath = resolve(OUTPUT);
	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, output, { encoding: "utf8", flag: "wx", mode: 0o600 });
	console.log(`AI candidate evaluation: ${outputPath}`);
	console.log(`SHA-256: ${createHash("sha256").update(output).digest("hex")}`);
	console.log(`${candidate.model}: ${candidate.decision} | ${candidate.automatedPassed}/10 automated gates`);
}

main().catch((error: unknown) => {
	if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
		console.error("The evaluation report already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
