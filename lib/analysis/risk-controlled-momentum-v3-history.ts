import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import {
	assertRiskControlledMomentumV2ManifestIntegrity,
	RISK_CONTROLLED_MOMENTUM_V2_EXCLUSION_SHA256,
	RISK_CONTROLLED_MOMENTUM_V2_MANIFEST_SHA256,
	RISK_CONTROLLED_MOMENTUM_V2_SLEEVES,
	RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS,
	RISK_CONTROLLED_MOMENTUM_V2_UNIVERSE_NAME,
} from "@/lib/analysis/risk-controlled-momentum-v2-universe";
import type { MarketBar, MarketBars } from "@/lib/market-data/types";

export const RISK_CONTROLLED_MOMENTUM_V3_HISTORY_VERSION = "1.0.0";
export const RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY = {
	provider: "tiingo",
	feed: "eod_composite",
	adjustment: "split_and_cash_dividend_adjusted_ohlcv",
	interval: "1d",
	benchmarkSymbol: "SPY",
	requestedFrom: "2007-01-01T00:00:00.000Z",
	requestedTo: "2015-12-31T23:59:59.999Z",
	outputPath:
		"artifacts/analysis/analysis-risk-controlled-momentum-v3-history.json",
	overwrite: false,
} as const;

function serializeBar(bar: MarketBar) {
	return { ...bar, startedAt: bar.startedAt.toISOString() };
}

function validateMarketData(input: { value: MarketBars; symbol: string }) {
	const { value, symbol } = input;
	if (
		value.provider !== RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY.provider ||
		value.providerSymbol !== symbol ||
		value.currency !== "USD" ||
		value.interval !== RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY.interval ||
		value.adjusted !== true ||
		value.timeliness !== "historical" ||
		value.from.toISOString() !== RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY.requestedFrom ||
		value.to.toISOString() !== RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY.requestedTo
	) {
		throw new Error(`${symbol} does not match the frozen Tiingo history provenance`);
	}
	if (value.bars.length === 0) throw new Error(`${symbol} returned no daily bars`);
	const lower = Date.parse(RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY.requestedFrom);
	const upper = Date.parse(RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY.requestedTo);
	let previous = Number.NEGATIVE_INFINITY;
	for (const [index, bar] of value.bars.entries()) {
		const at = bar.startedAt.getTime();
		if (!Number.isFinite(at) || at <= previous || at < lower || at > upper) {
			throw new Error(`${symbol}.bars[${index}] violates the frozen chronology`);
		}
		previous = at;
	}
}

function serializeMarketData(value: MarketBars, instrumentId: string) {
	return {
		...value,
		instrumentId,
		from: value.from.toISOString(),
		to: value.to.toISOString(),
		bars: value.bars.map(serializeBar),
	};
}

export function validateRiskControlledMomentumV3FetchArguments(
	arguments_: readonly string[],
) {
	assertRiskControlledMomentumV2ManifestIntegrity();
	const help =
		arguments_.length === 1 &&
		(arguments_[0] === "--help" || arguments_[0] === "-h");
	if (arguments_.length > 0 && !help) {
		throw new Error("The frozen v3 Tiingo history fetch accepts no overrides");
	}
	return { help };
}

export function buildRiskControlledMomentumV3HistoryArtifact(input: {
	marketDataBySymbol: ReadonlyMap<string, MarketBars>;
	createdAt: Date;
}) {
	assertRiskControlledMomentumV2ManifestIntegrity();
	if (Number.isNaN(input.createdAt.getTime())) throw new Error("createdAt must be valid");
	const expectedSymbols = [
		RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY.benchmarkSymbol,
		...RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS,
	];
	if (
		input.marketDataBySymbol.size !== expectedSymbols.length ||
		expectedSymbols.some((symbol) => !input.marketDataBySymbol.has(symbol))
	) {
		throw new Error("History input does not contain the exact frozen symbol inventory");
	}
	for (const symbol of expectedSymbols) {
		validateMarketData({ value: input.marketDataBySymbol.get(symbol)!, symbol });
	}
	const membership = new Map(
		RISK_CONTROLLED_MOMENTUM_V2_SLEEVES.flatMap((sleeve) =>
			sleeve.candidates.map((candidate) => [candidate.symbol, sleeve.sleeveId] as const),
		),
	);
	const benchmarkSymbol = RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY.benchmarkSymbol;
	return {
		schemaVersion: RISK_CONTROLLED_MOMENTUM_V3_HISTORY_VERSION,
		researchSourceId: "etf-risk-controlled-momentum-v3-tiingo-source-v1",
		universeName: RISK_CONTROLLED_MOMENTUM_V2_UNIVERSE_NAME,
		createdAt: input.createdAt.toISOString(),
		universeManifestSha256: RISK_CONTROLLED_MOMENTUM_V2_MANIFEST_SHA256,
		exclusionInventorySha256: RISK_CONTROLLED_MOMENTUM_V2_EXCLUSION_SHA256,
		requested: { ...RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY },
		benchmarkData: serializeMarketData(
			input.marketDataBySymbol.get(benchmarkSymbol)!,
			"backtest:benchmark:spy",
		),
		instruments: RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS.map((symbol) => ({
			instrument: {
				instrumentId: `backtest:us-etf:${symbol.toLowerCase()}`,
				displaySymbol: symbol,
				assetClass: "equity" as const,
				securityType: "etf" as const,
				etfProfile: "standard" as const,
				currency: "USD",
				pricePrecision: 2,
			},
			sleeveId: membership.get(symbol)!,
			marketData: serializeMarketData(
				input.marketDataBySymbol.get(symbol)!,
				`backtest:us-etf:${symbol.toLowerCase()}`,
			),
		})),
	};
}

export function serializeRiskControlledMomentumV3HistoryArtifact(
	artifact: ReturnType<typeof buildRiskControlledMomentumV3HistoryArtifact>,
) {
	return `${JSON.stringify(artifact, null, 2)}\n`;
}

export async function writeRiskControlledMomentumV3HistoryArtifact(input: {
	path: string;
	artifact: ReturnType<typeof buildRiskControlledMomentumV3HistoryArtifact>;
}) {
	const contents = serializeRiskControlledMomentumV3HistoryArtifact(input.artifact);
	await writeFile(input.path, contents, { encoding: "utf8", flag: "wx" });
	return {
		bytes: Buffer.byteLength(contents),
		sha256: createHash("sha256").update(contents).digest("hex"),
	};
}
