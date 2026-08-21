import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_PROTOCOL } from "@/lib/analysis/cross-sectional-momentum-development";
import { writeMomentumDevelopmentReport } from "@/lib/analysis/cross-sectional-momentum-report";
import { runEtfCrossSectionalMomentumDevelopment } from "@/lib/analysis/cross-sectional-momentum-runner";
import { readFrozenMomentumDevelopmentSources } from "@/lib/analysis/cross-sectional-momentum-source";

const PROTOCOL = ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_PROTOCOL;
const USAGE = `Usage: npm run develop:etf-cross-sectional-momentum

Runs the frozen train-only ETF cross-sectional momentum experiment.

  base history:       ${PROTOCOL.sources.baseHistory.path}
  expansion history:  ${PROTOCOL.sources.expansionHistory.path}
  rejected strategy:  ${PROTOCOL.sources.rejectedSymmetricStrategy.path}
  output:             ${PROTOCOL.output.path}

This command accepts no overrides, emits aggregate results without selected symbols,
reads no validation/test data, and refuses to overwrite an existing report.`;

async function readRejectedSymmetricReport() {
	const raw = await readFile(resolve(PROTOCOL.sources.rejectedSymmetricStrategy.path), "utf8");
	const sha256 = createHash("sha256").update(raw).digest("hex");
	if (sha256 !== PROTOCOL.sources.rejectedSymmetricStrategy.sha256) {
		throw new Error("Rejected symmetric report checksum does not match");
	}
	return { value: JSON.parse(raw), sha256 };
}

async function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	if (process.argv.length > 2) {
		throw new Error("The frozen momentum development command accepts no overrides");
	}
	const [sources, rejected] = await Promise.all([
		readFrozenMomentumDevelopmentSources(),
		readRejectedSymmetricReport(),
	]);
	const report = runEtfCrossSectionalMomentumDevelopment({
		instruments: sources.instruments,
		benchmark: sources.benchmark,
		baseHistorySha256: sources.baseHistorySha256,
		expansionHistorySha256: sources.expansionHistorySha256,
		rejectedSymmetricReport: rejected.value,
		rejectedSymmetricReportSha256: rejected.sha256,
	});
	const output = await writeMomentumDevelopmentReport(
		resolve(PROTOCOL.output.path),
		report,
	);
	console.log(`Momentum development report: ${resolve(PROTOCOL.output.path)}`);
	console.log(`SHA-256: ${createHash("sha256").update(output).digest("hex")}`);
	console.log(
		`Decision: ${report.decision.status} | ${report.gates.filter((gate) => gate.passed).length}/${report.gates.length} gates`,
	);
	console.log(
		`${report.base.monthlyHoldingPeriods} months | ${report.base.annualizedReturnPercent}% CAGR | ${report.base.monthlySharpe ?? "undefined"} monthly Sharpe | ${report.base.maximumDrawdownPercent}% max drawdown`,
	);
	console.log("Validation/test features and labels read: false");
}

main().catch((error: unknown) => {
	if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
		console.error("The momentum development report already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
