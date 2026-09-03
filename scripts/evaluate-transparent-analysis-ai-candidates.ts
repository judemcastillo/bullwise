import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import {
	OPENAI_TRANSPARENT_ANALYSIS_AI_CANDIDATES,
	OpenAiTransparentAnalysisAiProvider,
} from "@/lib/analysis/openai-transparent-analysis-ai-provider";
import { evaluateTransparentAnalysisAiCandidate } from "@/lib/analysis/transparent-analysis-ai-evaluation";

const OUTPUT = "artifacts/analysis/transparent-analysis-ai-development-evaluation-v1.json";
const USAGE = `Usage: npm run evaluate:transparent-analysis-ai-candidates

Runs the two frozen OpenAI candidates against the 32 development fixtures. This is
a local, paid development evaluation. It does not connect AI to the application.
Requires OPENAI_API_KEY. No overrides or overwrite flag are accepted.`;

async function main() {
	const arguments_ = process.argv.slice(2);
	if (arguments_.length === 1 && arguments_[0] === "--help") {
		console.log(USAGE);
		return;
	}
	if (arguments_.length > 0) throw new Error("This evaluation accepts no overrides");

	loadEnvConfig(process.cwd());
	const apiKey = process.env.OPENAI_API_KEY?.trim();
	if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

	const reports = [];
	for (const [index, candidate] of OPENAI_TRANSPARENT_ANALYSIS_AI_CANDIDATES.entries()) {
		console.error(`[${index + 1}/${OPENAI_TRANSPARENT_ANALYSIS_AI_CANDIDATES.length}] Evaluating ${candidate.model}...`);
		const provider = new OpenAiTransparentAnalysisAiProvider({ apiKey, candidate });
		reports.push(await evaluateTransparentAnalysisAiCandidate({
			model: candidate.model,
			generate: (request) => provider.generateForEvaluation(request),
		}));
	}

	const report = {
		version: "1.0.0",
		createdAt: new Date().toISOString(),
		scope: "frozen_development_fixtures_only",
		productionIntegrationAuthorized: false,
		candidates: reports,
	};
	const output = `${JSON.stringify(report, null, 2)}\n`;
	const outputPath = resolve(OUTPUT);
	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(outputPath, output, { encoding: "utf8", flag: "wx", mode: 0o600 });
	console.log(`AI candidate evaluation: ${outputPath}`);
	console.log(`SHA-256: ${createHash("sha256").update(output).digest("hex")}`);
	for (const candidate of reports) {
		console.log(`${candidate.model}: ${candidate.decision} | ${candidate.automatedPassed}/10 automated gates`);
	}
}

main().catch((error: unknown) => {
	if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
		console.error("The evaluation report already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
