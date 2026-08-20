import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DailySwingBatchDiagnosticReport } from "@/lib/analysis/batch-diagnostics.types";
import { runDailySwingPortfolioBacktest } from "@/lib/analysis/portfolio-backtest";

const USAGE = `Usage: npm run backtest:daily-swing-portfolio -- [artifacts/backtests/batch-report.json] [options]

Defaults:
  input:  artifacts/backtests/alpaca-batch-report.json
  output: artifacts/backtests/portfolio-report.json

Options:
  --output=artifacts/backtests/portfolio-report.json
  --initial-equity=100000
  --risk-per-trade=1
  --maximum-open-positions=5
  --maximum-total-risk=5
  --maximum-gross-exposure=100
  --candidate-selection=symbol
  --help`;

function option(name: string) {
	const prefix = `--${name}=`;
	const inline = process.argv.find((argument) => argument.startsWith(prefix));
	if (inline) return inline.slice(prefix.length);
	const index = process.argv.indexOf(`--${name}`);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

function numericOption(name: string) {
	const value = option(name);
	if (value === undefined) return undefined;
	const number = Number(value);
	if (!Number.isFinite(number)) throw new Error(`${name} must be a finite number`);
	return number;
}

async function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	const inputPath =
		process.argv.slice(2).find((argument) => !argument.startsWith("-")) ??
		"artifacts/backtests/alpaca-batch-report.json";
	const outputPath = resolve(option("output") ?? "artifacts/backtests/portfolio-report.json");
	const source = JSON.parse(
		await readFile(resolve(inputPath), "utf8"),
	) as DailySwingBatchDiagnosticReport;
	if (!Array.isArray(source.reports) || source.reports.length === 0) {
		throw new Error("Input must be a batch report with instrument reports");
	}
	const candidateSelection = option("candidate-selection") ?? "symbol";
	if (
		candidateSelection !== "symbol" &&
		candidateSelection !== "v3_signal_quality"
	) {
		throw new Error(
			"candidate-selection must be symbol or v3_signal_quality",
		);
	}
	const report = runDailySwingPortfolioBacktest({
		universeName: source.universeName,
		reports: source.reports,
		configuration: {
			candidateSelectionPolicy: candidateSelection,
			...(numericOption("initial-equity") !== undefined
				? { initialEquity: numericOption("initial-equity") }
				: {}),
			...(numericOption("risk-per-trade") !== undefined
				? { riskPerTradePercent: numericOption("risk-per-trade") }
				: {}),
			...(numericOption("maximum-open-positions") !== undefined
				? { maximumOpenPositions: numericOption("maximum-open-positions") }
				: {}),
			...(numericOption("maximum-total-risk") !== undefined
				? { maximumTotalRiskPercent: numericOption("maximum-total-risk") }
				: {}),
			...(numericOption("maximum-gross-exposure") !== undefined
				? {
						maximumGrossExposurePercent: numericOption(
							"maximum-gross-exposure",
						),
					}
				: {}),
		},
	});
	await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
	console.log(`Portfolio report: ${outputPath}`);
	console.log(
		`${report.performance.tradeCount}/${report.candidateTrades} trades accepted | ${report.performance.totalReturnPercent}% return (${report.performance.annualizedReturnPercent ?? "n/a"}% annualized) | ${report.performance.maximumDrawdownPercent}% maximum drawdown`,
	);
	console.log(
		`${report.performance.averageRMultiple ?? "n/a"} average R | ${report.performance.profitFactor ?? "n/a"} profit factor | ${report.exposure.maximumConcurrentPositions} maximum concurrent positions | ${report.exposure.maximumGrossExposurePercent}% maximum gross exposure`,
	);
	console.log(
		`Rejected: ${report.rejections.maximumOpenPositions} position cap | ${report.rejections.maximumTotalRisk} risk cap | ${report.rejections.maximumGrossExposure} gross exposure cap`,
	);
	for (const warning of report.warnings) console.warn(`Warning: ${warning}`);
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
