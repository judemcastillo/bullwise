import { access, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import type { TechnicalAnalysisInstrument } from "@/lib/analysis/technical-analysis.types";
import { AlpacaBarsProvider } from "@/lib/market-data/providers/alpaca-bars-client";
import { MassiveBarsProvider } from "@/lib/market-data/providers/massive-bars-client";
import type { BarsProvider, MarketBars } from "@/lib/market-data/types";

loadEnvConfig(process.cwd());

const DEFAULT_ETF_SYMBOLS = [
	"SPY",
	"QQQ",
	"IWM",
	"DIA",
	"XLB",
	"XLC",
	"XLE",
	"XLF",
	"XLI",
	"XLK",
	"XLP",
	"XLRE",
	"XLU",
	"XLV",
	"XLY",
] as const;
const DAY_MS = 24 * 60 * 60 * 1_000;
const MASSIVE_REQUEST_INTERVAL_MS = 13_000;
const MASSIVE_RATE_LIMIT_RETRY_MS = 15_000;
const MASSIVE_RATE_LIMIT_RETRIES = 5;
type ResearchProvider = "alpaca" | "massive";

const USAGE = `Usage: npm run fetch:backtest-batch -- [options]

Options:
  --provider=massive     massive or alpaca (default: massive)
  --symbols=SPY,QQQ,...  ETF symbols (default: broad-market and 11 sector ETFs)
  --benchmark=SPY       Benchmark symbol (default: SPY)
  --universe-name=NAME  Label stored in the history bundle
  --from=YYYY-MM-DD     Default: 2016-01-01 for Alpaca, 2018-01-01 for Massive
  --to=YYYY-MM-DD       Last requested date (default: yesterday)
  --output=FILE         Default: alpaca-batch-history.json or batch-history.json
  --force               Replace an existing destination file
  --help                Show this help`;

function option(name: string) {
	const prefix = `--${name}=`;
	const inline = process.argv.find((argument) => argument.startsWith(prefix));
	if (inline) return inline.slice(prefix.length);
	const index = process.argv.indexOf(`--${name}`);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

function requireSymbol(value: string, label: string) {
	const symbol = value.trim().toUpperCase();
	if (!/^[A-Z][A-Z0-9.-]{0,14}$/.test(symbol)) {
		throw new Error(`${label} contains an invalid US-equity symbol`);
	}
	return symbol;
}

function symbolsArgument(value: string | undefined) {
	const symbols = value
		? value.split(",").map((symbol) => requireSymbol(symbol, "symbols"))
		: [...DEFAULT_ETF_SYMBOLS];
	const unique = [...new Set(symbols)];
	if (unique.length === 0) throw new Error("At least one ETF symbol is required");
	return unique;
}

function dateArgument(value: string, label: string, endOfDay = false) {
	const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
	const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}${suffix}` : value);
	if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid date`);
	return date;
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

function instrument(symbol: string): TechnicalAnalysisInstrument {
	return {
		instrumentId: `backtest:us-etf:${symbol.toLowerCase()}`,
		displaySymbol: symbol,
		assetClass: "equity",
		securityType: "etf",
		etfProfile: "standard",
		currency: "USD",
		pricePrecision: 2,
	};
}

async function fetchBars(
	provider: BarsProvider,
	providerName: ResearchProvider,
	symbol: string,
	instrumentId: string,
	from: Date,
	to: Date,
) {
	const result = await provider.getBars({
		instrumentId,
		assetClass: "equity",
		provider: providerName,
		providerSymbol: symbol,
		expectedCurrency: "USD",
		pricePrecision: 2,
		interval: "1d",
		from,
		to,
		limit: providerName === "massive" ? 50_000 : 10_000,
	});
	if (!result.adjusted) throw new Error(`${symbol} bars were not marked adjusted`);
	if (result.bars.length < 300) {
		throw new Error(
			`${providerName} returned ${result.bars.length} ${symbol} bars; at least 300 are required`,
		);
	}
	return result;
}

function delay(milliseconds: number) {
	return new Promise<void>((resolveDelay) => {
		setTimeout(resolveDelay, milliseconds);
	});
}

async function fetchBarsWithRateLimitRetry(
	provider: BarsProvider,
	providerName: ResearchProvider,
	symbol: string,
	instrumentId: string,
	from: Date,
	to: Date,
) {
	for (let attempt = 0; attempt <= MASSIVE_RATE_LIMIT_RETRIES; attempt += 1) {
		try {
			return await fetchBars(
				provider,
				providerName,
				symbol,
				instrumentId,
				from,
				to,
			);
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			if (
				attempt >= MASSIVE_RATE_LIMIT_RETRIES ||
				!/maximum requests per minute|rate limit|too many requests/i.test(message)
			) {
				throw error;
			}
			console.error(
				`${providerName} rate limit reached; retrying ${symbol} in ${MASSIVE_RATE_LIMIT_RETRY_MS / 1_000} seconds...`,
			);
			await delay(MASSIVE_RATE_LIMIT_RETRY_MS);
		}
	}
	throw new Error(`${providerName} rate-limit retries were exhausted for ${symbol}`);
}

function providerFromEnvironment(providerName: ResearchProvider): BarsProvider {
	if (providerName === "massive") {
		const apiKey = process.env.MASSIVE_API_KEY?.trim();
		if (!apiKey) throw new Error("MASSIVE_API_KEY is not configured");
		return new MassiveBarsProvider({ apiKey });
	}
	const apiKeyId =
		process.env.ALPACA_API_KEY_ID?.trim() ??
		process.env.ALPACA_API_KEY?.trim();
	const apiSecretKey =
		process.env.ALPACA_API_SECRET_KEY?.trim() ??
		process.env.ALPACA_API_SECRET?.trim();
	if (!apiKeyId || !apiSecretKey) {
		throw new Error(
			"Alpaca credentials require ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY (ALPACA_API_KEY and ALPACA_API_SECRET are also supported)",
		);
	}
	return new AlpacaBarsProvider({ apiKeyId, apiSecretKey });
}

async function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	const providerName = (option("provider") ?? "massive").toLowerCase();
	if (providerName !== "massive" && providerName !== "alpaca") {
		throw new Error("provider must be massive or alpaca");
	}
	const symbols = symbolsArgument(option("symbols"));
	const benchmarkSymbol = requireSymbol(option("benchmark") ?? "SPY", "benchmark");
	const universeName =
		option("universe-name")?.trim() || "US broad-market and sector ETFs";
	const yesterday = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);
	const from = dateArgument(
		option("from") ?? (providerName === "alpaca" ? "2016-01-01" : "2018-01-01"),
		"from",
	);
	const to = dateArgument(option("to") ?? yesterday, "to", true);
	if (from >= to) throw new Error("from must be before to");
	const outputPath = resolve(
		option("output") ??
			(providerName === "alpaca"
				? "alpaca-batch-history.json"
				: "batch-history.json"),
	);
	const force = process.argv.includes("--force");
	await ensureWritableDestination(outputPath, force);

	const provider = providerFromEnvironment(providerName);
	const fetched = new Map<string, MarketBars>();
	const requestedSymbols = [...new Set([benchmarkSymbol, ...symbols])];
	for (const [index, symbol] of requestedSymbols.entries()) {
		if (providerName === "massive" && index > 0) {
			await delay(MASSIVE_REQUEST_INTERVAL_MS);
		}
		console.error(
			`[${index + 1}/${requestedSymbols.length}] Fetching adjusted daily ${symbol} bars...`,
		);
		fetched.set(
			symbol,
			await fetchBarsWithRateLimitRetry(
				provider,
				providerName,
				symbol,
				`backtest:download:${symbol.toLowerCase()}`,
				from,
				to,
			),
		);
	}
	const limitedSymbols = [...fetched].flatMap(([symbol, data]) => {
		const firstBar = data.bars[0].startedAt;
		return firstBar.getTime() - from.getTime() > 31 * DAY_MS
			? [`${symbol} (${firstBar.toISOString().slice(0, 10)})`]
			: [];
	});
	if (limitedSymbols.length > 0) {
		console.error(
			`Warning: requested ${providerName} history was truncated for ${limitedSymbols.join(", ")}.`,
		);
	}
	const benchmarkData = {
		...fetched.get(benchmarkSymbol)!,
		instrumentId: `backtest:benchmark:${benchmarkSymbol.toLowerCase()}`,
	};
	const contents = `${JSON.stringify(
		{
			schemaVersion: "1.0.0",
			universeName,
			createdAt: new Date().toISOString(),
			requested: {
				provider: providerName,
				from: from.toISOString(),
				to: to.toISOString(),
				benchmarkSymbol,
			},
			benchmarkData: serializeBars(benchmarkData),
			instruments: symbols.map((symbol) => ({
				instrument: instrument(symbol),
				marketData: serializeBars({
					...fetched.get(symbol)!,
					instrumentId: instrument(symbol).instrumentId,
				}),
			})),
		},
		null,
		2,
	)}\n`;
	await writeFile(outputPath, contents, {
		encoding: "utf8",
		flag: force ? "w" : "wx",
	});
	console.error(
		`Wrote ${symbols.length} ${providerName} ETF histories with ${benchmarkSymbol} benchmark data to ${outputPath}`,
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
