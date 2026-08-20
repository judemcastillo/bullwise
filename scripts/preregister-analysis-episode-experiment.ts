import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DailySwingEpisodeTrainingDataset } from "@/lib/analysis/episode-dataset.types";
import { preregisterDailySwingEpisodeExperiment } from "@/lib/analysis/episode-experiment";

const USAGE = `Usage: npm run preregister:analysis-episode-experiment -- [artifacts/analysis/analysis-episode-training.json] [options]

Defaults:
  input:  artifacts/analysis/analysis-episode-training.json
  output: artifacts/analysis/analysis-episode-experiment-preregistration.json

Options:
  --output=artifacts/analysis/analysis-episode-experiment-preregistration.json
  --force                                              Replace an existing output file
  --help

This reads only the frozen training artifact. It does not open validation or test.`;

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
			"artifacts/analysis/analysis-episode-training.json",
	);
	const outputPath = resolve(
		option("output") ?? "artifacts/analysis/analysis-episode-experiment-preregistration.json",
	);
	const raw = await readFile(inputPath, "utf8");
	const report = preregisterDailySwingEpisodeExperiment({
		dataset: JSON.parse(raw) as DailySwingEpisodeTrainingDataset,
		datasetSha256: createHash("sha256").update(raw).digest("hex"),
	});
	await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, {
		encoding: "utf8",
		flag: process.argv.includes("--force") ? "w" : "wx",
	});
	console.log(`Episode experiment preregistration: ${outputPath}`);
	console.log(`${report.experimentId} | ${report.trainingDataset.rows} training episodes`);
	console.log(
		`${report.validationPolicy.criteria.length} frozen validation gates | tuning: false`,
	);
	console.log("Test features and labels read: false");
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
