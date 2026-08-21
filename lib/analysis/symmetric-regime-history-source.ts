import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { DEFAULT_BACKTEST_CONFIGURATION } from "@/lib/analysis/backtest";
import type {
	BacktestConfiguration,
} from "@/lib/analysis/backtest.types";
import type { TechnicalAnalysisInstrument } from "@/lib/analysis/technical-analysis.types";
import type { MarketBar, MarketBars } from "@/lib/market-data/types";

type SerializedMarketBar = Omit<MarketBar, "startedAt"> & { startedAt: string };
type SerializedMarketBars = Omit<MarketBars, "from" | "to" | "bars"> & {
	from: string;
	to: string;
	bars: SerializedMarketBar[];
};
type SerializedBatchHistory = {
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

function validDate(value: string, label: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid date`);
	return date;
}

function parseTrainMarketBars(
	value: SerializedMarketBars,
	label: string,
	boundary: number,
): {
	marketData: MarketBars;
	coverageSnapshot: { barsAvailable: number; firstBarAt: Date };
} {
	if (!value || typeof value !== "object" || !Array.isArray(value.bars)) {
		throw new Error(`${label} must be a MarketBars object with a bars array`);
	}
	const bars = value.bars.flatMap((bar, index): MarketBar[] => {
		const startedAt = validDate(bar.startedAt, `${label}.bars[${index}].startedAt`);
		return startedAt.getTime() < boundary ? [{ ...bar, startedAt }] : [];
	});
	if (bars.length === 0) throw new Error(`${label} has no bars before the train boundary`);
	for (let index = 1; index < bars.length; index += 1) {
		if (bars[index].startedAt <= bars[index - 1].startedAt) {
			throw new Error(`${label} bars must be unique and chronological`);
		}
	}
	return {
		marketData: {
			...value,
			from: bars[0].startedAt,
			to: bars.at(-1)!.startedAt,
			bars,
		},
		coverageSnapshot: {
			barsAvailable: value.bars.length,
			firstBarAt: validDate(value.bars[0].startedAt, `${label}.bars[0].startedAt`),
		},
	};
}

export async function readFrozenSymmetricTrainHistory(input: {
	path: string;
	expectedSha256: string;
	expectedUniverseName: string;
	periodEndsBefore: string;
}) {
	const expectedSha256 = input.expectedSha256.trim().toLowerCase();
	if (!/^[a-f0-9]{64}$/.test(expectedSha256)) {
		throw new Error("expectedSha256 must be a SHA-256 checksum");
	}
	const raw = await readFile(input.path, "utf8");
	const sha256 = createHash("sha256").update(raw).digest("hex");
	if (sha256 !== expectedSha256) {
		throw new Error("Batch history checksum does not match the frozen protocol");
	}
	const boundary = Date.parse(input.periodEndsBefore);
	if (!Number.isFinite(boundary)) throw new Error("periodEndsBefore must be valid");
	const value = JSON.parse(raw) as SerializedBatchHistory;
	if (
		!value ||
		typeof value !== "object" ||
		value.schemaVersion !== "1.0.0" ||
		value.universeName !== input.expectedUniverseName ||
		value.requested?.benchmarkSymbol !== "SPY" ||
		!Array.isArray(value.instruments) ||
		value.instruments.length === 0
	) {
		throw new Error("Batch history does not match the frozen symmetric source");
	}
	const benchmarkData = parseTrainMarketBars(
		value.benchmarkData,
		"benchmarkData",
		boundary,
	).marketData;
	const startAt = validDate(value.requested.from, "requested.from");
	const endAt = new Date(boundary - 1);
	const configuration = {
		...DEFAULT_BACKTEST_CONFIGURATION,
		allowShortSetups: true,
	} as const;
	const instruments = value.instruments.map((item, index) => {
		const parsed = parseTrainMarketBars(
			item.marketData,
			`instruments[${index}].marketData`,
			boundary,
		);
		return {
			instrument: item.instrument,
			marketData: parsed.marketData,
			coverageSnapshot: parsed.coverageSnapshot,
			benchmarkData,
			startAt,
			endAt,
			configuration,
		};
	});
	return {
		sha256,
		universeName: value.universeName,
		instruments,
		barsAtOrAfterBoundaryUsedForAnalysis: false as const,
		fullHistoryCoverageMetadataUsed: true as const,
		ignoredSourceConfiguration: value.configuration !== undefined,
	};
}
