import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runDailySwingCombinedBroadStrategyRedesign } from "@/lib/analysis/combined-broad-strategy-redesign-runner";
import { DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL } from "@/lib/analysis/combined-broad-strategy-redesign";
import { readDailySwingCombinedBroadTrainSource } from "@/lib/analysis/combined-broad-train-source";
import { readFrozenBatchBenchmark } from "@/lib/analysis/frozen-batch-benchmark-source";

const PROTOCOL = DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL;

const USAGE = `Usage: npm run develop:analysis-broad-strategy-redesign

Runs the frozen train-only SPY risk-filter development experiment.

  dataset:          ${PROTOCOL.sources.combinedDataset.path}
  base history:     ${PROTOCOL.sources.baseHistory.path}
  expansion history: ${PROTOCOL.sources.expansionHistory.path}
  rejected audit:   ${PROTOCOL.sources.rejectedStrategyAudit.path}
  output:           ${PROTOCOL.output.path}

This command does not fit a model, read validation/test features or labels, or overwrite output.
No source, benchmark, filter, strategy, gate, or output overrides are accepted.`;

async function readSmallFrozen(path: string, expectedSha256: string) {
	const raw = await readFile(resolve(path), "utf8");
	const sha256 = createHash("sha256").update(raw).digest("hex");
	if (sha256 !== expectedSha256) throw new Error(`${path} checksum does not match`);
	return { value: JSON.parse(raw), sha256 };
}

async function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	if (process.argv.length > 2) {
		throw new Error("The frozen strategy-development command accepts no overrides");
	}
	const [source, baseBenchmark, expansionBenchmark, rejectedAudit] =
		await Promise.all([
			readDailySwingCombinedBroadTrainSource({
				path: resolve(PROTOCOL.sources.combinedDataset.path),
				expectedSha256: PROTOCOL.sources.combinedDataset.sha256,
			}),
			readFrozenBatchBenchmark({
				path: resolve(PROTOCOL.sources.baseHistory.path),
				expectedSha256: PROTOCOL.sources.baseHistory.sha256,
				periodEndsBefore: PROTOCOL.dataAccess.periodEndsBefore,
			}),
			readFrozenBatchBenchmark({
				path: resolve(PROTOCOL.sources.expansionHistory.path),
				expectedSha256: PROTOCOL.sources.expansionHistory.sha256,
				periodEndsBefore: PROTOCOL.dataAccess.periodEndsBefore,
			}),
			readSmallFrozen(
				PROTOCOL.sources.rejectedStrategyAudit.path,
				PROTOCOL.sources.rejectedStrategyAudit.sha256,
			),
		]);
	const report = runDailySwingCombinedBroadStrategyRedesign({
		dataset: source.dataset,
		datasetSha256: source.sha256,
		baseBenchmark,
		baseHistorySha256: baseBenchmark.sha256,
		expansionBenchmark,
		expansionHistorySha256: expansionBenchmark.sha256,
		rejectedAudit: rejectedAudit.value,
		rejectedAuditSha256: rejectedAudit.sha256,
	});
	const output = `${JSON.stringify(report)}\n`;
	await writeFile(resolve(PROTOCOL.output.path), output, {
		encoding: "utf8",
		flag: "wx",
	});
	console.log(`Strategy redesign report: ${resolve(PROTOCOL.output.path)}`);
	console.log(`SHA-256: ${createHash("sha256").update(output).digest("hex")}`);
	console.log(
		`Decision: ${report.decision.status} | ${report.gates.filter((gate) => gate.passed).length}/${report.gates.length} gates`,
	);
	console.log(
		`${report.overall.rows} episodes | ${report.overall.averageSetupUtilityR}R average utility | ${report.overall.profitFactor ?? "unbounded"} profit factor`,
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
		console.error("The strategy redesign report already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
