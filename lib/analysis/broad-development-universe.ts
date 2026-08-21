import { FROZEN_CONFIRMATION_SYMBOLS } from "@/lib/analysis/analysis-dataset";
import type { MarketBars } from "@/lib/market-data/types";

export const BROAD_DEVELOPMENT_UNIVERSE_VERSION = "1.0.0";
export const BROAD_DEVELOPMENT_UNIVERSE_NAME =
	"daily-swing-broad-development-v1";

export const ORIGINAL_DEVELOPMENT_SYMBOLS = [
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

export const PREVIOUSLY_CONSUMED_RESEARCH_SYMBOLS = [
	...ORIGINAL_DEVELOPMENT_SYMBOLS,
	...FROZEN_CONFIRMATION_SYMBOLS,
] as const;

export const BROAD_DEVELOPMENT_CATEGORIES = [
	{
		name: "us_style",
		symbols: [
			"IVV",
			"VOO",
			"ITOT",
			"SCHB",
			"VV",
			"VUG",
			"VTV",
			"IWB",
			"IWF",
			"IWD",
			"VO",
			"VB",
			"VBK",
			"VBR",
			"VOE",
			"VOT",
			"IWC",
			"IWR",
			"IWP",
			"IWS",
			"IWO",
			"IWN",
			"VIG",
			"VYM",
		],
	},
	{
		name: "us_factor_and_income",
		symbols: [
			"DVY",
			"SDY",
			"HDV",
			"NOBL",
			"USMV",
			"MTUM",
			"QUAL",
			"VLUE",
			"DGRO",
			"SPLV",
			"SPHB",
			"PRF",
		],
	},
	{
		name: "international_regional",
		symbols: [
			"VXUS",
			"IEFA",
			"IEMG",
			"SCZ",
			"VSS",
			"EFV",
			"EFG",
			"IDV",
			"DEM",
			"DGS",
			"AAXJ",
			"CWI",
		],
	},
	{
		name: "international_country",
		symbols: [
			"EWG",
			"EWU",
			"EWC",
			"EWA",
			"EWH",
			"EWS",
			"EWT",
			"EWY",
			"EWW",
			"EZA",
			"INDA",
			"TUR",
			"THD",
			"EPOL",
			"ECH",
			"EIDO",
		],
	},
	{
		name: "fixed_income_and_preferred",
		symbols: [
			"AGG",
			"GOVT",
			"BSV",
			"BIV",
			"BLV",
			"VCSH",
			"VCIT",
			"JNK",
			"BKLN",
			"PFF",
			"MUB",
			"VTEB",
			"SPSB",
			"SPIB",
			"SPAB",
			"SPHY",
			"ANGL",
			"FLOT",
			"FLRN",
			"VCLT",
		],
	},
	{
		name: "industry_and_real_asset_equity",
		symbols: [
			"IYR",
			"IYT",
			"IBB",
			"IHI",
			"IHF",
			"KBE",
			"KIE",
			"XHB",
			"XME",
			"XOP",
			"XRT",
			"ITB",
			"IGV",
			"XSD",
			"XES",
			"SOXX",
		],
	},
] as const;

export const BROAD_DEVELOPMENT_SYMBOLS = BROAD_DEVELOPMENT_CATEGORIES.flatMap(
	(category) => [...category.symbols],
);

export const BROAD_DEVELOPMENT_DATA_POLICY = {
	provider: "alpaca",
	feed: "sip",
	adjustment: "all",
	interval: "1d",
	benchmarkSymbol: "SPY",
	requestedFrom: "2016-01-01",
	requestedThrough: "2026-08-18",
	maximumFirstBarDelayDays: 31,
	minimumBarsPerInstrument: 2_500,
	minimumCoverageEligibleInstruments: 50,
	targetTrainingEpisodes: 5_000,
} as const;

export const BROAD_DEVELOPMENT_LIQUIDITY_POLICY = {
	availability: "completed_signal_bar_only",
	windowSessions: 20,
	minimumObservedSessions: 19,
	minimumMedianDollarVolume: 10_000_000,
	maximumPositionFractionOfMedianDollarVolume: 0.01,
	dollarVolumeDefinition: "adjusted_close_times_reported_volume",
	missingDataPolicy: "ineligible",
	description:
		"At each signal, use only the latest 20 completed sessions. A setup is liquidity-eligible when at least 19 sessions have positive close and volume, median adjusted close times reported volume is at least $10 million, and planned position notional is no more than 1% of that median dollar volume.",
} as const;

export type BroadDevelopmentCoverageEvaluation = {
	eligible: boolean;
	reasons: Array<
		| "symbol_not_in_frozen_universe"
		| "insufficient_bars"
		| "first_bar_after_maximum_delay"
	>;
};

export type BroadDevelopmentCoverageSnapshot = {
	barsAvailable: number;
	firstBarAt: Date;
};

/** Applies only the outcome-blind coverage rules frozen in the v1 manifest. */
export function evaluateBroadDevelopmentCoverage(input: {
	symbol: string;
	marketData: Pick<MarketBars, "bars">;
	coverageSnapshot?: BroadDevelopmentCoverageSnapshot;
}): BroadDevelopmentCoverageEvaluation {
	const reasons: BroadDevelopmentCoverageEvaluation["reasons"] = [];
	const symbol = input.symbol.trim().toUpperCase();
	if (!(BROAD_DEVELOPMENT_SYMBOLS as readonly string[]).includes(symbol)) {
		reasons.push("symbol_not_in_frozen_universe");
	}
	const barsAvailable =
		input.coverageSnapshot?.barsAvailable ?? input.marketData.bars.length;
	if (barsAvailable < BROAD_DEVELOPMENT_DATA_POLICY.minimumBarsPerInstrument) {
		reasons.push("insufficient_bars");
	}
	const firstAt =
		input.coverageSnapshot?.firstBarAt.getTime() ??
		input.marketData.bars[0]?.startedAt.getTime();
	const latestAllowedFirstAt =
		Date.parse(`${BROAD_DEVELOPMENT_DATA_POLICY.requestedFrom}T00:00:00.000Z`) +
		BROAD_DEVELOPMENT_DATA_POLICY.maximumFirstBarDelayDays * 86_400_000;
	if (firstAt === undefined || firstAt > latestAllowedFirstAt) {
		reasons.push("first_bar_after_maximum_delay");
	}
	return { eligible: reasons.length === 0, reasons };
}
