import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DailySwingAnalysisDataset } from "@/lib/analysis/analysis-dataset.types";
import type { DailySwingEpisodeTrainingDataset } from "@/lib/analysis/episode-dataset.types";
import {
	DAILY_SWING_EPISODE_EXPERIMENT_FROZEN_SHA256,
	type DailySwingEpisodeExperimentPreregistration,
} from "@/lib/analysis/episode-experiment.types";
import { evaluateDailySwingEpisodeValidation } from "@/lib/analysis/episode-validation";

const CONFIRMATION = "--confirm-one-shot-validation";
const USAGE = `Usage: npm run evaluate:analysis-episode-validation -- ${CONFIRMATION} [options]

Defaults:
  source:          analysis-dataset.json
  training:        analysis-episode-training.json
  preregistration: analysis-episode-experiment-preregistration.json
  output:          analysis-episode-validation-report.json

Options:
  --source=analysis-dataset.json
  --training=analysis-episode-training.json
  --preregistration=analysis-episode-experiment-preregistration.json
  --output=analysis-episode-validation-report.json
  --help

WARNING: This command consumes the experiment's single authorized validation run.
It refuses to read any input without the explicit confirmation flag and refuses
artifacts whose SHA-256 checksums differ from the frozen preregistration.`;

function option(name: string) {
	const prefix = `--${name}=`;
	const inline = process.argv.find((argument) => argument.startsWith(prefix));
	if (inline) return inline.slice(prefix.length);
	const index = process.argv.indexOf(`--${name}`);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

function digest(raw: string) {
	return createHash("sha256").update(raw).digest("hex");
}

function requireFrozenChecksum(actual: string, expected: string, label: string) {
	if (actual !== expected) {
		throw new Error(
			`${label} checksum ${actual} does not match frozen checksum ${expected}`,
		);
	}
}

async function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	if (!process.argv.includes(CONFIRMATION)) {
		throw new Error(
			`Refusing to read validation data without ${CONFIRMATION}. Review the frozen preregistration first.`,
		);
	}
	const sourcePath = resolve(option("source") ?? "analysis-dataset.json");
	const trainingPath = resolve(
		option("training") ?? "analysis-episode-training.json",
	);
	const preregistrationPath = resolve(
		option("preregistration") ??
			"analysis-episode-experiment-preregistration.json",
	);
	const outputPath = resolve(
		option("output") ?? "analysis-episode-validation-report.json",
	);
	const [sourceRaw, trainingRaw, preregistrationRaw] = await Promise.all([
		readFile(sourcePath, "utf8"),
		readFile(trainingPath, "utf8"),
		readFile(preregistrationPath, "utf8"),
	]);
	const sourceSha256 = digest(sourceRaw);
	const trainingSha256 = digest(trainingRaw);
	const preregistrationSha256 = digest(preregistrationRaw);
	requireFrozenChecksum(
		sourceSha256,
		DAILY_SWING_EPISODE_EXPERIMENT_FROZEN_SHA256.sourceDataset,
		"Source dataset",
	);
	requireFrozenChecksum(
		trainingSha256,
		DAILY_SWING_EPISODE_EXPERIMENT_FROZEN_SHA256.trainingDataset,
		"Training dataset",
	);
	requireFrozenChecksum(
		preregistrationSha256,
		DAILY_SWING_EPISODE_EXPERIMENT_FROZEN_SHA256.preregistration,
		"Preregistration",
	);
	const report = evaluateDailySwingEpisodeValidation({
		sourceDataset: JSON.parse(sourceRaw) as DailySwingAnalysisDataset,
		sourceDatasetSha256: sourceSha256,
		trainingDataset: JSON.parse(trainingRaw) as DailySwingEpisodeTrainingDataset,
		trainingDatasetSha256: trainingSha256,
		preregistration: JSON.parse(
			preregistrationRaw,
		) as DailySwingEpisodeExperimentPreregistration,
		preregistrationSha256,
	});
	await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, {
		encoding: "utf8",
		flag: "wx",
	});
	console.log(`Episode validation report: ${outputPath}`);
	console.log(
		`${report.validation.allEpisodes.rows} validation episodes | ${report.validation.allEpisodes.actionableSuccessRate} actionable-success rate`,
	);
	console.log(
		`AUC ${report.validation.classification.model.rocAuc ?? "n/a"} | log-loss improvement ${report.validation.classification.logLossImprovement} | Brier improvement ${report.validation.classification.brierImprovement}`,
	);
	console.log(
		`${report.developmentGate.criteria.filter((criterion) => criterion.passed).length}/${report.developmentGate.criteria.length} gates passed | decision: ${report.developmentGate.decision}`,
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
		console.error("The output file already exists; do not rerun validation. Preserve and inspect the existing report.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
