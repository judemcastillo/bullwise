import { resolve } from "node:path";
import { buildDailySwingCombinedBroadEpisodeDataset } from "@/lib/analysis/combined-broad-episode-dataset";
import { DAILY_SWING_COMBINED_BROAD_DATASET_SHA256 } from "@/lib/analysis/combined-broad-episode-dataset.types";
import { readDailySwingCombinedBroadTrainSource } from "@/lib/analysis/combined-broad-train-source";
import { writeLargeJsonObjectWithArray } from "@/lib/analysis/setup-scan-report";

const INPUT = "artifacts/analysis/analysis-broad-combined-dataset-v3.json";
const OUTPUT = "artifacts/analysis/analysis-broad-combined-episode-training.json";

const USAGE = `Usage: npm run export:analysis-broad-combined-episodes

Materializes episode-first train rows from the frozen combined broad v3 dataset.

  input:  ${INPUT}
  output: ${OUTPUT}

No source, output, target, split, episode-policy, or overwrite overrides are accepted.`;

async function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	if (process.argv.length > 2) {
		throw new Error("The frozen combined episode exporter accepts no overrides");
	}
	const source = await readDailySwingCombinedBroadTrainSource({
		path: resolve(INPUT),
		expectedSha256: DAILY_SWING_COMBINED_BROAD_DATASET_SHA256,
	});
	const dataset = buildDailySwingCombinedBroadEpisodeDataset({
		dataset: source.dataset,
		datasetSha256: source.sha256,
	});
	await writeLargeJsonObjectWithArray(
		resolve(OUTPUT),
		dataset as unknown as Record<string, unknown>,
		"rows",
	);
	console.log(`Combined broad episode training dataset: ${resolve(OUTPUT)}`);
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
	console.log("Validation/test features and labels deserialized: false");
	console.log("No target rates, utility aggregates, profitability, or model metrics were summarized.");
}

main().catch((error: unknown) => {
	if (
		error &&
		typeof error === "object" &&
		"code" in error &&
		error.code === "EEXIST"
	) {
		console.error("The combined episode dataset already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
