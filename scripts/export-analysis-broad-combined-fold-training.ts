import { resolve } from "node:path";
import { buildDailySwingCombinedBroadFoldDataset } from "@/lib/analysis/combined-broad-fold-dataset";
import { DAILY_SWING_COMBINED_BROAD_FOLD_SOURCE_SHA256 } from "@/lib/analysis/combined-broad-fold-dataset.types";
import { readDailySwingCombinedBroadTrainSource } from "@/lib/analysis/combined-broad-train-source";
import { writeLargeJsonObjectWithArray } from "@/lib/analysis/setup-scan-report";

const INPUT = "analysis-broad-combined-dataset-v3.json";
const OUTPUT = "analysis-broad-combined-fold-training-v1.json";

const USAGE = `Usage: npm run export:analysis-broad-combined-fold-training

Materializes independently selected train-only walk-forward episode partitions.

  input:  ${INPUT}
  output: ${OUTPUT}

No source, output, split, policy, or overwrite overrides are accepted.`;

async function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	if (process.argv.length > 2) {
		throw new Error("The frozen fold-training exporter accepts no overrides");
	}
	const source = await readDailySwingCombinedBroadTrainSource({
		path: resolve(INPUT),
		expectedSha256: DAILY_SWING_COMBINED_BROAD_FOLD_SOURCE_SHA256,
	});
	const dataset = buildDailySwingCombinedBroadFoldDataset({
		dataset: source.dataset,
		datasetSha256: source.sha256,
	});
	await writeLargeJsonObjectWithArray(
		resolve(OUTPUT),
		dataset as unknown as Record<string, unknown>,
		"rows",
	);
	console.log(`Combined fold-training dataset: ${resolve(OUTPUT)}`);
	for (const partition of dataset.partitions) {
		console.log(
			`${partition.partitionId}: ${partition.episodeRows}/${partition.sourceRows} episodes`,
		);
	}
	console.log("Validation/test features and labels deserialized: false");
}

main().catch((error: unknown) => {
	if (
		error &&
		typeof error === "object" &&
		"code" in error &&
		error.code === "EEXIST"
	) {
		console.error("The combined fold-training dataset already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
