import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import {
	GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE,
	GoogleTransparentAnalysisAiProvider,
} from "@/lib/analysis/google-transparent-analysis-ai-provider";
import { observeTransparentAnalysisAiLatency } from "@/lib/analysis/transparent-analysis-ai-latency-observation";

const OUTPUT = "artifacts/analysis/transparent-analysis-ai-latency-observation-v1.json";
const USAGE = `Usage: npm run observe:transparent-analysis-ai-latency

Measures the natural completion time of Gemini 3.5 Flash-Lite across the 20
frozen synthetic generation fixtures. No application timeout is applied, no
model output prose is retained, and AI is not connected to the application.
Requires GEMINI_API_KEY. No overrides or overwrite flag are accepted.`;

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
	console.error(`Observing ${GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE.model} without an application timeout...`);
	const observation = await observeTransparentAnalysisAiLatency({
		model: GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE.model,
		generate: (request) => provider.generateForEvaluation(request),
	});
	const report = {
		version: "1.0.0",
		createdAt: new Date().toISOString(),
		scope: "frozen_synthetic_generation_fixtures_only",
		provider: "google",
		productionIntegrationAuthorized: false,
		observation,
	};
	const output = `${JSON.stringify(report, null, 2)}\n`;
	const outputPath = resolve(OUTPUT);
	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, output, { encoding: "utf8", flag: "wx", mode: 0o600 });
	console.log(`AI latency observation: ${outputPath}`);
	console.log(`SHA-256: ${createHash("sha256").update(output).digest("hex")}`);
	console.log(`${observation.completedCount}/${observation.requestCount} completed | p50 ${observation.latencyMs.completedRequests.p50} ms | p95 ${observation.latencyMs.completedRequests.p95} ms | max ${observation.latencyMs.completedRequests.maximum} ms`);
}

main().catch((error: unknown) => {
	if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
		console.error("The latency observation report already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
