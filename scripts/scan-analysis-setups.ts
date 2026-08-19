import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { BacktestConfiguration } from "@/lib/analysis/backtest.types";
import { analyzeDailySwingV2 } from "@/lib/analysis/daily-swing-v2";
import { scanDailySwingSetupBatch } from "@/lib/analysis/setup-scan";
import type { DailySwingSetupResearchPolicy } from "@/lib/analysis/setup-scan.types";
import type { TechnicalAnalysisInstrument } from "@/lib/analysis/technical-analysis.types";
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

const USAGE = `Usage: npm run scan:analysis-setups -- [batch-history.json] [options]

Defaults:
  input:  alpaca-batch-history.json
  output: analysis-setup-scan.json

Options:
  --output=analysis-setup-scan.json
  --strategy=v1                 v1 or v2 (default: v1)
  --research-policy=none        none or broad_development_v1 (default: none)
  --force                       Replace an existing output file
  --help

Every eligible completed bar is analyzed, including bars occurring while another
setup or trade for the same instrument would still be active.`;

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

async function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	const inputPath = resolve(
		process.argv.slice(2).find((argument) => !argument.startsWith("-")) ??
			"alpaca-batch-history.json",
	);
	const outputPath = resolve(option("output") ?? "analysis-setup-scan.json");
	const strategy = (option("strategy") ?? "v1").toLowerCase();
	if (strategy !== "v1" && strategy !== "v2") {
		throw new Error("strategy must be v1 or v2");
	}
	const researchPolicy = (option("research-policy") ??
		"none") as DailySwingSetupResearchPolicy;
	if (
		researchPolicy !== "none" &&
		researchPolicy !== "broad_development_v1"
	) {
		throw new Error(
			"research-policy must be none or broad_development_v1",
		);
	}
	const input = parseInput(await readFile(inputPath, "utf8"));
	console.log(
		`Scanning ${input.instruments.length} candidates with ${strategy} and ${researchPolicy} research policy; no network access is required.`,
	);
	const report = scanDailySwingSetupBatch({
		...input,
		researchPolicy,
		...(strategy === "v2" ? { dependencies: { analyze: analyzeDailySwingV2 } } : {}),
		onInstrumentComplete: (instrumentReport, index, total) => {
			const setups =
				instrumentReport.signalCounts.longSetups +
				instrumentReport.signalCounts.shortSetups;
			console.log(
				`[${index + 1}/${total}] ${instrumentReport.instrument.displaySymbol}: ${instrumentReport.signalCounts.analyses} analyses | ${setups} setups | ${instrumentReport.signalCounts.triggered} triggered`,
			);
		},
	});
	await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, {
		encoding: "utf8",
		flag: process.argv.includes("--force") ? "w" : "wx",
	});
	console.log(`Setup scan: ${outputPath}`);
	console.log(
		`${report.aggregate.analyses} analyses | ${report.aggregate.setups} setups | ${report.aggregate.liquidityRejected} liquidity-rejected | ${report.aggregate.triggered} triggered | ${report.aggregate.untriggered} untriggered`,
	);
}

main().catch((error: unknown) => {
	if (
		error &&
		typeof error === "object" &&
		"code" in error &&
		error.code === "EEXIST"
	) {
		console.error("The output file already exists; choose another path or pass --force.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
