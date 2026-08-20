import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DailySwingCombinedBroadFoldDataset } from "@/lib/analysis/combined-broad-fold-dataset.types";
import { runDailySwingCombinedBroadStrategyTargetAudit } from "@/lib/analysis/combined-broad-strategy-target-audit-runner";
import { DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL } from "@/lib/analysis/combined-broad-strategy-target-audit";

const PROTOCOL = DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL;

const USAGE = `Usage: npm run audit:analysis-broad-combined-strategy-target

Runs the frozen train-only strategy and target audit.

  fold dataset:      ${PROTOCOL.sources.foldDataset.path}
  diagnostic report: ${PROTOCOL.sources.trainDiagnosticReport.path}
  output:            ${PROTOCOL.output.path}

This command does not fit a model, read validation/test data, or overwrite output.
No source, strategy, cohort, gate, or output overrides are accepted.`;

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
		throw new Error("The frozen strategy-audit command accepts no overrides");
	}
	const datasetInput = await readFrozen(
		PROTOCOL.sources.foldDataset.path,
		PROTOCOL.sources.foldDataset.sha256,
	);
	const diagnosticInput = await readFrozen(
		PROTOCOL.sources.trainDiagnosticReport.path,
		PROTOCOL.sources.trainDiagnosticReport.sha256,
	);
	const report = runDailySwingCombinedBroadStrategyTargetAudit({
		dataset: JSON.parse(datasetInput.raw) as DailySwingCombinedBroadFoldDataset,
		datasetSha256: datasetInput.sha256,
		trainDiagnosticReport: JSON.parse(diagnosticInput.raw),
		trainDiagnosticReportSha256: diagnosticInput.sha256,
	});
	const output = `${JSON.stringify(report)}\n`;
	await writeFile(resolve(PROTOCOL.output.path), output, {
		encoding: "utf8",
		flag: "wx",
	});
	console.log(`Strategy and target audit: ${resolve(PROTOCOL.output.path)}`);
	console.log(`SHA-256: ${createHash("sha256").update(output).digest("hex")}`);
	console.log(
		`Decision: ${report.decision.status} | nominated: ${report.decision.nominatedCandidates.length}`,
	);
	console.log(
		`Overall utility: ${report.overall.averageSetupUtilityR}R | profit factor: ${report.overall.profitFactor ?? "unbounded"}`,
	);
	console.log(`Target compression flagged: ${report.targetCompression.flagged}`);
	console.log("Validation/test features and labels read: false");
}

main().catch((error: unknown) => {
	if (
		error &&
		typeof error === "object" &&
		"code" in error &&
		error.code === "EEXIST"
	) {
		console.error("The strategy-audit report already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
