import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DailySwingAnalysisDataset } from "@/lib/analysis/analysis-dataset.types";
import { trainDailySwingBoostedModels } from "@/lib/analysis/boosted-model";

const USAGE = `Usage: npm run train:analysis-boosted -- [analysis-dataset.json] [options]

Defaults:
  input:  analysis-dataset.json
  output: analysis-boosted-report.json

Options:
  --output=analysis-boosted-report.json
  --force                             Replace an existing output file
  --help

Runs the fixed gradient-boosted decision-stump experiment. Train rows fit all
preprocessing, thresholds, and trees. Validation rows produce metrics. Test
features and labels remain sealed.`;

function option(name: string) {
	const prefix = `--${name}=`;
	const inline = process.argv.find((argument) => argument.startsWith(prefix));
	if (inline) return inline.slice(prefix.length);
	const index = process.argv.indexOf(`--${name}`);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

function metric(value: number | null) {
	return value === null ? "n/a" : String(value);
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
		option("output") ?? "analysis-boosted-report.json",
	);
	const raw = await readFile(inputPath, "utf8");
	const report = trainDailySwingBoostedModels({
		dataset: JSON.parse(raw) as DailySwingAnalysisDataset,
		datasetSha256: createHash("sha256").update(raw).digest("hex"),
	});
	await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, {
		encoding: "utf8",
		flag: process.argv.includes("--force") ? "w" : "wx",
	});
	console.log(`Boosted model report: ${outputPath}`);
	console.log(
		`Trigger: ${metric(report.validation.trigger.model.rocAuc)} AUC | ${report.validation.trigger.logLossImprovement} log-loss improvement`,
	);
	console.log(
		`Profitability: ${metric(report.validation.profitability.model.rocAuc)} AUC | ${report.validation.profitability.logLossImprovement} log-loss improvement`,
	);
	console.log(
		`Expected R: ${metric(report.validation.expectedR.model.rSquared)} R² | ${report.validation.expectedR.rootMeanSquaredErrorImprovement} RMSE improvement`,
	);
	console.log(
		`Development gate: ${report.developmentGate.passed ? "PASS" : "FAIL"}`,
	);
	for (const criterion of report.developmentGate.criteria) {
		console.log(
			`  ${criterion.passed ? "PASS" : "FAIL"} ${criterion.metric}: ${criterion.actual ?? "n/a"} >= ${criterion.threshold}`,
		);
	}
	console.log(
		`Test: ${report.testPolicy.status}; labels read: ${report.testPolicy.labelsRead}`,
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
