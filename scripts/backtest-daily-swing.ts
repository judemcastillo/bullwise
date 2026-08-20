import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runDailySwingBacktest } from "@/lib/analysis/backtest";
import type {
	BacktestConfiguration,
	DailySwingBacktestInput,
} from "@/lib/analysis/backtest.types";
import type { TechnicalAnalysisInstrument } from "@/lib/analysis/technical-analysis.types";
import type { MarketBar, MarketBars } from "@/lib/market-data/types";

type SerializedMarketBar = Omit<MarketBar, "startedAt"> & { startedAt: string };
type SerializedMarketBars = Omit<MarketBars, "from" | "to" | "bars"> & {
	from: string;
	to: string;
	bars: SerializedMarketBar[];
};
type SerializedInput = {
	instrument: TechnicalAnalysisInstrument;
	marketData: SerializedMarketBars;
	benchmarkData?: SerializedMarketBars;
	startAt?: string;
	endAt?: string;
	configuration?: Partial<BacktestConfiguration>;
};

const USAGE = `Usage: npm run backtest:daily-swing -- <input.json> [--output=artifacts/backtests/report.json]

The JSON object must contain instrument and marketData. Dates in marketData.from,
marketData.to, every bar.startedAt, startAt, and endAt must be ISO-8601 strings.
An optional benchmarkData object uses the same MarketBars shape. Without
--output, the report is printed to stdout.`;

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
		bars: value.bars.map((item, index) => ({
			...item,
			startedAt: validDate(item.startedAt, `${label}.bars[${index}].startedAt`),
		})),
	};
}

function parseInput(raw: string): DailySwingBacktestInput {
	const value = JSON.parse(raw) as SerializedInput;
	if (!value || typeof value !== "object" || !value.instrument) {
		throw new Error("Input must be an object with an instrument");
	}
	return {
		instrument: value.instrument,
		marketData: parseMarketBars(value.marketData, "marketData"),
		...(value.benchmarkData
			? { benchmarkData: parseMarketBars(value.benchmarkData, "benchmarkData") }
			: {}),
		...(value.startAt ? { startAt: validDate(value.startAt, "startAt") } : {}),
		...(value.endAt ? { endAt: validDate(value.endAt, "endAt") } : {}),
		...(value.configuration ? { configuration: value.configuration } : {}),
	};
}

async function main() {
	const inputPath = process.argv.slice(2).find((argument) => !argument.startsWith("-"));
	if (!inputPath || process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	const input = parseInput(await readFile(resolve(inputPath), "utf8"));
	const report = runDailySwingBacktest(input);
	const output = `${JSON.stringify(report, null, 2)}\n`;
	const outputPath = option("output");
	if (outputPath) {
		await writeFile(resolve(outputPath), output, "utf8");
		console.error(`Wrote backtest report to ${resolve(outputPath)}`);
	} else {
		process.stdout.write(output);
	}
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
