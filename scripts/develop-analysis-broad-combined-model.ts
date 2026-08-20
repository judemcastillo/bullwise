import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DailySwingCombinedBroadFoldDataset } from "@/lib/analysis/combined-broad-fold-dataset.types";
import { DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_SHA256 } from "@/lib/analysis/combined-broad-fold-dataset.types";
import { runDailySwingCombinedBroadModelDevelopment } from "@/lib/analysis/combined-broad-model-runner";
import { writeLargeJsonObjectWithArray } from "@/lib/analysis/setup-scan-report";

const INPUT = "artifacts/analysis/analysis-broad-combined-fold-training-v1.json";
const OUTPUT = "artifacts/analysis/analysis-broad-combined-model-development-report-v1.json";

const USAGE = `Usage: npm run develop:analysis-broad-combined-model

Runs the frozen train-only walk-forward development protocol.

  input:  ${INPUT}
  output: ${OUTPUT}

This command reads train features and targets. It does not read validation or test data.
No source, output, model, gate, or overwrite overrides are accepted.`;

async function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	if (process.argv.length > 2) {
		throw new Error("The frozen model-development command accepts no overrides");
	}
	const raw = await readFile(resolve(INPUT), "utf8");
	const sha256 = createHash("sha256").update(raw).digest("hex");
	if (sha256 !== DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_SHA256) {
		throw new Error("Fold dataset checksum does not match the frozen protocol");
	}
	const report = runDailySwingCombinedBroadModelDevelopment({
		dataset: JSON.parse(raw) as DailySwingCombinedBroadFoldDataset,
		datasetSha256: sha256,
	});
	const output = `${JSON.stringify(report)}\n`;
	await writeLargeJsonObjectWithArray(
		resolve(OUTPUT),
		report as unknown as Record<string, unknown>,
		"candidates",
	);
	console.log(`Combined model development report: ${resolve(OUTPUT)}`);
	console.log(`SHA-256: ${createHash("sha256").update(output).digest("hex")}`);
	for (const candidate of report.candidates) {
		console.log(
			`${candidate.candidateId}: ${candidate.gates.filter((gate) => gate.passed).length}/${candidate.gates.length} gates | mean AUC ${candidate.actuals.mean_fold_roc_auc ?? "unavailable"} | ${candidate.passed ? "PASS" : "FAIL"}`,
		);
	}
	console.log(
		`Decision: ${report.decision.status}${report.decision.selectedCandidateId ? ` (${report.decision.selectedCandidateId})` : ""}`,
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
		console.error("The model-development report already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
