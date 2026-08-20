import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildDailySwingBroadEpisodeDataset } from "@/lib/analysis/broad-episode-dataset";
import type { DailySwingBroadDataset } from "@/lib/analysis/broad-dataset.types";
import { writeLargeJsonObjectWithArray } from "@/lib/analysis/setup-scan-report";

const INPUT = "artifacts/analysis/analysis-broad-dataset-v2.json";
const OUTPUT = "artifacts/analysis/analysis-broad-episode-training.json";

const USAGE = `Usage: npm run export:analysis-broad-episodes [-- --force]

Materializes episode-first train rows from the frozen broad v2 dataset.

  input:  ${INPUT}
  output: ${OUTPUT}

No source, output, target, split, or episode-policy overrides are accepted.`;

async function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	const allowed = new Set(["--force"]);
	if (process.argv.slice(2).some((argument) => !allowed.has(argument))) {
		throw new Error("The frozen broad episode exporter accepts only --force");
	}
	const raw = await readFile(resolve(INPUT), "utf8");
	const dataset = buildDailySwingBroadEpisodeDataset({
		dataset: JSON.parse(raw) as DailySwingBroadDataset,
		datasetSha256: createHash("sha256").update(raw).digest("hex"),
	});
	await writeLargeJsonObjectWithArray(
		resolve(OUTPUT),
		dataset as unknown as Record<string, unknown>,
		"rows",
		{ force: process.argv.includes("--force") },
	);
	console.log(`Broad episode training dataset: ${resolve(OUTPUT)}`);
	console.log(
		`${dataset.source.trainSourceRows} train source rows -> ${dataset.coverage.trainEpisodeRows} episode-first rows`,
	);
	console.log(
		`Coverage target ${dataset.coverage.targetTrainingEpisodes}: ${dataset.coverage.passes ? "PASS" : "FAIL"}`,
	);
	for (const fold of dataset.walkForwardInventory) {
		console.log(
			`${fold.foldId}: ${fold.fitEpisodeRows}/${fold.fitSourceRows} fit episodes | ${fold.evaluationEpisodeRows}/${fold.evaluationSourceRows} evaluation episodes`,
		);
	}
	console.log("Validation/test features and labels read: false");
	console.log("No target rates, utility aggregates, profitability, or model metrics were summarized.");
}

main().catch((error: unknown) => {
	if (
		error &&
		typeof error === "object" &&
		"code" in error &&
		error.code === "EEXIST"
	) {
		console.error("The output file already exists; pass --force only to replace it.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
