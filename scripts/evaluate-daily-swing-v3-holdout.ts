import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DailySwingBatchDiagnosticReport } from "@/lib/analysis/batch-diagnostics.types";
import { runDailySwingPortfolioBacktest } from "@/lib/analysis/portfolio-backtest";
import { evaluateDailySwingV3Confirmation } from "@/lib/analysis/v3-confirmation";

async function main() {
	const inputPath = resolve(
		process.argv.slice(2).find((argument) => !argument.startsWith("-")) ??
			"artifacts/backtests/v3-holdout-source-report.json",
	);
	const outputArgument = process.argv.find((argument) =>
		argument.startsWith("--output="),
	);
	const outputPath = resolve(
		outputArgument?.slice("--output=".length) ?? "artifacts/backtests/v3-holdout-report.json",
	);
	const source = JSON.parse(
		await readFile(inputPath, "utf8"),
	) as DailySwingBatchDiagnosticReport;
	if (!Array.isArray(source.reports) || source.reports.length === 0) {
		throw new Error("Input must be a batch diagnostic report");
	}
	const baseline = runDailySwingPortfolioBacktest({
		universeName: source.universeName,
		reports: source.reports,
		configuration: { candidateSelectionPolicy: "symbol" },
	});
	const ranked = runDailySwingPortfolioBacktest({
		universeName: source.universeName,
		reports: source.reports,
		configuration: { candidateSelectionPolicy: "v3_signal_quality" },
	});
	const confirmation = evaluateDailySwingV3Confirmation({
		source,
		baseline,
		ranked,
	});
	const report = {
		schemaVersion: "1.0.0",
		generatedAt: new Date().toISOString(),
		source: {
			universeName: source.universeName,
			coverage: source.coverage,
			aggregate: source.aggregate,
		},
		baseline,
		ranked,
		confirmation,
	};
	await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
	console.log(`V3 holdout report: ${outputPath}`);
	console.log(
		`Frozen v3 confirmation: ${confirmation.passed ? "PASS" : "FAIL"}`,
	);
	console.log(
		`Baseline: ${baseline.performance.annualizedReturnPercent ?? "n/a"}% annualized | ${baseline.performance.averageRMultiple ?? "n/a"} average R | ${baseline.performance.profitFactor ?? "n/a"} PF | ${baseline.performance.maximumDrawdownPercent}% drawdown`,
	);
	console.log(
		`Ranked: ${ranked.performance.annualizedReturnPercent ?? "n/a"}% annualized | ${ranked.performance.averageRMultiple ?? "n/a"} average R | ${ranked.performance.profitFactor ?? "n/a"} PF | ${ranked.performance.maximumDrawdownPercent}% drawdown`,
	);
	for (const criterion of confirmation.criteria) {
		console.log(
			`  ${criterion.passed ? "PASS" : "FAIL"} ${criterion.metric}: ${criterion.actual ?? "n/a"} ${criterion.operator} ${criterion.threshold}`,
		);
	}
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
