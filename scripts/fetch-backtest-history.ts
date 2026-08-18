import { access, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { MassiveBarsProvider } from "@/lib/market-data/providers/massive-bars-client";
import type { TechnicalAnalysisInstrument } from "@/lib/analysis/technical-analysis.types";
import type { MarketBars } from "@/lib/market-data/types";
import type { EquitySecurityType } from "@/types/instruments";

loadEnvConfig(process.cwd());

const USAGE = `Usage: npm run fetch:backtest-history -- [options]

Options:
  --symbol=AAPL                 Massive equity symbol (default: AAPL)
  --benchmark=SPY              Benchmark symbol; use "none" to omit it
  --from=2018-01-01            First requested date
  --to=YYYY-MM-DD              Last requested date (default: today)
  --security-type=common_stock common_stock or etf
  --output=history.json        Destination (default: history.json)
  --force                      Replace an existing destination file
  --help                       Show this help`;

function option(name: string) {
	const prefix = `--${name}=`;
	const inline = process.argv.find((argument) => argument.startsWith(prefix));
	if (inline) return inline.slice(prefix.length);
	const index = process.argv.indexOf(`--${name}`);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

function requireSymbol(value: string, label: string) {
	const normalized = value.trim().toUpperCase();
	if (!/^[A-Z][A-Z0-9.-]{0,14}$/.test(normalized)) {
		throw new Error(`${label} must be a valid Massive US-equity symbol`);
	}
	return normalized;
}

function dateArgument(value: string, label: string, endOfDay = false) {
	const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
	const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}${suffix}` : value);
	if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid date`);
	return date;
}

function serializeBars(data: MarketBars) {
	return {
		...data,
		from: data.from.toISOString(),
		to: data.to.toISOString(),
		bars: data.bars.map((bar) => ({
			...bar,
			startedAt: bar.startedAt.toISOString(),
		})),
	};
}

async function ensureWritableDestination(outputPath: string, force: boolean) {
	if (force) return;
	try {
		await access(outputPath);
	} catch (error: unknown) {
		if (
			error instanceof Error &&
			"code" in error &&
			(error as NodeJS.ErrnoException).code === "ENOENT"
		) {
			return;
		}
		throw error;
	}
	throw new Error(
		"The output file already exists; choose another path or pass --force.",
	);
}

async function fetchBars(
	provider: MassiveBarsProvider,
	symbol: string,
	instrumentId: string,
	from: Date,
	to: Date,
	pricePrecision: number,
) {
	return provider.getBars({
		instrumentId,
		assetClass: "equity",
		provider: "massive",
		providerSymbol: symbol,
		expectedCurrency: "USD",
		pricePrecision,
		interval: "1d",
		from,
		to,
		limit: 50_000,
	});
}

async function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	const apiKey = process.env.MASSIVE_API_KEY?.trim();
	if (!apiKey) throw new Error("MASSIVE_API_KEY is not configured");
	const symbol = requireSymbol(option("symbol") ?? "AAPL", "symbol");
	const benchmarkArgument = (option("benchmark") ?? "SPY").trim();
	const benchmarkSymbol =
		benchmarkArgument.toLowerCase() === "none"
			? null
			: requireSymbol(benchmarkArgument, "benchmark");
	const securityType = (option("security-type") ??
		"common_stock") as EquitySecurityType;
	if (securityType !== "common_stock" && securityType !== "etf") {
		throw new Error("security-type must be common_stock or etf");
	}
	const today = new Date().toISOString().slice(0, 10);
	const from = dateArgument(option("from") ?? "2018-01-01", "from");
	const to = dateArgument(option("to") ?? today, "to", true);
	if (from >= to) throw new Error("from must be before to");
	const outputPath = resolve(option("output") ?? "history.json");
	const force = process.argv.includes("--force");
	await ensureWritableDestination(outputPath, force);
	const instrumentId = `backtest:us-equity:${symbol.toLowerCase()}`;
	const instrument: TechnicalAnalysisInstrument = {
		instrumentId,
		displaySymbol: symbol,
		assetClass: "equity",
		securityType,
		...(securityType === "etf" ? { etfProfile: "standard" as const } : {}),
		currency: "USD",
		pricePrecision: 2,
	};
	const provider = new MassiveBarsProvider({ apiKey });
	console.error(`Fetching adjusted daily ${symbol} bars from Massive...`);
	const marketData = await fetchBars(
		provider,
		symbol,
		instrumentId,
		from,
		to,
		instrument.pricePrecision,
	);
	if (!marketData.adjusted) throw new Error("Massive did not mark the bars as adjusted");
	if (marketData.bars.length < 300) {
		throw new Error(
			`Massive returned ${marketData.bars.length} ${symbol} bars; at least 300 are required`,
		);
	}
	const firstMarketBar = marketData.bars[0].startedAt;
	if (firstMarketBar.getTime() - from.getTime() > 31 * 24 * 60 * 60 * 1_000) {
		console.error(
			`Warning: Massive returned history starting ${firstMarketBar.toISOString().slice(0, 10)}, not the requested ${from.toISOString().slice(0, 10)}. Your data entitlement may limit historical depth.`,
		);
	}

	let benchmarkData: MarketBars | undefined;
	if (benchmarkSymbol) {
		console.error(`Fetching adjusted daily ${benchmarkSymbol} benchmark bars...`);
		benchmarkData = await fetchBars(
			provider,
			benchmarkSymbol,
			`backtest:benchmark:${benchmarkSymbol.toLowerCase()}`,
			from,
			to,
			2,
		);
		if (!benchmarkData.adjusted) {
			throw new Error("Massive did not mark the benchmark bars as adjusted");
		}
	}

	const contents = `${JSON.stringify(
		{
			instrument,
			marketData: serializeBars(marketData),
			...(benchmarkData ? { benchmarkData: serializeBars(benchmarkData) } : {}),
			startAt: from.toISOString(),
			endAt: to.toISOString(),
		},
		null,
		2,
	)}\n`;
	await writeFile(outputPath, contents, {
		encoding: "utf8",
		flag: force ? "w" : "wx",
	});
	console.error(
		`Wrote ${marketData.bars.length} ${symbol} bars${
			benchmarkData ? ` and ${benchmarkData.bars.length} ${benchmarkSymbol} bars` : ""
		} to ${outputPath}`,
	);
}

main().catch((error: unknown) => {
	if (
		error instanceof Error &&
		"code" in error &&
		(error as NodeJS.ErrnoException).code === "EEXIST"
	) {
		console.error("The output file already exists; choose another path or pass --force.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
