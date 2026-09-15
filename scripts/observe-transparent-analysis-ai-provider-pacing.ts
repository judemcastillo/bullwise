import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import {
	GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE,
	GoogleTransparentAnalysisAiProvider,
} from "@/lib/analysis/google-transparent-analysis-ai-provider";
import { evaluateTransparentAnalysisAiProviderPacing } from "@/lib/analysis/transparent-analysis-ai-provider-pacing";

const OUTPUT = "artifacts/analysis/transparent-analysis-ai-provider-pacing-v1.json";
const USAGE = `Usage: npm run observe:transparent-analysis-ai-provider-pacing

Runs the preregistered 20-request Gemini pacing observation with at least 6.1
seconds between request starts. It performs no retry or content evaluation,
retains no generated prose, and writes a non-overwriting operational report.
Requires GEMINI_API_KEY.`;

async function main() {
	const arguments_ = process.argv.slice(2);
	if (arguments_.length === 1 && arguments_[0] === "--help") {
		console.log(USAGE);
		return;
	}
	if (arguments_.length > 0) throw new Error("This observation accepts no overrides");

	loadEnvConfig(process.cwd());
	const apiKey = process.env.GEMINI_API_KEY?.trim();
	if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
	const provider = new GoogleTransparentAnalysisAiProvider({ apiKey });
	console.error(`Observing paced ${GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE.model} requests...`);
	const result = await evaluateTransparentAnalysisAiProviderPacing({
		model: GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE.model,
		generate: (request) => provider.generateForEvaluation(request),
	});
	const report = {
		version: "1.0.0",
		createdAt: new Date().toISOString(),
		scope: "frozen_synthetic_provider_pacing_only",
		provider: "google",
		generatedProseRetained: false,
		contentEvaluationPerformed: false,
		productionIntegrationAuthorized: false,
		result,
	};
	const output = `${JSON.stringify(report, null, 2)}\n`;
	const outputPath = resolve(OUTPUT);
	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, output, { encoding: "utf8", flag: "wx", mode: 0o600 });
	console.log(`AI provider pacing observation: ${outputPath}`);
	console.log(`SHA-256: ${createHash("sha256").update(output).digest("hex")}`);
	console.log(
		`${result.decision} | ${result.observation.completedCount}/${result.observation.requestCount} completed | ${result.observation.failureCounts.rate_limited} rate-limited`,
	);
}

main().catch((error: unknown) => {
	if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
		console.error("The provider pacing report already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
