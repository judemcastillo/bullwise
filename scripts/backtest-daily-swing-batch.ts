import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runDailySwingBatchDiagnosticBacktest } from "@/lib/analysis/batch-diagnostics";
import type { DiagnosticTradeGroup } from "@/lib/analysis/batch-diagnostics.types";
import type { BacktestConfiguration } from "@/lib/analysis/backtest.types";
import { analyzeDailySwingV2 } from "@/lib/analysis/daily-swing-v2";
import type { TechnicalAnalysisInstrument } from "@/lib/analysis/technical-analysis.types";
import { evaluateDailySwingV2Confirmation } from "@/lib/analysis/v2-confirmation";
import type { MarketBar, MarketBars } from "@/lib/market-data/types";

type SerializedMarketBar = Omit<MarketBar, "startedAt"> & { startedAt: string };
type SerializedMarketBars = Omit<MarketBars, "from" | "to" | "bars"> & {
	from: string;
	to: string;
	bars: SerializedMarketBar[];
};
type SerializedBatchInput = {
	schemaVersion: "1.0.0";
	universeName: string;
	requested: { from: string; to: string; benchmarkSymbol: string };
	benchmarkData: SerializedMarketBars;
	instruments: Array<{
		instrument: TechnicalAnalysisInstrument;
		marketData: SerializedMarketBars;
	}>;
	configuration?: Partial<BacktestConfiguration>;
};

const USAGE = `Usage: npm run backtest:daily-swing-batch -- [input.json] [options]

Defaults:
  input:  batch-history.json
  output: batch-report.json

Options:
  --output=batch-report.json
  --strategy=v1              v1 or v2 (default: v1)
  --help`;

