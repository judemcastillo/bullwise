import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildDailySwingCombinedBroadDataset } from "@/lib/analysis/combined-broad-dataset";
import { writeLargeJsonObjectWithArray } from "@/lib/analysis/setup-scan-report";
import type { DailySwingSetupScanReport } from "@/lib/analysis/setup-scan.types";

const BASE_INPUT = "artifacts/analysis/analysis-broad-setup-scan.json";
const EXPANSION_INPUT = "artifacts/analysis/analysis-broad-v2-expansion-setup-scan.json";
const OUTPUT = "artifacts/analysis/analysis-broad-combined-dataset-v3.json";

const USAGE = `Usage: npm run export:analysis-broad-combined-dataset

Joins the two frozen broad-development scans and applies the unchanged fixed-calendar
walk-forward split and resolution-purge policy.

  base input:      ${BASE_INPUT}
  expansion input: ${EXPANSION_INPUT}
  output:          ${OUTPUT}

No source, output, split, exclusion, feature, or overwrite overrides are accepted.`;

async function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	if (process.argv.length > 2) {
		throw new Error("The frozen combined broad dataset exporter accepts no overrides");
	}
	const [baseRaw, expansionRaw] = await Promise.all([
		readFile(resolve(BASE_INPUT), "utf8"),
		readFile(resolve(EXPANSION_INPUT), "utf8"),
	]);
	const dataset = buildDailySwingCombinedBroadDataset({
		baseReport: JSON.parse(baseRaw) as DailySwingSetupScanReport,
		baseSetupScanSha256: createHash("sha256").update(baseRaw).digest("hex"),
		expansionReport: JSON.parse(expansionRaw) as DailySwingSetupScanReport,
		expansionSetupScanSha256: createHash("sha256")
			.update(expansionRaw)
			.digest("hex"),
	});
	await writeLargeJsonObjectWithArray(
		resolve(OUTPUT),
		dataset as unknown as Record<string, unknown>,
		"rows",
	);
	console.log(`Combined broad dataset: ${resolve(OUTPUT)}`);
	console.log(
		`${dataset.rows.length} rows | ${dataset.splits.train.rows} train | ${dataset.splits.validation.rows} validation | ${dataset.splits.test.rows} sealed test`,
	);
	console.log(
		`${dataset.eligibility.liquidityRejectedSetups} liquidity-rejected | ${dataset.splitPolicy.purgedFinalBoundaryRows} final-boundary purged`,
	);
	for (const source of dataset.source.scans) {
		console.log(
			`${source.sourceScan}: ${source.instrumentsScanned}/${source.candidatesReceived} instruments scanned | ${source.coverageExcluded} coverage-excluded`,
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
		console.error("The combined dataset already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
