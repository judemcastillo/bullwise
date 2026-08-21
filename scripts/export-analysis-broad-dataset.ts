import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildDailySwingBroadDataset } from "@/lib/analysis/broad-dataset";
import { writeLargeJsonObjectWithArray } from "@/lib/analysis/setup-scan-report";
import type { DailySwingSetupScanReport } from "@/lib/analysis/setup-scan.types";

const INPUT = "artifacts/analysis/analysis-broad-setup-scan.json";
const OUTPUT = "artifacts/analysis/analysis-broad-dataset-v2.json";

const USAGE = `Usage: npm run export:analysis-broad-dataset [-- --force]

Joins the frozen broad-development scan to objective features and applies the
preregistered fixed-calendar walk-forward split and resolution-purge policy.

  input:  ${INPUT}
  output: ${OUTPUT}

No source, output, split, exclusion, or feature overrides are accepted.`;

async function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	const allowed = new Set(["--force"]);
	const unsupported = process.argv.slice(2).filter((argument) => !allowed.has(argument));
	if (unsupported.length > 0) {
		throw new Error("The frozen broad dataset exporter accepts only --force");
	}
	const inputPath = resolve(INPUT);
	const outputPath = resolve(OUTPUT);
	const raw = await readFile(inputPath, "utf8");
	const sourceSha256 = createHash("sha256").update(raw).digest("hex");
	const dataset = buildDailySwingBroadDataset({
		report: JSON.parse(raw) as DailySwingSetupScanReport,
		setupScanSha256: sourceSha256,
	});
	await writeLargeJsonObjectWithArray(
		outputPath,
		dataset as unknown as Record<string, unknown>,
		"rows",
		{ force: process.argv.includes("--force") },
	);
	console.log(`Broad analysis dataset: ${outputPath}`);
	console.log(
		`${dataset.rows.length} rows | ${dataset.splits.train.rows} train | ${dataset.splits.validation.rows} validation | ${dataset.splits.test.rows} sealed test`,
	);
	console.log(
		`${dataset.eligibility.liquidityRejectedSetups} liquidity-rejected | ${dataset.splitPolicy.purgedFinalBoundaryRows} final-boundary purged`,
	);
	for (const fold of dataset.walkForwardFolds) {
		console.log(
			`${fold.foldId}: ${fold.fit.rows} fit rows | ${fold.evaluation.rows} evaluation rows | ${fold.purgedFitBoundaryRows + fold.purgedEvaluationBoundaryRows} boundary-purged`,
		);
	}
	console.log("No target rates, returns, model metrics, or test labels were summarized.");
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