function option(name: string) {
	const prefix = `--${name}=`;
	const inline = process.argv.find((argument) => argument.startsWith(prefix));
	if (inline) return inline.slice(prefix.length);
	const index = process.argv.indexOf(`--${name}`);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

function validDate(value: string, label: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid date`);
	return date;
}

function parseMarketBars(value: SerializedMarketBars, label: string): MarketBars {
	if (!value || typeof value !== "object" || !Array.isArray(value.bars)) {
		throw new Error(`${label} must be a MarketBars object with a bars array`);
	}
	return {
		...value,
		from: validDate(value.from, `${label}.from`),
		to: validDate(value.to, `${label}.to`),
		bars: value.bars.map((bar, index) => ({
			...bar,
			startedAt: validDate(bar.startedAt, `${label}.bars[${index}].startedAt`),
		})),
	};
}

function parseInput(raw: string) {
	const value = JSON.parse(raw) as SerializedBatchInput;
	if (
		!value ||
		typeof value !== "object" ||
		value.schemaVersion !== "1.0.0" ||
		!Array.isArray(value.instruments) ||
		value.instruments.length === 0
	) {
		throw new Error("Input must be a version 1.0.0 batch history bundle");
	}
	const benchmarkData = parseMarketBars(value.benchmarkData, "benchmarkData");
	const startAt = validDate(value.requested.from, "requested.from");
	const endAt = validDate(value.requested.to, "requested.to");
	return {
		universeName: value.universeName,
		instruments: value.instruments.map((item, index) => ({
			instrument: item.instrument,
			marketData: parseMarketBars(
				item.marketData,
				`instruments[${index}].marketData`,
			),
			benchmarkData,
			startAt,
			endAt,
			...(value.configuration ? { configuration: value.configuration } : {}),
		})),
	};
}

function metric(value: number | null, suffix = "") {
	return value === null ? "n/a" : `${value}${suffix}`;
}

function printGroups(title: string, groups: DiagnosticTradeGroup[]) {
	console.log(`\n${title}`);
	for (const group of groups.filter((item) => item.metrics.tradeCount > 0)) {
		console.log(
			`  ${group.label}: ${group.metrics.tradeCount} trades | ${metric(group.metrics.winRatePercent, "%")} wins | ${metric(group.metrics.averageRMultiple)} avg R | ${metric(group.metrics.profitFactor)} PF | ${metric(group.metrics.targetOneReachRatePercent, "%")} reached T1`,
		);
	}
}

async function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	const inputPath =
		process.argv.slice(2).find((argument) => !argument.startsWith("-")) ??
		"batch-history.json";
	const outputPath = resolve(option("output") ?? "batch-report.json");
	const strategy = (option("strategy") ?? "v1").toLowerCase();
	if (strategy !== "v1" && strategy !== "v2") {
		throw new Error("strategy must be v1 or v2");
	}
	const input = parseInput(await readFile(resolve(inputPath), "utf8"));
	const report = runDailySwingBatchDiagnosticBacktest(
		input,
		strategy === "v2" ? { analyze: analyzeDailySwingV2 } : {},
	);
	const confirmation =
		strategy === "v2" ? evaluateDailySwingV2Confirmation(report) : null;
	const outputReport = confirmation ? { ...report, confirmation } : report;
	await writeFile(outputPath, `${JSON.stringify(outputReport, null, 2)}\n`, "utf8");
	const aggregate = report.aggregate;
	console.log(`Batch report: ${outputPath}`);
	console.log(
		`${aggregate.instrumentsTested} ETFs | ${aggregate.totalTrades} trades | ${aggregate.pooledWinRatePercent ?? "n/a"}% win rate | ${aggregate.pooledAverageRMultiple ?? "n/a"} average R`,
	);
	console.log(
		`${aggregate.equalWeightAverageReturnPercent}% average strategy return | ${aggregate.equalWeightAverageBuyAndHoldReturnPercent ?? "n/a"}% average buy-and-hold | ${aggregate.equalWeightAverageExcessReturnPercent ?? "n/a"}% excess`,
	);
	console.log(
		`${aggregate.profitableInstrumentCount}/${aggregate.instrumentsTested} profitable | ${aggregate.beatBuyAndHoldCount}/${aggregate.instrumentsTested} beat buy-and-hold`,
	);
	console.log(
		`Profit factor ${aggregate.pooledProfitFactor ?? "n/a"} | best ${aggregate.bestInstrument?.displaySymbol ?? "n/a"} (${aggregate.bestInstrument?.totalReturnPercent ?? "n/a"}%) | worst ${aggregate.worstInstrument?.displaySymbol ?? "n/a"} (${aggregate.worstInstrument?.totalReturnPercent ?? "n/a"}%)`,
	);
	console.log(
		`Coverage: ${report.coverage.minimumBarsAvailable} minimum bars | ${report.coverage.instrumentsMeetingMinimum}/${aggregate.instrumentsTested} meet ${report.coverage.minimumRequiredBars}-bar minimum | research-ready ${report.coverage.researchReady ? "yes" : "no"}`,
	);
	printGroups("By setup type", report.diagnostics.bySetupType);
	printGroups("By trend regime", report.diagnostics.byTrendRegime);
	printGroups("By volatility regime", report.diagnostics.byVolatilityRegime);
	printGroups("By terminal exit", report.diagnostics.byExitReason);
	printGroups("By holding period", report.diagnostics.byHoldingPeriod);
	console.log("\nFriction sensitivity");
	for (const scenario of report.diagnostics.frictionSensitivity) {
		console.log(
			`  ${scenario.scenario} (${scenario.transactionCostBpsPerSide} bps cost, ${scenario.slippageBpsPerFill} bps slippage): ${scenario.equalWeightAverageReturnPercent}% return | ${metric(scenario.pooledAverageRMultiple)} avg R | ${metric(scenario.pooledProfitFactor)} PF`,
		);
	}
	for (const warning of report.warnings) console.warn(`Warning: ${warning}`);
	for (const warning of report.diagnostics.warnings) {
		console.warn(`Diagnostic warning: ${warning}`);
	}
	if (confirmation) {
		console.log(
			`\nFrozen v2 confirmation: ${confirmation.passed ? "PASS" : "FAIL"}`,
		);
		for (const criterion of confirmation.criteria) {
			console.log(
				`  ${criterion.passed ? "PASS" : "FAIL"} ${criterion.metric}: ${metric(criterion.actual)} ${criterion.operator} ${criterion.threshold}`,
			);
		}
	}
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
