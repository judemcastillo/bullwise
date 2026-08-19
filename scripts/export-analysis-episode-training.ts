import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DailySwingAnalysisDataset } from "@/lib/analysis/analysis-dataset.types";
import { buildDailySwingEpisodeTrainingDataset } from "@/lib/analysis/episode-dataset";

const USAGE = `Usage: npm run export:analysis-episode-training -- [analysis-dataset.json] [options]

Defaults:
  input:  analysis-dataset.json
  output: analysis-episode-training.json

Options:
  --output=analysis-episode-training.json
  --force                              Replace an existing output file
  --help

Only train features and labels are accessed. Validation and test remain sealed.`;

function option(name: string) {
	const prefix = `--${name}=`;
	const inline = process.argv.find((argument) => argument.startsWith(prefix));
	if (inline) return inline.slice(prefix.length);
	const index = process.argv.indexOf(`--${name}`);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	const inputPath = resolve(
		process.argv.slice(2).find((argument) => !argument.startsWith("-")) ??
			"analysis-dataset.json",
	);
	const outputPath = resolve(
		option("output") ?? "analysis-episode-training.json",
	);
	const raw = await readFile(inputPath, "utf8");
	const dataset = buildDailySwingEpisodeTrainingDataset({
		dataset: JSON.parse(raw) as DailySwingAnalysisDataset,
		datasetSha256: createHash("sha256").update(raw).digest("hex"),
	});
	await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, {
		encoding: "utf8",
		flag: process.argv.includes("--force") ? "w" : "wx",
	});
	console.log(`Episode training dataset: ${outputPath}`);
	console.log(
		`${dataset.splits.train.sourceRows} source rows -> ${dataset.splits.train.episodeRows} train episodes`,
	);
	console.log(
		`${dataset.trainingSummary.actionableSuccesses} actionable successes | ${dataset.trainingSummary.actionableSuccessRate} rate | ${dataset.trainingSummary.averageSetupUtilityR} average utility R`,
	);
	console.log("Validation/test features and labels read: false");
}

main().catch((error: unknown) => {
	if (
		error &&
		typeof error === "object" &&
		"code" in error &&
		error.code === "EEXIST"
	) {
		console.error("The output file already exists; choose another path or pass --force.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
