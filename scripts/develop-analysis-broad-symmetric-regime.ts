import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
	BROAD_DEVELOPMENT_UNIVERSE_NAME,
} from "@/lib/analysis/broad-development-universe";
import {
	BROAD_DEVELOPMENT_V2_EXPANSION_NAME,
} from "@/lib/analysis/broad-development-v2-universe";
import { scanDailySwingSetupBatch } from "@/lib/analysis/setup-scan";
import type { DailySwingSetupResearchPolicy } from "@/lib/analysis/setup-scan.types";
import { readFrozenSymmetricTrainHistory } from "@/lib/analysis/symmetric-regime-history-source";
import {
	buildDailySwingSymmetricCandidateRows,
	runDailySwingSymmetricRegimeDevelopment,
} from "@/lib/analysis/symmetric-regime-strategy-runner";
import { DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_PROTOCOL } from "@/lib/analysis/symmetric-regime-strategy-development";

const PROTOCOL = DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_PROTOCOL;

const USAGE = `Usage: npm run develop:analysis-broad-symmetric-regime

Runs the frozen train-only symmetric long/short strategy experiment.

  base history:       ${PROTOCOL.sources.baseHistory.path}
  expansion history:  ${PROTOCOL.sources.expansionHistory.path}
  rejected filter:    ${PROTOCOL.sources.rejectedBenchmarkRiskFilter.path}
  output:             ${PROTOCOL.output.path}

This expensive command scans only signals before 2023, applies the frozen short-borrow
stress, emits aggregate cohorts, and refuses to overwrite its output. No overrides are accepted.`;

async function readRejectedDevelopment() {
	const path = resolve(PROTOCOL.sources.rejectedBenchmarkRiskFilter.path);
	const raw = await readFile(path, "utf8");
	const sha256 = createHash("sha256").update(raw).digest("hex");
	if (sha256 !== PROTOCOL.sources.rejectedBenchmarkRiskFilter.sha256) {
		throw new Error("Rejected benchmark development checksum does not match");
	}
	return { value: JSON.parse(raw), sha256 };
}

async function scanSource(input: {
	sourceScan: "base" | "expansion";
	path: string;
	expectedSha256: string;
	universeName: string;
	researchPolicy: Exclude<DailySwingSetupResearchPolicy, "none">;
}) {
	const source = await readFrozenSymmetricTrainHistory({
		path: resolve(input.path),
		expectedSha256: input.expectedSha256,
		expectedUniverseName: input.universeName,
		periodEndsBefore: PROTOCOL.dataAccess.periodEndsBefore,
	});
	console.log(
		`Scanning ${source.instruments.length} frozen ${input.sourceScan} candidates through the train boundary...`,
	);
	const report = scanDailySwingSetupBatch({
		universeName: source.universeName,
		instruments: source.instruments,
		researchPolicy: input.researchPolicy,
		sourceSha256: source.sha256,
		onInstrumentComplete: (_report, index, total) => {
			if ((index + 1) % 10 === 0 || index + 1 === total) {
				console.log(`[${index + 1}/${total}] ${input.sourceScan} candidates scanned`);
			}
		},
	});
	const built = buildDailySwingSymmetricCandidateRows({
		reports: report.reports,
		researchPolicy: input.researchPolicy,
		sourceScan: input.sourceScan,
	});
	console.log(
		`${input.sourceScan}: ${built.rows.length} complete train-only setups | ${built.liquidityRejected} liquidity-rejected | ${built.boundaryTruncatedRows} boundary-truncated`,
	);
	return { source, built };
}

async function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	if (process.argv.length > 2) {
		throw new Error("The frozen symmetric development command accepts no overrides");
	}
	const rejected = await readRejectedDevelopment();
	const base = await scanSource({
		sourceScan: "base",
		path: PROTOCOL.sources.baseHistory.path,
		expectedSha256: PROTOCOL.sources.baseHistory.sha256,
		universeName: BROAD_DEVELOPMENT_UNIVERSE_NAME,
		researchPolicy: "broad_development_v1",
	});
	const expansion = await scanSource({
		sourceScan: "expansion",
		path: PROTOCOL.sources.expansionHistory.path,
		expectedSha256: PROTOCOL.sources.expansionHistory.sha256,
		universeName: BROAD_DEVELOPMENT_V2_EXPANSION_NAME,
		researchPolicy: "broad_development_v2_expansion",
	});
	const report = runDailySwingSymmetricRegimeDevelopment({
		rows: [...base.built.rows, ...expansion.built.rows],
		baseHistorySha256: base.source.sha256,
		expansionHistorySha256: expansion.source.sha256,
		rejectedDevelopment: rejected.value,
		rejectedDevelopmentSha256: rejected.sha256,
		scanInventory: {
			base: {
				featureRecords: base.built.featureRecords,
				liquidityRejected: base.built.liquidityRejected,
				boundaryTruncatedRows: base.built.boundaryTruncatedRows,
			},
			expansion: {
				featureRecords: expansion.built.featureRecords,
				liquidityRejected: expansion.built.liquidityRejected,
				boundaryTruncatedRows: expansion.built.boundaryTruncatedRows,
			},
		},
	});
	const output = `${JSON.stringify(report)}\n`;
	await writeFile(resolve(PROTOCOL.output.path), output, {
		encoding: "utf8",
		flag: "wx",
	});
	console.log(`Symmetric regime report: ${resolve(PROTOCOL.output.path)}`);
	console.log(`SHA-256: ${createHash("sha256").update(output).digest("hex")}`);
	console.log(
		`Decision: ${report.decision.status} | ${report.gates.filter((gate) => gate.passed).length}/${report.gates.length} gates`,
	);
	console.log(
		`${report.overall.rows} episodes | ${report.overall.shortRows} short | ${report.overall.averageSetupUtilityR}R average utility | ${report.overall.profitFactor ?? "unbounded"} profit factor`,
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
		console.error("The symmetric regime report already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
