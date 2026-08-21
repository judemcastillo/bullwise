import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DailySwingAnalysisDataset } from "@/lib/analysis/analysis-dataset.types";
import { diagnoseDailySwingTrainingData } from "@/lib/analysis/training-diagnostics";

const USAGE = `Usage: npm run diagnose:analysis-training -- [artifacts/analysis/analysis-dataset.json] [options]

Defaults:
  input:  artifacts/analysis/analysis-dataset.json
  output: artifacts/analysis/analysis-training-diagnostic.json

Options:
  --output=artifacts/analysis/analysis-training-diagnostic.json
  --force                                Replace an existing output file
  --help

Only train rows are inspected. Validation and test rows are counted by split;
their features and labels are not accessed.`;

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
			"artifacts/analysis/analysis-dataset.json",
	);
	const outputPath = resolve(
		option("output") ?? "artifacts/analysis/analysis-training-diagnostic.json",
	);
	const raw = await readFile(inputPath, "utf8");
	const report = diagnoseDailySwingTrainingData({
		dataset: JSON.parse(raw) as DailySwingAnalysisDataset,
		datasetSha256: createHash("sha256").update(raw).digest("hex"),
	});
	await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, {
		encoding: "utf8",
		flag: process.argv.includes("--force") ? "w" : "wx",
	});
	console.log(`Training diagnostic: ${outputPath}`);
	console.log(
		`${report.episodes.rows} train rows -> ${report.episodes.episodeCount} episode-first rows | ${report.episodes.reductionPercent}% reduction`,
	);
	console.log(
		`${report.episodes.multiRowEpisodes} repeated episodes | ${report.episodes.maximumRowsPerEpisode} maximum rows per episode`,
	);
	console.log(
		`Actionable success: ${report.targets.rowLevel.actionableSuccessRate} row-level -> ${report.targets.episodeFirst.actionableSuccessRate} episode-first`,
	);
	console.log(
		`Target design: ${report.targetDesign.version} | validation/test labels read: false`,
	);
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
