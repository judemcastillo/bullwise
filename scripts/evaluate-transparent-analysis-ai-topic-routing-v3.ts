import { loadEnvConfig } from "@next/env";
import { runTransparentAnalysisAiTopicRoutingV3Command } from "@/lib/analysis/transparent-analysis-ai-topic-routing-v3-command";

async function main() {
	const args = process.argv.slice(2);
	const usesProvider = args[0] === "start" || args[0] === "continue";
	if (usesProvider) loadEnvConfig(process.cwd());
	await runTransparentAnalysisAiTopicRoutingV3Command(args, {
		apiKey: usesProvider ? process.env.GEMINI_API_KEY : undefined,
	});
}

main().catch((error: unknown) => {
	if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
		console.error("The requested durable run or final report already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
