import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import {
	GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE,
	GoogleTransparentAnalysisAiProvider,
} from "@/lib/analysis/google-transparent-analysis-ai-provider";
import { observeTransparentAnalysisAiProviderReliability } from "@/lib/analysis/transparent-analysis-ai-provider-reliability";

const OUTPUT = "artifacts/analysis/transparent-analysis-ai-provider-reliability-v1.json";
const USAGE = `Usage: npm run observe:transparent-analysis-ai-provider-reliability

Runs the preregistered operational observation across 20 frozen synthetic
requests. It records only safe provider outcome categories, status numbers,
timings, and token usage. It retains no generated prose, applies no Bullwise
timeout or retry, and does not reevaluate v1.2. Requires GEMINI_API_KEY.`;

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
	console.error(`Observing ${GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE.model} provider reliability...`);
	const observation = await observeTransparentAnalysisAiProviderReliability({
		model: GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE.model,
		generate: (request) => provider.generateForEvaluation(request),
	});
	const report = {
		version: "1.0.0",
		createdAt: new Date().toISOString(),
		scope: "frozen_synthetic_provider_operations_only",
		provider: "google",
		generatedProseRetained: false,
		contentEvaluationPerformed: false,
		productionIntegrationAuthorized: false,
		observation,
	};
	const output = `${JSON.stringify(report, null, 2)}\n`;
	const outputPath = resolve(OUTPUT);
	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, output, { encoding: "utf8", flag: "wx", mode: 0o600 });
	console.log(`AI provider reliability observation: ${outputPath}`);
	console.log(`SHA-256: ${createHash("sha256").update(output).digest("hex")}`);
	console.log(
		`${observation.completedCount}/${observation.requestCount} provider-completed | ${observation.providerFailureCount} failed`,
	);
	console.log(`Failure categories: ${JSON.stringify(observation.failureCounts)}`);
}

main().catch((error: unknown) => {
	if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
		console.error("The provider reliability report already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
