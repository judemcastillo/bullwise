import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DailySwingCombinedBroadFoldDataset } from "@/lib/analysis/combined-broad-fold-dataset.types";
import { runDailySwingCombinedBroadTrainDiagnostics } from "@/lib/analysis/combined-broad-train-diagnostic-runner";
import { DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL } from "@/lib/analysis/combined-broad-train-diagnostics";

const PROTOCOL = DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL;

const USAGE = `Usage: npm run diagnose:analysis-broad-combined-train

Runs the frozen post-rejection train-only diagnostic.

  fold dataset:       ${PROTOCOL.sources.foldDataset.path}
  development report: ${PROTOCOL.sources.rejectedDevelopmentReport.path}
  output:             ${PROTOCOL.output.path}

This command does not read validation or test data and never overwrites its output.
No source, model, threshold, or output overrides are accepted.`;

async function readFrozen(path: string, expectedSha256: string) {
	const raw = await readFile(resolve(path), "utf8");
	const sha256 = createHash("sha256").update(raw).digest("hex");
	if (sha256 !== expectedSha256) throw new Error(`${path} checksum does not match`);
	return { raw, sha256 };
}

async function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	if (process.argv.length > 2) {
		throw new Error("The frozen train-diagnostic command accepts no overrides");
	}
	const datasetInput = await readFrozen(
		PROTOCOL.sources.foldDataset.path,
		PROTOCOL.sources.foldDataset.sha256,
	);
	const developmentInput = await readFrozen(
		PROTOCOL.sources.rejectedDevelopmentReport.path,
		PROTOCOL.sources.rejectedDevelopmentReport.sha256,
	);
	const report = runDailySwingCombinedBroadTrainDiagnostics({
		dataset: JSON.parse(datasetInput.raw) as DailySwingCombinedBroadFoldDataset,
		datasetSha256: datasetInput.sha256,
		rejectedDevelopmentReport: JSON.parse(developmentInput.raw),
		rejectedDevelopmentReportSha256: developmentInput.sha256,
	});
	const output = `${JSON.stringify(report)}\n`;
	await writeFile(resolve(PROTOCOL.output.path), output, {
		encoding: "utf8",
		flag: "wx",
	});
	console.log(`Combined train diagnostic report: ${resolve(PROTOCOL.output.path)}`);
	console.log(`SHA-256: ${createHash("sha256").update(output).digest("hex")}`);
	console.log(
		`Decision: ${report.nextResearchDecision.status} | expected-utility protocol eligible: ${report.nextResearchDecision.eligibleToProposeExpectedUtilityProtocol}`,
	);
	console.log(
		`Flags: ${report.flags.filter((flag) => flag.flagged).length}/${report.flags.length}`,
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
		console.error("The train-diagnostic report already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
