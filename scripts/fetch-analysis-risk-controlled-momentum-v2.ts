import { resolve } from "node:path";
import env from "@next/env";
import {
	buildRiskControlledMomentumV2HistoryArtifact,
	RISK_CONTROLLED_MOMENTUM_V2_HISTORY_POLICY,
	validateRiskControlledMomentumV2FetchArguments,
	writeRiskControlledMomentumV2HistoryArtifact,
} from "@/lib/analysis/risk-controlled-momentum-v2-history";
import {
	RISK_CONTROLLED_MOMENTUM_V2_MANIFEST_SHA256,
	RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS,
	RISK_CONTROLLED_MOMENTUM_V2_UNIVERSE_NAME,
} from "@/lib/analysis/risk-controlled-momentum-v2-universe";
import { AlpacaBarsProvider } from "@/lib/market-data/providers/alpaca-bars-client";
import type { MarketBars } from "@/lib/market-data/types";

const POLICY = RISK_CONTROLLED_MOMENTUM_V2_HISTORY_POLICY;
const USAGE = `Usage: npm run fetch:analysis-risk-controlled-momentum-v2

Fetches the frozen metadata-only ${RISK_CONTROLLED_MOMENTUM_V2_UNIVERSE_NAME} history.

  manifest SHA-256: ${RISK_CONTROLLED_MOMENTUM_V2_MANIFEST_SHA256}
  candidates:       ${RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS.length}
  provider/feed:    ${POLICY.provider}/${POLICY.feed}
  adjustment:       ${POLICY.adjustment}
  requested range:  ${POLICY.requestedFrom} through ${POLICY.requestedTo}
  output:           ${POLICY.outputPath}

No overrides or overwrite flag are accepted.`;

async function main() {
	const arguments_ = process.argv.slice(2);
	const { help } = validateRiskControlledMomentumV2FetchArguments(arguments_);
	if (help) {
		console.log(USAGE);
		return;
	}
	env.loadEnvConfig(process.cwd());
	const apiKeyId =
		process.env.ALPACA_API_KEY_ID?.trim() ?? process.env.ALPACA_API_KEY?.trim();
	const apiSecretKey =
		process.env.ALPACA_API_SECRET_KEY?.trim() ??
		process.env.ALPACA_API_SECRET?.trim();
	if (!apiKeyId || !apiSecretKey) throw new Error("Alpaca credentials are not configured");
	const provider = new AlpacaBarsProvider({ apiKeyId, apiSecretKey });
	const symbols = [POLICY.benchmarkSymbol, ...RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS];
	const marketDataBySymbol = new Map<string, MarketBars>();
	for (const [index, symbol] of symbols.entries()) {
		console.error(`[${index + 1}/${symbols.length}] Fetching adjusted daily ${symbol} bars...`);
		marketDataBySymbol.set(
			symbol,
			await provider.getBars({
				instrumentId: `backtest:download:${symbol.toLowerCase()}`,
				assetClass: "equity",
				provider: POLICY.provider,
				providerSymbol: symbol,
				expectedCurrency: "USD",
				pricePrecision: 2,
				interval: POLICY.interval,
				from: new Date(POLICY.requestedFrom),
				to: new Date(POLICY.requestedTo),
				limit: 10_000,
			}),
		);
	}
	const artifact = buildRiskControlledMomentumV2HistoryArtifact({
		marketDataBySymbol,
		createdAt: new Date(),
	});
	const outputPath = resolve(POLICY.outputPath);
	const written = await writeRiskControlledMomentumV2HistoryArtifact({
		path: outputPath,
		artifact,
	});
	console.error(`Risk-controlled momentum v2 history: ${outputPath}`);
	console.error(`SHA-256: ${written.sha256}`);
	console.error(`Bytes: ${written.bytes}`);
}

main().catch((error: unknown) => {
	if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
		console.error("The frozen v2 history artifact already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
