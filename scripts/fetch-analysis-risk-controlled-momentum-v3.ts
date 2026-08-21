import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import {
	buildRiskControlledMomentumV3HistoryArtifact,
	RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY,
	validateRiskControlledMomentumV3FetchArguments,
	writeRiskControlledMomentumV3HistoryArtifact,
} from "@/lib/analysis/risk-controlled-momentum-v3-history";
import {
	RISK_CONTROLLED_MOMENTUM_V2_MANIFEST_SHA256,
	RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS,
	RISK_CONTROLLED_MOMENTUM_V2_UNIVERSE_NAME,
} from "@/lib/analysis/risk-controlled-momentum-v2-universe";
import { TiingoEodProvider } from "@/lib/market-data/providers/tiingo-eod-client";
import type { MarketBars } from "@/lib/market-data/types";

const POLICY = RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY;
const USAGE = `Usage: npm run fetch:analysis-risk-controlled-momentum-v3

Fetches the frozen Tiingo EOD successor history for ${RISK_CONTROLLED_MOMENTUM_V2_UNIVERSE_NAME}.

  manifest SHA-256: ${RISK_CONTROLLED_MOMENTUM_V2_MANIFEST_SHA256}
  candidates:       ${RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS.length}
  provider/feed:    ${POLICY.provider}/${POLICY.feed}
  adjustment:       ${POLICY.adjustment}
  requested range:  ${POLICY.requestedFrom} through ${POLICY.requestedTo}
  output:           ${POLICY.outputPath}

Requires TIINGO_API_TOKEN. No overrides or overwrite flag are accepted.`;

async function main() {
	const arguments_ = process.argv.slice(2);
	const { help } = validateRiskControlledMomentumV3FetchArguments(arguments_);
	if (help) {
		console.log(USAGE);
		return;
	}
	loadEnvConfig(process.cwd());
	const apiToken = process.env.TIINGO_API_TOKEN?.trim();
	if (!apiToken) throw new Error("TIINGO_API_TOKEN is not configured");
	const provider = new TiingoEodProvider({ apiToken });
	const symbols = [POLICY.benchmarkSymbol, ...RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS];
	const marketDataBySymbol = new Map<string, MarketBars>();
	for (const [index, symbol] of symbols.entries()) {
		console.error(`[${index + 1}/${symbols.length}] Fetching adjusted daily ${symbol} bars...`);
		const marketData = await provider.getBars({
			instrumentId: `backtest:download:${symbol.toLowerCase()}`,
			assetClass: "equity",
			provider: POLICY.provider,
			providerSymbol: symbol,
			expectedCurrency: "USD",
			pricePrecision: 8,
			interval: POLICY.interval,
			from: new Date(POLICY.requestedFrom),
			to: new Date(POLICY.requestedTo),
		});
		if (marketData.bars.length === 0) throw new Error(`${symbol} returned no daily bars`);
		marketDataBySymbol.set(symbol, marketData);
	}
	const artifact = buildRiskControlledMomentumV3HistoryArtifact({
		marketDataBySymbol,
		createdAt: new Date(),
	});
	const outputPath = resolve(POLICY.outputPath);
	const written = await writeRiskControlledMomentumV3HistoryArtifact({
		path: outputPath,
		artifact,
	});
	console.error(`Risk-controlled momentum v3 history: ${outputPath}`);
	console.error(`SHA-256: ${written.sha256}`);
	console.error(`Bytes: ${written.bytes}`);
}

main().catch((error: unknown) => {
	if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
		console.error("The frozen v3 history artifact already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
