import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildDailySwingAnalysisDataset } from "@/lib/analysis/analysis-dataset";
import type { DailySwingBatchBacktestReport } from "@/lib/analysis/batch-backtest.types";
import type { DailySwingSetupScanReport } from "@/lib/analysis/setup-scan.types";

const USAGE = `Usage: npm run export:analysis-dataset -- [source-report.json] [options]

Defaults:
  input:  analysis-setup-scan.json
  output: analysis-dataset.json

Options:
  --output=analysis-dataset.json
  --exclude=SYMBOL1,SYMBOL2   Add development exclusions
  --force                     Replace an existing output file
  --help

The frozen v2 and v3 confirmation symbols are always excluded.`;

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
			"analysis-setup-scan.json",
	);
	const outputPath = resolve(option("output") ?? "analysis-dataset.json");
	const additionalExcludedSymbols = (option("exclude") ?? "")
		.split(",")
		.map((symbol) => symbol.trim())
		.filter(Boolean);
	const report = JSON.parse(
		await readFile(inputPath, "utf8"),
	) as DailySwingBatchBacktestReport | DailySwingSetupScanReport;
	const dataset = buildDailySwingAnalysisDataset({
		report,
		additionalExcludedSymbols,
	});
	await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, {
		encoding: "utf8",
		flag: process.argv.includes("--force") ? "w" : "wx",
	});
	console.log(`Analysis dataset: ${outputPath}`);
	console.log(
		`${dataset.rows.length} rows | ${dataset.splits.train.rows} train | ${dataset.splits.validation.rows} validation | ${dataset.splits.test.rows} test`,
	);
	console.log(
		`${dataset.exclusions.excludedSetupRows} frozen/additional-symbol rows excluded | ${dataset.exclusions.purgedBoundaryRows} split-boundary rows purged`,
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
