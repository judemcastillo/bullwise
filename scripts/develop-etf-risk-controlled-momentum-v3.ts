import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL } from "@/lib/analysis/risk-controlled-momentum-v3-development";
import { writeRiskControlledMomentumV3Report } from "@/lib/analysis/risk-controlled-momentum-v3-report";
import { runRiskControlledMomentumV3Development } from "@/lib/analysis/risk-controlled-momentum-v3-runner";
import { readRegisteredRiskControlledMomentumV3History } from "@/lib/analysis/risk-controlled-momentum-v3-source";

const PROTOCOL = RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL;
const USAGE = `Usage: npm run develop:etf-risk-controlled-momentum-v3

Runs the one frozen Tiingo-sourced risk-controlled momentum development experiment.

  history: ${PROTOCOL.sources.history.path}
  SHA-256: ${PROTOCOL.sources.history.sha256}
  output:  ${PROTOCOL.report.outputPath}

This command accepts no overrides, verifies the registered source before parsing,
emits aggregate results without selected symbols, reads no protected data, and
refuses to overwrite an existing report.`;

async function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	if (process.argv.length > 2) {
		throw new Error("The frozen v3 development command accepts no overrides");
	}
	const source = await readRegisteredRiskControlledMomentumV3History();
	const report = runRiskControlledMomentumV3Development({
		instruments: source.instruments,
		benchmark: source.benchmark,
		historySha256: source.historySha256,
	});
	const output = await writeRiskControlledMomentumV3Report(
		resolve(PROTOCOL.report.outputPath),
		report,
	);
	console.log(`Risk-controlled momentum v3 report: ${resolve(PROTOCOL.report.outputPath)}`);
	console.log(`SHA-256: ${createHash("sha256").update(output).digest("hex")}`);
	console.log(
		`Decision: ${report.decision.status} | ${report.gates.filter((gate) => gate.passed).length}/${report.gates.length} gates`,
	);
	console.log(
		`${report.base.monthlyHoldingPeriods} months | ${report.base.annualizedReturnPercent}% CAGR | ${report.base.monthlySharpe ?? "undefined"} monthly Sharpe | ${report.base.maximumDrawdownPercent}% max drawdown`,
	);
	console.log("Protected 2016-plus/validation/test features and labels read: false");
}

main().catch((error: unknown) => {
	if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
		console.error("The v3 development report already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
