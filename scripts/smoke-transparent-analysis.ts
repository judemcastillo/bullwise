import { loadEnvConfig } from "@next/env";
import { analyzeDailySwing } from "@/lib/analysis/technical-analysis";
import {
	classifyTransparentAnalysisOperationalFailure,
	transparentAnalysisHistoryQuery,
} from "@/lib/analysis/transparent-analysis-orchestrator";
import { buildAnalysisPanelResponse } from "@/lib/analysis/transparent-analysis-panel";
import {
	buildTransparentAnalysisSmokeFailure,
	buildTransparentAnalysisSmokeSummary,
	validateTransparentAnalysisSmokeArguments,
} from "@/lib/analysis/transparent-analysis-smoke";
import { MassiveBarsProvider } from "@/lib/market-data/providers/massive-bars-client";
import { resolveLatestCompletedUsEquitySession } from "@/lib/market-data/us-equity-session";

const USAGE = `Usage: npm run smoke:transparent-analysis

Runs one fixed live operational check of the AAPL daily-analysis path with SPY context.
It bypasses authentication and telemetry, writes no artifact, and prints no market values,
signals, credentials, URLs, or raw provider errors. No overrides are accepted.`;

async function main() {
	const { help } = validateTransparentAnalysisSmokeArguments(process.argv.slice(2));
	if (help) {
		console.log(USAGE);
		return;
	}

	loadEnvConfig(process.cwd());
	const apiKey = process.env.MASSIVE_API_KEY?.trim();
	if (!apiKey) throw new Error("MASSIVE_API_KEY is not configured");

	const analyzedAt = new Date();
	const completedSession = resolveLatestCompletedUsEquitySession(analyzedAt);
	if (completedSession.status === "unavailable") {
		console.log(
			JSON.stringify(
				buildTransparentAnalysisSmokeFailure("completed_session_unavailable"),
				null,
				2,
			),
		);
		process.exitCode = 1;
		return;
	}

	const query = transparentAnalysisHistoryQuery(completedSession.completedThrough);
	const provider = new MassiveBarsProvider({ apiKey });
	const [marketData, benchmarkData] = await Promise.all([
		provider.getBars({
			instrumentId: "smoke:target",
			assetClass: "equity",
			provider: "massive",
			providerSymbol: "AAPL",
			expectedCurrency: "USD",
			pricePrecision: 2,
			...query,
		}),
		provider.getBars({
			instrumentId: "smoke:benchmark",
			assetClass: "equity",
			provider: "massive",
			providerSymbol: "SPY",
			expectedCurrency: "USD",
			pricePrecision: 2,
			...query,
		}),
	]);

	const result = analyzeDailySwing({
		instrument: {
			instrumentId: "smoke:target",
			displaySymbol: "AAPL",
			assetClass: "equity",
			securityType: "common_stock",
			currency: "USD",
			pricePrecision: 2,
		},
		marketData,
		benchmarkData,
		completedThrough: completedSession.completedThrough,
		analyzedAt,
	});
	const response = buildAnalysisPanelResponse({
		canonicalKey: "equity:xnas:aapl",
		name: "Apple Inc.",
		result,
	});
	const summary = buildTransparentAnalysisSmokeSummary({
		completedThrough: completedSession.completedThrough,
		targetBars: marketData.bars.length,
		benchmarkBars: benchmarkData.bars.length,
		response,
	});
	console.log(JSON.stringify(summary, null, 2));
	if (summary.status === "fail") process.exitCode = 1;
}

main().catch((error: unknown) => {
	console.error(
		JSON.stringify(
			buildTransparentAnalysisSmokeFailure(
				classifyTransparentAnalysisOperationalFailure(error),
			),
			null,
			2,
		),
	);
	process.exitCode = 1;
});
