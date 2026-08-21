import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
	auditProviderSeries,
	buildProviderAuditReport,
} from "@/lib/analysis/provider-audit";
import type { TechnicalAnalysisInstrument } from "@/lib/analysis/technical-analysis.types";
import type { MarketBar, MarketBars } from "@/lib/market-data/types";

type SerializedMarketBar = Omit<MarketBar, "startedAt"> & { startedAt: string };
type SerializedMarketBars = Omit<MarketBars, "from" | "to" | "bars"> & {
	from: string;
	to: string;
	bars: SerializedMarketBar[];
};
type BatchBundle = {
	instruments: Array<{
		instrument: TechnicalAnalysisInstrument;
		marketData: SerializedMarketBars;
	}>;
};

function parseMarketBars(value: SerializedMarketBars): MarketBars {
	return {
		...value,
		from: new Date(value.from),
		to: new Date(value.to),
		bars: value.bars.map((bar) => ({
			...bar,
			startedAt: new Date(bar.startedAt),
		})),
	};
}

async function readBundle(path: string) {
	const value = JSON.parse(await readFile(resolve(path), "utf8")) as BatchBundle;
	if (!value || !Array.isArray(value.instruments) || value.instruments.length === 0) {
		throw new Error(`${path} is not a batch history bundle`);
	}
	return value;
}

async function main() {
	const referencePath = process.argv[2] ?? "artifacts/backtests/batch-history.json";
	const candidatePath = process.argv[3] ?? "artifacts/backtests/alpaca-batch-history.json";
	const outputArgument = process.argv.find((argument) =>
		argument.startsWith("--output="),
	);
	const outputPath = resolve(
		outputArgument?.slice("--output=".length) ?? "artifacts/backtests/provider-audit.json",
	);
	const [reference, candidate] = await Promise.all([
		readBundle(referencePath),
		readBundle(candidatePath),
	]);
	const candidateBySymbol = new Map(
		candidate.instruments.map((item) => [item.instrument.displaySymbol, item]),
	);
	const audits = reference.instruments.map((referenceItem) => {
		const candidateItem = candidateBySymbol.get(
			referenceItem.instrument.displaySymbol,
		);
		if (!candidateItem) {
			throw new Error(
				`${referenceItem.instrument.displaySymbol} is missing from ${candidatePath}`,
			);
		}
		return auditProviderSeries(
			referenceItem.instrument.displaySymbol,
			parseMarketBars(referenceItem.marketData),
			parseMarketBars(candidateItem.marketData),
		);
	});
	const report = buildProviderAuditReport(
		reference.instruments[0].marketData.provider,
		candidate.instruments[0].marketData.provider,
		audits,
	);
	await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
	console.log(
		`Provider audit: ${report.instrumentsPassed}/${report.instrumentsAudited} instruments passed (${report.referenceProvider} vs ${report.candidateProvider})`,
	);
	for (const audit of report.instruments) {
		console.log(
			`${audit.passed ? "PASS" : "FAIL"} ${audit.displaySymbol}: ${audit.overlappingBars} bars | ${audit.dateCoveragePercent}% dates | ${audit.medianAbsoluteReturnDifferenceBps ?? "n/a"} bps median return diff | ${audit.percentile95AbsoluteReturnDifferenceBps ?? "n/a"} bps p95 | ${audit.medianAbsoluteVolumeDifferencePercent ?? "n/a"}% median volume diff`,
		);
		for (const finding of audit.findings) console.log(`  ${finding}`);
	}
	console.log(`Wrote audit report to ${outputPath}`);
	if (!report.passed) process.exitCode = 2;
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
